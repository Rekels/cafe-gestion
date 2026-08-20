'use server'

import dbPromise from '@/lib/db'
import { revalidatePath } from 'next/cache'

// ═══════════════════════════════════════════════════════════
// STOCK MANAGEMENT
// ═══════════════════════════════════════════════════════════

function mapEstadoCafeToColumn(estado: string): string {
  const clean = estado.toUpperCase().trim();
  if (clean === 'PERGAMINO' || clean === 'STOCK_PERGAMINO') return 'stock_pergamino';
  if (clean === 'ORO_VERDE_BRUTO' || clean === 'STOCK_ORO_VERDE_BRUTO') return 'stock_oro_verde_bruto';
  if (clean === 'ORO_VERDE_SELECCIONADO' || clean === 'STOCK_ORO_VERDE_SELECCIONADO' || clean === 'ORO VERDE SEL.') return 'stock_oro_verde_seleccionado';
  if (clean === 'TOSTADO' || clean === 'STOCK_TOSTADO') return 'stock_tostado';
  if (clean === 'DESCARTE' || clean === 'STOCK_DESCARTE') return 'stock_descarte';
  return 'stock_oro_verde_bruto';
}

export async function registrarMovimientoStock(
  lote_id: number,
  tipo: 'INGRESO' | 'SALIDA' | 'AJUSTE' | 'MERMA',
  cantidad: number,
  estado_cafe: string,
  referencia_tipo?: string,
  referencia_id?: number,
  notes?: string
) {
  try {
    const db = await dbPromise;
    const colName = mapEstadoCafeToColumn(estado_cafe);
    
    let delta = 0;
    if (tipo === 'INGRESO' || (tipo === 'AJUSTE' && cantidad > 0)) {
      delta = Math.abs(cantidad);
    } else if (tipo === 'SALIDA' || tipo === 'MERMA' || (tipo === 'AJUSTE' && cantidad < 0)) {
      delta = -Math.abs(cantidad);
    }

    if (delta !== 0) {
      // 1. Update the Lotes table
      await db.run(`UPDATE Lotes SET ${colName} = ${colName} + ? WHERE id = ?`, [delta, lote_id]);

      // 2. Log to MovimientosStock
      const tipoMov = delta > 0 ? 'ingreso' : 'salida';
      const fecha = new Date().toLocaleDateString('sv-SE');
      await db.run(`
        INSERT INTO MovimientosStock (lote_id, fecha, tipo_movimiento, tipo_cafe, cantidad, motivo, servicio_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        lote_id,
        fecha,
        tipoMov,
        colName,
        Math.abs(cantidad),
        notes || (tipoMov === 'ingreso' ? 'Ingreso físico de grano' : 'Despacho/salida física de grano'),
        referencia_tipo === 'Servicio' ? referencia_id : null
      ]);
    }

    revalidatePath('/stock');
    return { success: true };
  } catch (error) {
    console.error('Failed to register stock movement:', error);
    return { success: false, error: 'Failed to register stock movement' };
  }
}

export async function updateLoteStock(
  lote_id: number, 
  ajuste: number, 
  estadoActual: string
) {
  try {
    const db = await dbPromise;

    // Update the column in Lotes
    await db.run(`UPDATE Lotes SET peso_kg = IFNULL(peso_kg, 0) + ? WHERE id = ?`, [ajuste, lote_id]);

    // Log to MovimientosStock
    const tipoMov = ajuste > 0 ? 'ingreso' : 'salida';
    const fecha = new Date().toLocaleDateString('sv-SE');
    const motivo = ajuste > 0 ? 'Ajuste manual (Ingreso)' : 'Ajuste manual (Despacho)';
    await db.run(`
      INSERT INTO MovimientosStock (lote_id, fecha, tipo_movimiento, tipo_cafe, cantidad, motivo, servicio_id)
      VALUES (?, ?, ?, ?, ?, ?, NULL)
    `, [lote_id, fecha, tipoMov, estadoActual || 'Desconocido', Math.abs(ajuste), motivo]);

    revalidatePath('/stock');
    return { success: true };
  } catch (error) {
    console.error('Failed to update stock:', error);
    return { success: false, error: 'Failed to update stock' };
  }
}


// ═══════════════════════════════════════════════════════════
// SESSION MANAGEMENT (Simplified: fecha + equipo)
// ═══════════════════════════════════════════════════════════

export async function createSesionTueste(formData: FormData) {
  try {
    const db = await dbPromise;
    
    const fecha = formData.get('fecha') as string || new Date().toISOString().split('T')[0];
    const equipo_id = formData.get('equipo_id') ? Number(formData.get('equipo_id')) : null;

    const result = await db.run(`
      INSERT INTO SesionesTueste (fecha, equipo_id, estado)
      VALUES (?, ?, 'activa')
    `, [fecha, equipo_id]);
    
    const sesion_id = result.lastID;

    revalidatePath('/tuestes');
    return { success: true, sesion_id };
  } catch (error) {
    console.error('Failed to create roasting session:', error);
    return { success: false, error: 'Failed to create roasting session' };
  }
}

export async function finalizarSesion(sesionId: number) {
  try {
    const db = await dbPromise;

    // 1. Fetch all planned batches in this session
    const plannedBatches = await db.all("SELECT * FROM Tuestes WHERE sesion_id = ? AND estado = 'planificado'", [sesionId]);

    for (const batch of plannedBatches) {
      const gc = Number(batch.gc || 0);
      const rc = Number(batch.rc || 0);

      // If weights are recorded, complete the batch automatically
      if (gc > 0 && rc > 0) {
        await db.run("UPDATE Tuestes SET estado = 'completado' WHERE id = ?", [batch.id]);

        // Move stock
        if (batch.codigo_lote) {
          const lote = await db.get('SELECT id, stock_real, stock_tostado, peso_kg FROM Lotes WHERE codigo_lote = ?', [batch.codigo_lote]);
          if (lote) {
            const currentStock = lote.peso_kg ?? lote.stock_real ?? 0;
            const newStockReal = currentStock - gc;
            const newStockTostado = (lote.stock_tostado || 0) + rc;
            await db.run('UPDATE Lotes SET stock_real = ?, stock_tostado = ? WHERE id = ?', [newStockReal, newStockTostado, lote.id]);
          }
        }

        // Sync with Servicios if linked
        const link = await db.get(`
          SELECT o.servicio_id, o.id as orden_id, s.fecha
          FROM OrdenesTueste o
          JOIN SesionesTueste s ON s.id = o.sesion_id
          WHERE o.id = ?
        `, [batch.orden_id]);
        if (link && link.servicio_id) {
          await syncServicioFromRoasting(db, link.servicio_id, link.orden_id, link.fecha);
        }
      } else if (gc > 0 && rc <= 0) {
        return { success: false, error: 'No se puede finalizar: hay tuestes con peso verde asignado pero sin peso tostado (RC).' };
      }
    }

    // 2. Finalize the session and its roast orders
    await db.run("UPDATE SesionesTueste SET estado = 'finalizada' WHERE id = ?", [sesionId]);
    await db.run("UPDATE OrdenesTueste SET estado = 'finalizada' WHERE sesion_id = ?", [sesionId]);

    revalidatePath('/tuestes');
    revalidatePath('/stock');
    return { success: true };
  } catch (error) {
    console.error('Failed to finalize session:', error);
    return { success: false, error: 'Failed to finalize session' };
  }
}


export async function updateSesionEquipo(sesionId: number, equipoId: number | null) {
  const db = await dbPromise;
  try {
    await db.run("UPDATE SesionesTueste SET equipo_id = ? WHERE id = ?", [equipoId, sesionId]);
    revalidatePath('/tuestes/sesiones/[id]', 'page');
    revalidatePath('/tuestes');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════
// ORDEN DE TUESTE MANAGEMENT
// ═══════════════════════════════════════════════════════════

export async function addOrdenTueste(sesionId: number, formData: FormData) {
  try {
    const db = await dbPromise;
    
    let codigo_lote = formData.get('codigo_lote') as string || '';
    const clienteInput = formData.get('cliente') as string || '';
    let cliente = clienteInput;
    
    // 1. Create client if not exists
    if (clienteInput) {
      const existingClient = await db.get('SELECT id, nombre FROM Clientes WHERE UPPER(nombre) = ? OR UPPER(empresa) = ?', [clienteInput.toUpperCase(), clienteInput.toUpperCase()]);
      if (!existingClient) {
        await db.run('INSERT INTO Clientes (nombre) VALUES (?)', [clienteInput]);
      } else {
        cliente = existingClient.nombre;
      }
    }

    const target_weight = Number(formData.get('target_weight_calc') || formData.get('target_weight') || 0);
    const partitions = Number(formData.get('partitions') || 1);
    const moisture = formData.get('moisture') ? Number(formData.get('moisture')) : null;
    const density = formData.get('density') ? Number(formData.get('density')) : null;
    let aw = formData.get('aw') ? Number(formData.get('aw')) : null;
    if (aw !== null && aw > 1.0) aw = aw / 1000.0;
    const referencia_tueste_id = formData.get('referencia_tueste_id') ? Number(formData.get('referencia_tueste_id')) : null;

    // 2. Lote info
    let variedad = '', proceso = '', productor = '';
    const isNewLote = formData.get('is_new_lote') === 'true';

    if (isNewLote) {
      codigo_lote = (formData.get('new_codigo') as string || '').toUpperCase().trim();
      variedad = formData.get('new_variedad') as string || '';
      proceso = formData.get('new_proceso') as string || '';
      productor = formData.get('new_productor') as string || '';
      
      const existingLote = await db.get('SELECT id FROM Lotes WHERE codigo_lote = ?', [codigo_lote]);
      if (!existingLote) {
        await db.run(
          'INSERT INTO Lotes (codigo_lote, variedad, proceso, productor, estado_actual, peso_kg, stock_real, stock_tostado) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
          [codigo_lote, variedad, proceso, productor, 'Oro Verde', target_weight, target_weight]
        );
      }
    } else {
      const lotesOrigenRaw = formData.get('lotes_origen') as string || '[]';
      const lotesData = JSON.parse(lotesOrigenRaw);

      if (lotesData.length === 1) {
        // Single Lot
        const l = lotesData[0];
        codigo_lote = l.codigo_lote;
        variedad = l.variedad;
        proceso = l.proceso;
        productor = l.productor;
      } else if (lotesData.length > 1) {
        // Blend or Consolidation
        const varieties = Array.from(new Set(lotesData.map((l: any) => l.variedad).filter(Boolean)));
        const processes = Array.from(new Set(lotesData.map((l: any) => l.proceso).filter(Boolean)));
        const producers = Array.from(new Set(lotesData.map((l: any) => l.productor).filter(Boolean)));
        
        variedad = varieties.length === 1 ? varieties[0] as string : 'Blend';
        proceso = processes.length === 1 ? processes[0] as string : 'Blend';
        productor = producers.join(', ');

        const isConsolidation = varieties.length === 1 && processes.length === 1 && producers.length === 1;
        const prefix = isConsolidation ? 'CONS' : 'BLEND';
        
        // Generate a new code for the blend/consolidation
        codigo_lote = `${prefix}-${Date.now().toString().slice(-6)}`;
        
        // Create the new physical Lot for this blend BEFORE roasting
        const resultLote = await db.run(
          'INSERT INTO Lotes (codigo_lote, variedad, proceso, productor, estado_actual, peso_kg, stock_real) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [codigo_lote, variedad, proceso, productor, 'Oro Verde Mezclado', target_weight, target_weight]
        );
        const newLoteId = resultLote.lastID;

        // Trace the blend in Lotes_Origenes and deduct from parents
        for (const lot of lotesData) {
          if (lot.peso > 0) {
            // Mapping
            await db.run(
              'INSERT INTO Lotes_Origenes (lote_destino_id, lote_origen_id, cantidad_kg) VALUES (?, ?, ?)',
              [newLoteId, lot.id, lot.peso]
            );
            // Deduct stock
            await db.run(
              'UPDATE Lotes SET stock_real = COALESCE(stock_real, peso_kg) - ? WHERE id = ?',
              [lot.peso, lot.id]
            );
            // Log Movimiento
            await db.run(`
              INSERT INTO MovimientosStock (lote_id, fecha, tipo_movimiento, tipo_cafe, cantidad, motivo)
              VALUES (?, DATE('now'), 'salida', 'oro_verde_bruto', ?, 'Mezcla/Consolidacion hacia ${codigo_lote}')
            `, [lot.id, lot.peso]);
          }
        }
      }
    }

    // Get current max orden_visual for this session
    const maxOrden = await db.get('SELECT MAX(orden_visual) as max_v FROM OrdenesTueste WHERE sesion_id = ?', [sesionId]);
    const orden_visual = (maxOrden?.max_v || 0) + 1;

    // Get session info for batch defaults
    const sesion = await db.get('SELECT fecha, equipo_id FROM SesionesTueste WHERE id = ?', [sesionId]);
    const equipo = sesion?.equipo_id ? await db.get('SELECT nombre FROM Equipos WHERE id = ?', [sesion.equipo_id]) : null;

    // 1. Insert Orden
    const result = await db.run(`
      INSERT INTO OrdenesTueste (
        sesion_id, codigo_lote, variedad, productor, proceso, cliente,
        target_weight, partitions, moisture, density, aw,
        referencia_tueste_id, estado, orden_visual
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activa', ?)
    `, [sesionId, codigo_lote, variedad, productor, proceso, cliente,
        target_weight, partitions, moisture, density, aw,
        referencia_tueste_id, orden_visual]);
    
    const orden_id = result.lastID;

    // 2. Generate N planned batches
    const weight_per_partition = target_weight / partitions;
    for (let i = 0; i < partitions; i++) {
      await db.run(`
        INSERT INTO Tuestes (
          sesion_id, orden_id, batch_n, fecha, variedad, productor, proceso, codigo_lote,
          cliente, roaster, b_moist, b_density, aw, gc, rc, estado, es_referencia
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'planificado', 0)
      `, [sesionId, orden_id, i + 1, sesion?.fecha || new Date().toISOString().split('T')[0],
          variedad, productor, proceso, codigo_lote,
          cliente, equipo?.nombre || '', moisture, density, aw, weight_per_partition]);
    }

    revalidatePath('/tuestes');
    return { success: true, orden_id };
  } catch (error) {
    console.error('Failed to add orden de tueste:', error);
    return { success: false, error: 'Failed to add orden de tueste' };
  }
}

export async function deleteOrdenTueste(ordenId: number) {
  try {
    const db = await dbPromise;
    
    // Check if any batches are completed
    const completed = await db.get(
      "SELECT COUNT(*) as c FROM Tuestes WHERE orden_id = ? AND estado = 'completado'", 
      [ordenId]
    );
    if (completed && completed.c > 0) {
      return { success: false, error: 'No se puede eliminar: hay batches completados que ya afectaron el stock.' };
    }

    // Delete all planned batches
    await db.run('DELETE FROM Tuestes WHERE orden_id = ?', [ordenId]);
    // Delete the orden
    await db.run('DELETE FROM OrdenesTueste WHERE id = ?', [ordenId]);

    revalidatePath('/tuestes');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete orden:', error);
    return { success: false, error: 'Failed to delete orden' };
  }
}

export async function reorderOrdenesRecomendado(sesionId: number) {
  try {
    const db = await dbPromise;
    const ordenes = await db.all('SELECT * FROM OrdenesTueste WHERE sesion_id = ?', [sesionId]);
    
    // Sort logic:
    // 1. Process: 'natural' first
    // 2. Weight per batch (target_weight / partitions) ascending
    ordenes.sort((a, b) => {
      const aIsNat = (a.proceso || '').toLowerCase().includes('natural');
      const bIsNat = (b.proceso || '').toLowerCase().includes('natural');
      
      if (aIsNat && !bIsNat) return -1;
      if (!aIsNat && bIsNat) return 1;
      
      const aWeight = a.target_weight && a.partitions ? (a.target_weight / a.partitions) : 0;
      const bWeight = b.target_weight && b.partitions ? (b.target_weight / b.partitions) : 0;
      
      return aWeight - bWeight;
    });

    for (let i = 0; i < ordenes.length; i++) {
      await db.run('UPDATE OrdenesTueste SET orden_visual = ? WHERE id = ?', [i + 1, ordenes[i].id]);
    }
    
    revalidatePath('/tuestes');
    return { success: true };
  } catch (error) {
    console.error('Failed to reorder:', error);
    return { success: false, error: 'Error al reordenar' };
  }
}

export async function moveOrden(ordenId: number, direction: 'up' | 'down') {
  try {
    const db = await dbPromise;
    const orden = await db.get('SELECT sesion_id, orden_visual FROM OrdenesTueste WHERE id = ?', [ordenId]);
    if (!orden) return { success: false, error: 'Not found' };

    const targetVisual = direction === 'up' ? orden.orden_visual - 1 : orden.orden_visual + 1;
    
    const swap = await db.get('SELECT id, orden_visual FROM OrdenesTueste WHERE sesion_id = ? AND orden_visual = ?', [orden.sesion_id, targetVisual]);
    if (!swap) return { success: false, error: 'Cannot move further' };

    await db.run('UPDATE OrdenesTueste SET orden_visual = ? WHERE id = ?', [targetVisual, ordenId]);
    await db.run('UPDATE OrdenesTueste SET orden_visual = ? WHERE id = ?', [orden.orden_visual, swap.id]);
    
    revalidatePath('/tuestes');
    return { success: true };
  } catch (error) {
    console.error('Failed to move:', error);
    return { success: false, error: 'Error al mover' };
  }
}

export async function updateOrdenField(ordenId: number, field: string, value: number | null) {
  try {
    const db = await dbPromise;
    const allowedFields = ['moisture', 'density', 'aw'];
    if (!allowedFields.includes(field)) return { success: false, error: 'Invalid field' };
    
    await db.run(`UPDATE OrdenesTueste SET ${field} = ? WHERE id = ?`, [value, ordenId]);
    
    revalidatePath('/tuestes');
    return { success: true };
  } catch (error) {
    console.error('Failed to update orden:', error);
    return { success: false, error: 'Error al actualizar orden' };
  }
}

// ═══════════════════════════════════════════════════════════
// BATCH MANAGEMENT
// ═══════════════════════════════════════════════════════════

export async function addBatchToOrden(ordenId: number) {
  try {
    const db = await dbPromise;
    
    const orden = await db.get('SELECT * FROM OrdenesTueste WHERE id = ?', [ordenId]);
    if (!orden) return { success: false, error: 'Orden not found' };

    const sesion = await db.get('SELECT fecha, equipo_id FROM SesionesTueste WHERE id = ?', [orden.sesion_id]);
    const equipo = sesion?.equipo_id ? await db.get('SELECT nombre FROM Equipos WHERE id = ?', [sesion.equipo_id]) : null;

    // Get next batch number for this orden
    const maxBatch = await db.get('SELECT MAX(batch_n) as max_b FROM Tuestes WHERE orden_id = ?', [ordenId]);
    const nextBatchN = (maxBatch?.max_b || 0) + 1;

    // Default weight: orden target / current partition count, or 0
    const currentBatches = await db.get('SELECT COUNT(*) as c FROM Tuestes WHERE orden_id = ?', [ordenId]);
    const suggestedWeight = orden.target_weight && currentBatches 
      ? orden.target_weight / (currentBatches.c + 1) 
      : 0;

    await db.run(`
      INSERT INTO Tuestes (
        sesion_id, orden_id, batch_n, fecha, variedad, productor, proceso, codigo_lote,
        cliente, roaster, b_moist, b_density, aw, gc, rc, estado, es_referencia
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'planificado', 0)
    `, [orden.sesion_id, ordenId, nextBatchN, sesion?.fecha || '',
        orden.variedad, orden.productor, orden.proceso, orden.codigo_lote,
        orden.cliente, equipo?.nombre || '', orden.moisture, orden.density, orden.aw, suggestedWeight]);

    revalidatePath('/tuestes');
    return { success: true };
  } catch (error) {
    console.error('Failed to add batch:', error);
    return { success: false, error: 'Failed to add batch' };
  }
}

export async function deleteBatch(batchId: number) {
  try {
    const db = await dbPromise;
    
    const batch = await db.get('SELECT estado FROM Tuestes WHERE id = ?', [batchId]);
    if (!batch) return { success: false, error: 'Batch not found' };
    if (batch.estado === 'completado') {
      return { success: false, error: 'No se puede eliminar un batch completado. Reviértelo primero.' };
    }

    await db.run('DELETE FROM Tuestes WHERE id = ?', [batchId]);

    revalidatePath('/tuestes');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete batch:', error);
    return { success: false, error: 'Failed to delete batch' };
  }
}

// Autosave batch data WITHOUT moving stock
export async function saveBatchData(batchId: number, batchData: any) {
  try {
    const db = await dbPromise;

    const newGc = Number(batchData.gc || 0);
    const newRc = Number(batchData.rc || 0);
    const newLwPercent = newGc > 0 ? ((newGc - newRc) / newGc) * 100 : 0;

    await db.run(`
      UPDATE Tuestes SET
        n_orden = ?, gc = ?, rc = ?, lw_percent = ?,
        t_cooling = ?, ph = ?, potencia_inicial = ?,
        t_tp = ?, temp_tp = ?, t_ts = ?, temp_ts = ?,
        t_fc = ?, temp_fc = ?, t_t = ?, temp_end = ?,
        auc = ?, agtron = ?, t_dev = ?, temp_dev = ?,
        dry_percent = ?, mai_percent = ?, dev_percent = ?,
        m_dry = ?, m_mai = ?, m_dev = ?, notas = ?,
        orden_ejecucion = ?
      WHERE id = ?
    `, [
      batchData.n_orden || null, newGc, newRc, newLwPercent,
      batchData.t_cooling || '', batchData.ph || null, batchData.potencia_inicial || null,
      batchData.t_tp || '', batchData.temp_tp || null, batchData.t_ts || '', batchData.temp_ts || null,
      batchData.t_fc || '', batchData.temp_fc || null, batchData.t_t || '', batchData.temp_end || null,
      batchData.auc || null, batchData.agtron || null, batchData.t_dev || '', batchData.temp_dev || null,
      batchData.dry_percent || null, batchData.mai_percent || null, batchData.dev_percent || null,
      batchData.m_dry || null, batchData.m_mai || null, batchData.m_dev || null,
      batchData.notas || null, batchData.orden_ejecucion || null,
      batchId
    ]);

    // Sync with Servicios if linked
    const link = await db.get(`
      SELECT o.servicio_id, o.id as orden_id, s.fecha
      FROM OrdenesTueste o
      JOIN Tuestes t ON t.orden_id = o.id
      JOIN SesionesTueste s ON s.id = o.sesion_id
      WHERE t.id = ?
    `, [batchId]);
    if (link && link.servicio_id) {
      await syncServicioFromRoasting(db, link.servicio_id, link.orden_id, link.fecha);
    }

    // Don't revalidate on autosave to avoid re-renders
    return { success: true };
  } catch (error) {
    console.error('Failed to autosave batch:', error);
    return { success: false, error: 'Failed to autosave batch' };
  }
}

// Complete batch AND move stock (explicit user confirmation)
export async function completarBatch(batchId: number) {
  try {
    const db = await dbPromise;

    const batch = await db.get('SELECT * FROM Tuestes WHERE id = ?', [batchId]);
    if (!batch) return { success: false, error: 'Batch not found' };

    const oldEstado = batch.estado || 'planificado';
    const gc = Number(batch.gc || 0);
    const rc = Number(batch.rc || 0);

    if (gc <= 0) {
      return { success: false, error: 'El peso verde (GC) debe ser mayor a 0 para completar.' };
    }

    // Mark as completed
    await db.run("UPDATE Tuestes SET estado = 'completado' WHERE id = ?", [batchId]);

    // Move stock only if transitioning from planned to completed
    if (oldEstado === 'planificado' && batch.codigo_lote) {
      const lote = await db.get('SELECT id, stock_real, stock_tostado, peso_kg FROM Lotes WHERE codigo_lote = ?', [batch.codigo_lote]);
      if (lote) {
        const currentStock = lote.peso_kg ?? lote.stock_real ?? 0;
        const newStockReal = currentStock - gc;
        const newStockTostado = (lote.stock_tostado || 0) + rc;
        await db.run('UPDATE Lotes SET stock_real = ?, stock_tostado = ? WHERE id = ?', [newStockReal, newStockTostado, lote.id]);
      }
    }

    // Sync with Servicios if linked
    const link = await db.get(`
      SELECT o.servicio_id, o.id as orden_id, s.fecha
      FROM OrdenesTueste o
      JOIN Tuestes t ON t.orden_id = o.id
      JOIN SesionesTueste s ON s.id = o.sesion_id
      WHERE t.id = ?
    `, [batchId]);
    if (link && link.servicio_id) {
      await syncServicioFromRoasting(db, link.servicio_id, link.orden_id, link.fecha);
    }

    revalidatePath('/tuestes');
    revalidatePath('/stock');
    return { success: true };
  } catch (error) {
    console.error('Failed to complete batch:', error);
    return { success: false, error: 'Failed to complete batch' };
  }
}

// Revert a completed batch back to planned, returning stock
export async function revertirBatch(batchId: number) {
  try {
    const db = await dbPromise;

    const batch = await db.get('SELECT * FROM Tuestes WHERE id = ?', [batchId]);
    if (!batch) return { success: false, error: 'Batch not found' };
    if (batch.estado !== 'completado') return { success: false, error: 'El batch no está completado.' };

    const gc = Number(batch.gc || 0);
    const rc = Number(batch.rc || 0);

    // Revert stock
    if (batch.codigo_lote) {
      const lote = await db.get('SELECT id, stock_real, stock_tostado, peso_kg FROM Lotes WHERE codigo_lote = ?', [batch.codigo_lote]);
      if (lote) {
        const currentStock = lote.peso_kg ?? lote.stock_real ?? 0;
        const newStockReal = currentStock + gc;
        const newStockTostado = (lote.stock_tostado || 0) - rc;
        await db.run('UPDATE Lotes SET stock_real = ?, stock_tostado = ? WHERE id = ?', [newStockReal, newStockTostado, lote.id]);
      }
    }

    await db.run("UPDATE Tuestes SET estado = 'planificado' WHERE id = ?", [batchId]);

    // Sync with Servicios if linked
    const link = await db.get(`
      SELECT o.servicio_id, o.id as orden_id, s.fecha
      FROM OrdenesTueste o
      JOIN Tuestes t ON t.orden_id = o.id
      JOIN SesionesTueste s ON s.id = o.sesion_id
      WHERE t.id = ?
    `, [batchId]);
    if (link && link.servicio_id) {
      await syncServicioFromRoasting(db, link.servicio_id, link.orden_id, link.fecha);
    }

    revalidatePath('/tuestes');
    revalidatePath('/stock');
    return { success: true };
  } catch (error) {
    console.error('Failed to revert batch:', error);
    return { success: false, error: 'Failed to revert batch' };
  }
}

// Legacy saveBatchTueste for backward compatibility with old session views
export async function saveBatchTueste(batchId: number, batchData: any) {
  try {
    const db = await dbPromise;

    const oldBatch = await db.get('SELECT gc, rc, estado, codigo_lote FROM Tuestes WHERE id = ?', [batchId]);
    if (!oldBatch) return { success: false, error: 'Batch not found' };

    const oldGc = oldBatch.gc || 0;
    const oldRc = oldBatch.rc || 0;
    const oldEstado = oldBatch.estado || 'planificado';
    const codigo_lote = oldBatch.codigo_lote;

    const newGc = Number(batchData.gc || 0);
    const newRc = Number(batchData.rc || 0);
    const newLwPercent = newGc > 0 ? ((newGc - newRc) / newGc) * 100 : 0;
    const newEstado = batchData.estado || 'completado';

    await db.run(`
      UPDATE Tuestes SET
        n_orden = ?, gc = ?, rc = ?, lw_percent = ?,
        t_cooling = ?, ph = ?, potencia_inicial = ?,
        t_tp = ?, temp_tp = ?, t_ts = ?, temp_ts = ?,
        t_fc = ?, temp_fc = ?, t_t = ?, temp_end = ?,
        auc = ?, agtron = ?, t_dev = ?, temp_dev = ?,
        dry_percent = ?, mai_percent = ?, dev_percent = ?,
        m_dry = ?, m_mai = ?, m_dev = ?, estado = ?,
        notas = ?
      WHERE id = ?
    `, [
      batchData.n_orden || null, newGc, newRc, newLwPercent,
      batchData.t_cooling || '', batchData.ph || null, batchData.potencia_inicial || null,
      batchData.t_tp || '', batchData.temp_tp || null, batchData.t_ts || '', batchData.temp_ts || null,
      batchData.t_fc || '', batchData.temp_fc || null, batchData.t_t || '', batchData.temp_end || null,
      batchData.auc || null, batchData.agtron || null, batchData.t_dev || '', batchData.temp_dev || null,
      batchData.dry_percent || null, batchData.mai_percent || null, batchData.dev_percent || null,
      batchData.m_dry || null, batchData.m_mai || null, batchData.m_dev || null, newEstado,
      batchData.notas || null,
      batchId
    ]);

    if (codigo_lote) {
      const lote = await db.get('SELECT id, stock_real, stock_tostado, peso_kg FROM Lotes WHERE codigo_lote = ?', [codigo_lote]);
      if (lote) {
        let newStockReal = lote.peso_kg ?? lote.stock_real ?? 0;
        let newStockTostado = lote.stock_tostado || 0;

        if (oldEstado === 'planificado' && newEstado === 'completado') {
          newStockReal -= newGc;
          newStockTostado += newRc;
        } else if (oldEstado === 'completado' && newEstado === 'completado') {
          newStockReal = newStockReal - (newGc - oldGc);
          newStockTostado = newStockTostado + (newRc - oldRc);
        } else if (oldEstado === 'completado' && newEstado === 'planificado') {
          newStockReal += oldGc;
          newStockTostado -= oldRc;
        }

        await db.run('UPDATE Lotes SET stock_real = ?, stock_tostado = ? WHERE id = ?', [newStockReal, newStockTostado, lote.id]);
      }
    }

    // Sync with Servicios if linked
    const link = await db.get(`
      SELECT o.servicio_id, o.id as orden_id, s.fecha
      FROM OrdenesTueste o
      JOIN Tuestes t ON t.orden_id = o.id
      JOIN SesionesTueste s ON s.id = o.sesion_id
      WHERE t.id = ?
    `, [batchId]);
    if (link && link.servicio_id) {
      await syncServicioFromRoasting(db, link.servicio_id, link.orden_id, link.fecha);
    }

    revalidatePath('/tuestes');
    revalidatePath('/stock');
    return { success: true };
  } catch (error) {
    console.error('Failed to save batch:', error);
    return { success: false, error: 'Failed to save batch' };
  }
}

// Toggle a batch as a target reference
export async function toggleReferencia(tuesteId: number, esReferencia: boolean, nombreReferencia: string) {
  try {
    const db = await dbPromise;
    await db.run('UPDATE Tuestes SET es_referencia = ?, nombre_referencia = ? WHERE id = ?', [esReferencia ? 1 : 0, nombreReferencia || null, tuesteId]);
    revalidatePath('/tuestes');
    return { success: true };
  } catch (error) {
    console.error('Failed to toggle reference status:', error);
    return { success: false, error: 'Failed to toggle reference status' };
  }
}

// ═══════════════════════════════════════════════════════════
// SERVICIOS MANAGEMENT & AUTOMATIONS
// ═══════════════════════════════════════════════════════════

async function syncServicioFromRoasting(db: any, servicioId: number, ordenId: number, fechaSession: string) {
  const stats = await db.get(`
    SELECT SUM(gc) as total_gc, SUM(rc) as total_rc, COUNT(*) as c
    FROM Tuestes
    WHERE orden_id = ? AND estado = 'completado'
  `, [ordenId]);

  const gc = stats?.total_gc || 0;
  const rc = stats?.total_rc || 0;
  const count = stats?.c || 0;
  const r_percent = gc > 0 ? ((gc - rc) / gc) * 100 : 0;

  const servicio = await db.get('SELECT tueste_precio_kg FROM Servicios WHERE id = ?', [servicioId]);
  const precio = servicio?.tueste_precio_kg || 0;
  const total_tueste = gc * precio;
  const fecha = count > 0 ? fechaSession : null;

  await db.run(`
    UPDATE Servicios SET
      gc = ?,
      rc = ?,
      r_percent = ?,
      total_tueste = ?,
      fecha_tueste = ?
    WHERE id = ?
  `, [gc, rc, r_percent, total_tueste, fecha, servicioId]);
}

export async function linkServicioToRoastSession(db: any, servicioId: number, sesionId: number, n_batches: number = 1) {
  // 1. Get service info
  const s = await db.get('SELECT * FROM Servicios WHERE id = ?', [servicioId]);
  if (!s) throw new Error('Orden de Servicio no encontrada');

  // 2. Determine target weight
  const target_weight = s.gc || s.hc || s.pc || 0;
  if (target_weight <= 0) {
    throw new Error('La Orden de Servicio debe tener un peso de verde (GC/HC/PC) asignado.');
  }

  // 3. Get session info
  const sesion = await db.get('SELECT fecha, equipo_id FROM SesionesTueste WHERE id = ?', [sesionId]);
  if (!sesion) throw new Error('Sesión de tueste no encontrada');
  const equipo = sesion.equipo_id ? await db.get('SELECT nombre FROM Equipos WHERE id = ?', [sesion.equipo_id]) : null;

  // 4. Check if already linked
  const existing = await db.get('SELECT id FROM OrdenesTueste WHERE servicio_id = ? AND sesion_id = ?', [servicioId, sesionId]);
  if (existing) return;

  // Get current max orden_visual for this session
  const maxOrden = await db.get('SELECT MAX(orden_visual) as max_v FROM OrdenesTueste WHERE sesion_id = ?', [sesionId]);
  const orden_visual = (maxOrden?.max_v || 0) + 1;

  // 5. Create OrdenesTueste
  const result = await db.run(`
    INSERT INTO OrdenesTueste (
      sesion_id, servicio_id, codigo_lote, variedad, productor, proceso, cliente,
      target_weight, partitions, moisture, density, aw, estado, orden_visual
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 'activa', ?)
  `, [
    sesionId, servicioId, s.codigo_cafe, s.variedad, s.productor, s.proceso, s.cliente,
    target_weight, s.m_percent, s.d, s.aw, orden_visual
  ]);

  const orden_id = result.lastID;

  // 6. Create Tueste (batches)
  const batchWeight = target_weight / n_batches;
  for (let i = 1; i <= n_batches; i++) {
    await db.run(`
      INSERT INTO Tuestes (
        sesion_id, orden_id, batch_n, fecha, variedad, productor, proceso, codigo_lote,
        cliente, roaster, b_moist, b_density, aw, gc, rc, estado, es_referencia
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'planificado', 0)
    `, [
      sesionId, orden_id, i, sesion.fecha, s.variedad, s.productor, s.proceso, s.codigo_cafe,
      s.cliente, equipo?.nombre || '', s.m_percent, s.d, s.aw, batchWeight
    ]);
  }
}

export async function createServicioFromOrdenTueste(ordenId: number) {
  try {
    const db = await dbPromise;

    // 1. Fetch OrdenesTueste
    const orden = await db.get(`
      SELECT o.*, s.fecha as fecha_sesion
      FROM OrdenesTueste o
      JOIN SesionesTueste s ON s.id = o.sesion_id
      WHERE o.id = ?
    `, [ordenId]);

    if (!orden) return { success: false, error: 'Orden no encontrada' };
    if (orden.servicio_id) return { success: false, error: 'La orden ya está asociada a un servicio' };

    // 2. Calculate totals from batches
    const stats = await db.get(`
      SELECT SUM(gc) as total_gc, SUM(rc) as total_rc, COUNT(*) as c
      FROM Tuestes
      WHERE orden_id = ? AND estado = 'completado'
    `, [ordenId]);

    const gc = stats?.total_gc || orden.target_weight || 0;
    const rc = stats?.total_rc || 0;
    const r_percent = gc > 0 ? ((gc - rc) / gc) * 100 : 0;

    // Lote id lookup
    let lote_id = null;
    let cliente_id = null;
    if (orden.cliente) {
      const cli = await db.get('SELECT id FROM Clientes WHERE UPPER(nombre) = ?', [orden.cliente.toUpperCase()]);
      if (cli) cliente_id = cli.id;
    }
    if (orden.codigo_lote) {
      const lote = await db.get('SELECT id FROM Lotes WHERE codigo_lote = ?', [orden.codigo_lote]);
      if (lote) lote_id = lote.id;
    }

    // Fetch default roasting price per kg (client-specific or global)
    let default_precio_tueste = 6.0;
    if (orden.cliente) {
      const clientRow = await db.get('SELECT default_tueste_precio_kg FROM Clientes WHERE UPPER(nombre) = ?', [orden.cliente.toUpperCase()]);
      if (clientRow && clientRow.default_tueste_precio_kg !== null && clientRow.default_tueste_precio_kg !== undefined) {
        default_precio_tueste = Number(clientRow.default_tueste_precio_kg);
      } else {
        const globalRow = await db.get("SELECT value FROM Ajustes WHERE key = 'global_tueste_precio_kg'");
        if (globalRow && globalRow.value) {
          default_precio_tueste = Number(globalRow.value);
        }
      }
    } else {
      const globalRow = await db.get("SELECT value FROM Ajustes WHERE key = 'global_tueste_precio_kg'");
      if (globalRow && globalRow.value) {
        default_precio_tueste = Number(globalRow.value);
      }
    }

    const total_tueste = gc * default_precio_tueste;

    // 3. Create Servicio
    const result = await db.run(`
      INSERT INTO Servicios (
        cliente, variedad, proceso, productor, codigo_cafe, lote_id,
        gc, r_percent, rc, tueste_precio_kg, total_tueste,
        fecha_tueste, estado, detalle
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completado', 'Generado desde Tueste #')
    `, [
      orden.cliente || '', orden.variedad || '', orden.proceso || '', orden.productor || '', 
      orden.codigo_lote || '', lote_id,
      gc, r_percent, rc, default_precio_tueste, total_tueste,
      orden.fecha_sesion
    ]);

    const serviceId = result.lastID;
    
    // Update the generated detail
    await db.run('UPDATE Servicios SET n_orden = ?, detalle = ? WHERE id = ?', [String(serviceId), `Generado desde Sesión de Tueste (Orden ${ordenId})`, serviceId]);

    // 4. Link back to OrdenesTueste
    await db.run('UPDATE OrdenesTueste SET servicio_id = ? WHERE id = ?', [serviceId, ordenId]);

    revalidatePath('/servicios');
    revalidatePath('/tuestes');
    return { success: true, id: serviceId };
  } catch (error) {
    console.error('Failed to create service from orden:', error);
    return { success: false, error: 'Failed to create service from orden' };
  }
}

export async function createServicio(formData: FormData) {
  try {
    const db = await dbPromise;

    const clienteInput = (formData.get('cliente') as string || '').toUpperCase().trim();
    if (!clienteInput) return { success: false, error: 'El cliente es requerido.' };

    let cliente_id: number | null = null;
    let cliente = clienteInput;
    const existingClient = await db.get('SELECT id, nombre FROM Clientes WHERE UPPER(nombre) = ? OR UPPER(empresa) = ?', [clienteInput, clienteInput]);
    if (!existingClient) {
      const cRes = await db.run('INSERT INTO Clientes (nombre) VALUES (?)', [clienteInput]);
      cliente_id = cRes.lastID as number;
    } else {
      cliente_id = existingClient.id;
      cliente = existingClient.nombre;
    }

    const variedad = (formData.get('variedad') as string || '').toUpperCase().trim();
    const proceso = (formData.get('proceso') as string || '').toUpperCase().trim();
    const productor = (formData.get('productor') as string || '').toUpperCase().trim();
    const codigo_cafe = (formData.get('codigo_cafe') as string || '').toUpperCase().trim();
    const m_percent = formData.get('m_percent') ? Number(formData.get('m_percent')) : null;
    const aw = formData.get('aw') ? Number(formData.get('aw')) : null;
    const d = formData.get('d') ? Number(formData.get('d')) : null;

    const has_trillado = formData.get('has_trillado') === 'true';
    const has_seleccion = formData.get('has_seleccion') === 'true';
    const has_tueste = formData.get('has_tueste') === 'true';
    const has_molienda = formData.get('has_molienda') === 'true';
    const has_envasado = formData.get('has_envasado') === 'true';

    // Ingreso y Salida Físicos explícitos
    const ingreso_fisico = formData.get('ingreso_fisico') === 'true';
    const ingreso_cantidad = Number(formData.get('ingreso_cantidad') || 0);
    const ingreso_tipo = formData.get('ingreso_tipo') as any;

    const salida_fisico = formData.get('salida_fisico') === 'true';
    const salida_cantidad = Number(formData.get('salida_cantidad') || 0);
    const salida_tipo = formData.get('salida_tipo') as any;

    // Trillado values
    const pc = has_trillado ? Number(formData.get('pc') || 0) : null;
    const trillado_precio_kg = has_trillado ? Number(formData.get('trillado_precio_kg') || 0) : null;
    const total_trillado = has_trillado && pc && trillado_precio_kg ? pc * trillado_precio_kg : null;
    const hc = has_trillado ? Number(formData.get('hc') || 0) : null;
    const t_percent = pc && hc ? ((pc - hc) / pc) * 100 : null;

    // Selección values
    const seleccion_precio_kg = has_seleccion ? Number(formData.get('seleccion_precio_kg') || 0) : null;
    const selection_input = hc || pc || 0;
    const total_seleccion_real = has_seleccion && selection_input && seleccion_precio_kg ? selection_input * seleccion_precio_kg : null;
    
    // Tueste values
    const gc = has_tueste ? Number(formData.get('gc') || hc || pc || 0) : null;
    const tueste_precio_kg = has_tueste ? Number(formData.get('tueste_precio_kg') || 0) : null;
    const total_tueste = has_tueste && gc && tueste_precio_kg ? gc * tueste_precio_kg : null;
    const rc = has_tueste ? Number(formData.get('rc') || 0) : null;
    const r_percent = gc && rc ? ((gc - rc) / gc) * 100 : null;

    // Molienda values
    const molienda_precio_kg = has_molienda ? Number(formData.get('molienda_precio_kg') || 0) : null;
    const total = has_molienda ? Number(formData.get('total') || rc || 0) : null;
    const total_molienda = has_molienda && total && molienda_precio_kg ? total * molienda_precio_kg : null;

    // Envasado values
    const envasado_precio_unidad = has_envasado ? Number(formData.get('envasado_precio_unidad') || 0) : null;
    const envasado_cantidad = has_envasado ? Number(formData.get('envasado_cantidad') || 0) : null;
    const envasado_tipo = has_envasado ? formData.get('envasado_tipo') as string : null;
    const total_envasado = has_envasado && envasado_cantidad && envasado_precio_unidad ? envasado_cantidad * envasado_precio_unidad : null;

    let estado = formData.get('estado') as string || 'Pendiente';
    let estado_trillado = 'pendiente';
    let estado_seleccion = 'pendiente';
    let estado_tueste = 'pendiente';
    let estado_molienda = 'pendiente';

    if (cliente === 'PANTIWAYTA TOSTADURÍA ENACE') {
      estado = 'Completado';
      estado_trillado = 'Completado';
      estado_seleccion = 'Completado';
      estado_tueste = 'Completado';
      estado_molienda = 'Completado';
    }

    const detalle = formData.get('detalle') as string || '';

    // -- Lógica de Lotes e Inventario --
    // Buscar o crear Lote
    let lote_id: number | null = null;
    if (codigo_cafe) {
      const lote = await db.get('SELECT id FROM Lotes WHERE codigo_lote = ?', [codigo_cafe]);
      if (lote) {
        lote_id = lote.id;
        // Si no tiene cliente_id asignado, lo asignamos ahora
        await db.run('UPDATE Lotes SET propietario = ?, cliente_id = ? WHERE id = ? AND cliente_id IS NULL', [cliente, cliente_id, lote_id]);
      } else {
        // Crear Lote nuevo
        const lRes = await db.run(`
          INSERT INTO Lotes (codigo_lote, variedad, proceso, productor, propietario, cliente_id, n_lote, stock_pergamino, stock_oro_verde_bruto, stock_oro_verde_seleccionado, stock_descarte, stock_tostado)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0)
        `, [codigo_cafe, variedad, proceso, productor, cliente, cliente_id, codigo_cafe]);
        lote_id = lRes.lastID as number;
      }
    }

    const result = await db.run(`
      INSERT INTO Servicios (
        cliente, variedad, proceso, productor, codigo_cafe, lote_id,
        m_percent, aw, d,
        pc, t_percent, hc, trillado_precio_kg, total_trillado,
        seleccion_precio_kg, total_seleccion,
        gc, r_percent, rc, tueste_precio_kg, total_tueste,
        molienda_precio_kg, total,
        envasado_precio_unidad, envasado_cantidad, envasado_tipo, total_envasado,
        estado, estado_trillado, estado_seleccion, estado_tueste, estado_molienda, detalle
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      cliente, variedad, proceso, productor, codigo_cafe, lote_id,
      m_percent, aw, d,
      pc, t_percent, hc, trillado_precio_kg, total_trillado,
      seleccion_precio_kg, total_seleccion_real,
      gc, r_percent, rc, tueste_precio_kg, total_tueste,
      molienda_precio_kg, total,
      envasado_precio_unidad, envasado_cantidad, envasado_tipo, total_envasado,
      estado, estado_trillado, estado_seleccion, estado_tueste, estado_molienda, detalle
    ]);

    const serviceId = result.lastID;
    if (typeof serviceId !== 'number') {
      throw new Error('Failed to obtain service ID');
    }
    await db.run('UPDATE Servicios SET n_orden = ? WHERE id = ?', [String(serviceId), serviceId]);

    // ── PROGRAMACIÓN DE TUESTE AUTOMÁTICA AL CREAR LA OS ──
    const programacion_tueste_opcion = formData.get('programacion_tueste_opcion') as string;
    const n_batches = Number(formData.get('n_batches') || 1);
    if (has_tueste && programacion_tueste_opcion) {
      if (programacion_tueste_opcion === 'crear_nueva') {
        const tostadora_id = formData.get('tostadora_id') ? Number(formData.get('tostadora_id')) : null;
        const fecha = new Date().toLocaleDateString('sv-SE');
        const resSesion = await db.run(`
          INSERT INTO SesionesTueste (fecha, equipo_id, estado)
          VALUES (?, ?, 'activa')
        `, [fecha, tostadora_id]);
        const targetSesionId = resSesion.lastID;
        if (typeof targetSesionId !== 'number') {
          throw new Error('Failed to create session');
        }
        await linkServicioToRoastSession(db, serviceId, targetSesionId, n_batches);
      } else if (programacion_tueste_opcion === 'asignar_existente') {
        const targetSesionId = Number(formData.get('programacion_tueste_sesion_id'));
        if (targetSesionId) {
          await linkServicioToRoastSession(db, serviceId, targetSesionId, n_batches);
        }
      }
    }

    // ── ACTUALIZACIÓN DE INVENTARIO DEL LOTE ──
    if (lote_id) {
      // 1. Registro de Ingreso Físico Explícito
      if (ingreso_fisico && ingreso_cantidad > 0 && ingreso_tipo) {
        await registrarMovimientoStock(lote_id, 'INGRESO', ingreso_cantidad, ingreso_tipo, 'Servicio', serviceId, 'Ingreso físico de grano registrado con el servicio');
      }

      // Las transacciones por fase (trillado, selección, tueste, molienda) ya no se registran aquí.
      // Se registrarán de forma progresiva al completar cada fase en el cliente.

      // 3. Registro de Salida Físico Explícito
      if (salida_fisico && salida_cantidad > 0 && salida_tipo) {
        await registrarMovimientoStock(lote_id, 'SALIDA', salida_cantidad, salida_tipo, 'Servicio', serviceId, 'Despacho/salida física de grano registrada con el servicio');
      }
    }

    revalidatePath('/servicios');
    return { success: true, id: serviceId };
  } catch (error) {
    console.error('Failed to create service order:', error);
    return { success: false, error: 'Failed to create service order' };
  }
}

export async function updateServicio(id: number, formData: FormData) {
  try {
    const db = await dbPromise;

    const clienteInput = (formData.get('cliente') as string || '').toUpperCase().trim();
    if (!clienteInput) return { success: false, error: 'El cliente es requerido.' };

    let cliente = clienteInput;
    const existingClient = await db.get('SELECT id, nombre FROM Clientes WHERE UPPER(nombre) = ? OR UPPER(empresa) = ?', [clienteInput, clienteInput]);
    if (!existingClient) {
      await db.run('INSERT INTO Clientes (nombre, abreviatura) VALUES (?, ?)', [clienteInput, clienteInput.substring(0, 3)]);
    } else {
      cliente = existingClient.nombre;
    }

    const variedad = (formData.get('variedad') as string || '').toUpperCase().trim();
    const proceso = (formData.get('proceso') as string || '').toUpperCase().trim();
    const productor = (formData.get('productor') as string || '').toUpperCase().trim();
    const codigo_cafe = (formData.get('codigo_cafe') as string || '').toUpperCase().trim();
    const m_percent = formData.get('m_percent') ? Number(formData.get('m_percent')) : null;
    const aw = formData.get('aw') ? Number(formData.get('aw')) : null;
    const d = formData.get('d') ? Number(formData.get('d')) : null;

    const has_trillado = formData.get('has_trillado') === 'true';
    const has_seleccion = formData.get('has_seleccion') === 'true';
    const has_tueste = formData.get('has_tueste') === 'true';
    const has_molienda = formData.get('has_molienda') === 'true';
    const has_envasado = formData.get('has_envasado') === 'true';

    // Ingreso y Salida Físicos explícitos
    const ingreso_fisico = formData.get('ingreso_fisico') === 'true';
    const ingreso_cantidad = Number(formData.get('ingreso_cantidad') || 0);
    const ingreso_tipo = formData.get('ingreso_tipo') as any;

    const salida_fisico = formData.get('salida_fisico') === 'true';
    const salida_cantidad = Number(formData.get('salida_cantidad') || 0);
    const salida_tipo = formData.get('salida_tipo') as any;

    // Trillado values
    const pc = has_trillado ? Number(formData.get('pc') || 0) : null;
    const trillado_precio_kg = has_trillado ? Number(formData.get('trillado_precio_kg') || 0) : null;
    const total_trillado = has_trillado && pc && trillado_precio_kg ? pc * trillado_precio_kg : null;
    const hc = has_trillado ? Number(formData.get('hc') || 0) : null;
    const t_percent = pc && hc ? ((pc - hc) / pc) * 100 : null;

    // Selección values
    const seleccion_precio_kg = has_seleccion ? Number(formData.get('seleccion_precio_kg') || 0) : null;
    const selection_input = hc || pc || 0;
    const total_seleccion_real = has_seleccion && selection_input && seleccion_precio_kg ? selection_input * seleccion_precio_kg : null;
    
    // Tueste values
    const gc = has_tueste ? Number(formData.get('gc') || hc || pc || 0) : null;
    const tueste_precio_kg = has_tueste ? Number(formData.get('tueste_precio_kg') || 0) : null;
    const total_tueste = has_tueste && gc && tueste_precio_kg ? gc * tueste_precio_kg : null;
    const rc = has_tueste ? Number(formData.get('rc') || 0) : null;
    const r_percent = gc && rc ? ((gc - rc) / gc) * 100 : null;

    // Molienda values
    const molienda_precio_kg = has_molienda ? Number(formData.get('molienda_precio_kg') || 0) : null;
    const total = has_molienda ? Number(formData.get('total') || rc || 0) : null;
    const total_molienda = has_molienda && total && molienda_precio_kg ? total * molienda_precio_kg : null;

    // Envasado values
    const envasado_precio_unidad = has_envasado ? Number(formData.get('envasado_precio_unidad') || 0) : null;
    const envasado_cantidad = has_envasado ? Number(formData.get('envasado_cantidad') || 0) : null;
    const envasado_tipo = has_envasado ? formData.get('envasado_tipo') as string : null;
    const total_envasado = has_envasado && envasado_cantidad && envasado_precio_unidad ? envasado_cantidad * envasado_precio_unidad : null;

    let estado = formData.get('estado') as string || 'Pendiente';
    let estado_trillado = 'pendiente';
    let estado_seleccion = 'pendiente';
    let estado_tueste = 'pendiente';
    let estado_molienda = 'pendiente';

    if (cliente === 'PANTIWAYTA TOSTADURÍA ENACE') {
      estado = 'Completado';
      estado_trillado = 'Completado';
      estado_seleccion = 'Completado';
      estado_tueste = 'Completado';
      estado_molienda = 'Completado';
    }

    const detalle = formData.get('detalle') as string || '';

    // Resolve or create lote_id for data integrity
    let lote_id: number | null = null;
    if (codigo_cafe) {
      const lote = await db.get('SELECT id FROM Lotes WHERE codigo_lote = ?', [codigo_cafe]);
      if (lote) {
        lote_id = lote.id;
        await db.run('UPDATE Lotes SET propietario = ? WHERE id = ? AND propietario IS NULL', [cliente, lote_id]);
      } else {
        const lRes = await db.run(`
          INSERT INTO Lotes (codigo_lote, variedad, proceso, productor, propietario, n_lote, stock_pergamino, stock_oro_verde_bruto, stock_oro_verde_seleccionado, stock_descarte, stock_tostado)
          VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0)
        `, [codigo_cafe, variedad, proceso, productor, cliente, codigo_cafe]);
        lote_id = lRes.lastID as number;
      }
    }

    await db.run(`
      UPDATE Servicios SET
        cliente = ?, variedad = ?, proceso = ?, productor = ?, codigo_cafe = ?, lote_id = ?,
        m_percent = ?, aw = ?, d = ?,
        pc = ?, t_percent = ?, hc = ?, trillado_precio_kg = ?, total_trillado = ?,
        seleccion_precio_kg = ?, total_seleccion = ?,
        gc = ?, r_percent = ?, rc = ?, tueste_precio_kg = ?, total_tueste = ?,
        molienda_precio_kg = ?, total = ?,
        envasado_precio_unidad = ?, envasado_cantidad = ?, envasado_tipo = ?, total_envasado = ?,
        estado = ?, estado_trillado = ?, estado_seleccion = ?, estado_tueste = ?, estado_molienda = ?, detalle = ?
      WHERE id = ?
    `, [
      cliente, variedad, proceso, productor, codigo_cafe, lote_id,
      m_percent, aw, d,
      pc, t_percent, hc, trillado_precio_kg, total_trillado,
      seleccion_precio_kg, total_seleccion_real,
      gc, r_percent, rc, tueste_precio_kg, total_tueste,
      molienda_precio_kg, total,
      envasado_precio_unidad, envasado_cantidad, envasado_tipo, total_envasado,
      estado, estado_trillado, estado_seleccion, estado_tueste, estado_molienda, detalle, id
    ]);

    // ── PROGRAMACIÓN DE TUESTE Y VINCULACIÓN EN EDICIÓN ──
    const existingOt = await db.get('SELECT id, sesion_id FROM OrdenesTueste WHERE servicio_id = ? LIMIT 1', [id]);
    
    if (has_tueste) {
      if (existingOt) {
        // Sync modified details directly to the existing active roast order and its planned batches
        const target_weight = gc || hc || pc || 0;
        await db.run(`
          UPDATE OrdenesTueste SET
            codigo_lote = ?, variedad = ?, productor = ?, proceso = ?, cliente = ?,
            target_weight = ?, moisture = ?, density = ?, aw = ?
          WHERE id = ?
        `, [codigo_cafe, variedad, productor, proceso, cliente, target_weight, m_percent, d, aw, existingOt.id]);

        await db.run(`
          UPDATE Tuestes SET
            codigo_lote = ?, variedad = ?, productor = ?, proceso = ?, cliente = ?,
            b_moist = ?, b_density = ?, aw = ?, gc = ?
          WHERE orden_id = ? AND estado = 'planificado'
        `, [codigo_cafe, variedad, productor, proceso, cliente, m_percent, d, aw, target_weight, existingOt.id]);
        
        revalidatePath(`/tuestes/sesiones/${existingOt.sesion_id}`);
      } else {
        // Program for the first time
        const programacion_tueste_opcion = formData.get('programacion_tueste_opcion') as string;
        if (programacion_tueste_opcion === 'crear_nueva') {
          const fecha = new Date().toLocaleDateString('sv-SE');
          const resSesion = await db.run(`
            INSERT INTO SesionesTueste (fecha, equipo_id, estado)
            VALUES (?, NULL, 'activa')
          `, [fecha]);
          const targetSesionId = resSesion.lastID;
          if (typeof targetSesionId !== 'number') {
            throw new Error('Failed to create session');
          }
          await linkServicioToRoastSession(db, id, targetSesionId);
          revalidatePath(`/tuestes/sesiones/${targetSesionId}`);
        } else if (programacion_tueste_opcion === 'asignar_existente') {
          const targetSesionId = Number(formData.get('programacion_tueste_sesion_id'));
          if (targetSesionId) {
            await linkServicioToRoastSession(db, id, targetSesionId);
            revalidatePath(`/tuestes/sesiones/${targetSesionId}`);
          }
        }
      }
    } else {
      // If tueste is disabled/unchecked and there is an existing OT, we can delete it only if there are no completed batches
      if (existingOt) {
        const hasCompleted = await db.get("SELECT id FROM Tuestes WHERE orden_id = ? AND estado = 'completado' LIMIT 1", [existingOt.id]);
        if (!hasCompleted) {
          await db.run('DELETE FROM Tuestes WHERE orden_id = ?', [existingOt.id]);
          await db.run('DELETE FROM OrdenesTueste WHERE id = ?', [existingOt.id]);
          revalidatePath(`/tuestes/sesiones/${existingOt.sesion_id}`);
        }
      }
    }

    // ── REGISTRO DE MOVIMIENTOS FÍSICOS EXPLÍCITOS EN EDICIÓN ──
    const lote = await db.get('SELECT lote_id FROM Servicios WHERE id = ?', [id]);
    if (lote && lote.lote_id) {
      if (ingreso_fisico && ingreso_cantidad > 0 && ingreso_tipo) {
        await registrarMovimientoStock(lote.lote_id, 'INGRESO', ingreso_cantidad, ingreso_tipo, 'Servicio', id, 'Ingreso físico explícito en edición de servicio');
      }
      if (salida_fisico && salida_cantidad > 0 && salida_tipo) {
        await registrarMovimientoStock(lote.lote_id, 'SALIDA', salida_cantidad, salida_tipo, 'Servicio', id, 'Salida física explícita en edición de servicio');
      }
    }

    revalidatePath(`/servicios/${id}`);
    revalidatePath('/servicios');
    return { success: true };
  } catch (error) {
    console.error('Failed to update service order:', error);
    return { success: false, error: 'Failed to update service order' };
  }
}

export async function getGlobalAjustes() {
  try {
    const db = await dbPromise;
    const rows = await db.all('SELECT key, value FROM Ajustes');
    const config: Record<string, string> = {};
    for (const r of rows) {
      config[r.key] = r.value;
    }
    return config;
  } catch (error) {
    console.error('Failed to get global settings:', error);
    return {};
  }
}

export async function updateGlobalAjustes(ajustes: Record<string, string>) {
  try {
    const db = await dbPromise;
    for (const [key, value] of Object.entries(ajustes)) {
      await db.run('INSERT OR REPLACE INTO Ajustes (key, value) VALUES (?, ?)', [key, value]);
    }
    revalidatePath('/ajustes');
    return { success: true };
  } catch (error) {
    console.error('Failed to update global settings:', error);
    return { success: false, error: 'Failed to update settings' };
  }
}

export async function getClienteDefaults(clienteNombre: string) {
  try {
    const db = await dbPromise;
    const client = await db.get('SELECT * FROM Clientes WHERE UPPER(nombre) = ? OR UPPER(empresa) = ?', [clienteNombre.toUpperCase(), clienteNombre.toUpperCase()]);
    return client || null;
  } catch (error) {
    console.error('Failed to fetch client defaults:', error);
    return null;
  }
}

export async function programarTuesteDesdeServicio(servicioId: number, sesionId: number) {
  try {
    const db = await dbPromise;

    // 1. Fetch Servicio
    const s = await db.get('SELECT * FROM Servicios WHERE id = ?', [servicioId]);
    if (!s) return { success: false, error: 'Orden de Servicio no encontrada' };

    // 2. Determine target weight
    const target_weight = s.gc || s.hc || s.pc || 0;
    if (target_weight <= 0) {
      return { success: false, error: 'La Orden de Servicio debe tener un peso de verde (GC/HC/PC) asignado.' };
    }

    // 3. Get session info
    const sesion = await db.get('SELECT fecha, equipo_id FROM SesionesTueste WHERE id = ?', [sesionId]);
    if (!sesion) return { success: false, error: 'Sesión de tueste no encontrada' };
    const equipo = sesion.equipo_id ? await db.get('SELECT nombre FROM Equipos WHERE id = ?', [sesion.equipo_id]) : null;

    // 4. Get current max orden_visual for this session
    const maxOrden = await db.get('SELECT MAX(orden_visual) as max_v FROM OrdenesTueste WHERE sesion_id = ?', [sesionId]);
    const orden_visual = (maxOrden?.max_v || 0) + 1;

    // 5. Create OrdenesTueste
    const result = await db.run(`
      INSERT INTO OrdenesTueste (
        sesion_id, servicio_id, codigo_lote, variedad, productor, proceso, cliente,
        target_weight, partitions, moisture, density, aw, estado, orden_visual
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 'activa', ?)
    `, [
      sesionId, servicioId, s.codigo_cafe, s.variedad, s.productor, s.proceso, s.cliente,
      target_weight, s.m_percent, s.d, s.aw, orden_visual
    ]);

    const orden_id = result.lastID;

    // 6. Create Tueste (batch)
    await db.run(`
      INSERT INTO Tuestes (
        sesion_id, orden_id, batch_n, fecha, variedad, productor, proceso, codigo_lote,
        cliente, roaster, b_moist, b_density, aw, gc, rc, estado, es_referencia
      ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'planificado', 0)
    `, [
      sesionId, orden_id, sesion.fecha, s.variedad, s.productor, s.proceso, s.codigo_cafe,
      s.cliente, equipo?.nombre || '', s.m_percent, s.d, s.aw, target_weight
    ]);

    revalidatePath(`/tuestes/sesiones/${sesionId}`);
    revalidatePath(`/servicios/${servicioId}`);
    revalidatePath('/tuestes');
    return { success: true };
  } catch (error) {
    console.error('Failed to program roast:', error);
    return { success: false, error: 'Failed to program roast' };
  }
}

export async function createLote(formData: FormData) {
  try {
    const db = await dbPromise;
    const codigo_lote = (formData.get('codigo_lote') as string || '').toUpperCase().trim();
    const variedad = (formData.get('variedad') as string || '').toUpperCase().trim();
    const proceso = (formData.get('proceso') as string || '').toUpperCase().trim();
    const productor = (formData.get('productor') as string || '').toUpperCase().trim();
    const propietario = (formData.get('propietario') as string || '').toUpperCase().trim();
    const cliente_id = formData.get('cliente_id') ? Number(formData.get('cliente_id')) : null;
    
    if (!codigo_lote) return { success: false, error: 'El código de lote es requerido.' };

    const existing = await db.get('SELECT id FROM Lotes WHERE codigo_lote = ?', [codigo_lote]);
    if (existing) return { success: false, error: 'Ya existe un lote con este código.' };

    const result = await db.run(`
      INSERT INTO Lotes (
        codigo_lote, variedad, proceso, productor, propietario, cliente_id, n_lote,
        stock_pergamino, stock_oro_verde_bruto, stock_oro_verde_seleccionado, stock_descarte, stock_tostado,
        activo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0.0, 0.0, 0.0, 0.0, 0.0, 1)
    `, [codigo_lote, variedad, proceso, productor, propietario || null, cliente_id, codigo_lote]);

    revalidatePath('/stock');
    return { 
      success: true, 
      lote: { 
        id: result.lastID, 
        codigo_lote, 
        variedad, 
        proceso, 
        productor, 
        propietario: propietario || null,
        cliente_id,
        stock_pergamino: 0.0,
        stock_oro_verde_bruto: 0.0,
        stock_oro_verde_seleccionado: 0.0,
        stock_descarte: 0.0,
        stock_tostado: 0.0,
        activo: 1
      } 
    };
  } catch (error: any) {
    console.error('Failed to create lote:', error);
    return { success: false, error: error.message || 'Error al crear el lote.' };
  }
}

export async function getLoteCreationCatalogs() {
  try {
    const db = await dbPromise;
    const clientes = await db.all('SELECT id, nombre, abreviatura FROM Clientes ORDER BY nombre ASC');
    const variedades = await db.all('SELECT id, nombre, abreviatura FROM Variedades ORDER BY nombre ASC');
    const procesos = await db.all('SELECT id, nombre, abreviatura FROM Procesos ORDER BY nombre ASC');
    const productores = await db.all('SELECT id, nombre, abreviatura FROM Productores ORDER BY nombre ASC');
    return { success: true, clientes, variedades, procesos, productores };
  } catch (error: any) {
    console.error('Failed to get lote creation catalogs:', error);
    return { success: false, error: error.message || 'Error al obtener catálogos.' };
  }
}

export async function calculateNextLoteSeq(prefix: string) {
  try {
    const db = await dbPromise;
    const matchPattern = `${prefix}-%`;
    const row = await db.get(
      `SELECT codigo_lote FROM Lotes WHERE codigo_lote LIKE ? ORDER BY id DESC LIMIT 1`,
      [matchPattern]
    );
    if (!row) return { success: true, seq: 1 };
    
    const parts = row.codigo_lote.split('-');
    const lastPart = parts[parts.length - 1];
    const lastNum = parseInt(lastPart, 10);
    if (!isNaN(lastNum)) {
      return { success: true, seq: lastNum + 1 };
    }
    return { success: true, seq: 1 };
  } catch (error: any) {
    console.error('Failed to calculate next seq:', error);
    return { success: false, error: error.message || 'Error' };
  }
}

export async function updateLoteActivo(id: number, activo: boolean) {
  try {
    const db = await dbPromise;
    const value = activo ? 1 : 0;
    await db.run('UPDATE Lotes SET activo = ? WHERE id = ?', [value, id]);
    revalidatePath('/stock');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update lote activo status:', error);
    return { success: false, error: error.message || 'Error al actualizar estado activo.' };
  }
}

export async function crearSesionYProgramarTueste(servicioId: number) {
  try {
    const db = await dbPromise;

    // 1. Fetch Servicio
    const s = await db.get('SELECT * FROM Servicios WHERE id = ?', [servicioId]);
    if (!s) return { success: false, error: 'Orden de Servicio no encontrada' };

    // 2. Determine target weight
    const target_weight = s.gc || s.hc || s.pc || 0;
    if (target_weight <= 0) {
      return { success: false, error: 'La Orden de Servicio debe tener un peso de verde (GC/HC/PC) asignado.' };
    }

    // 3. Create a new Session
    const fecha = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD local format
    const resultSesion = await db.run(`
      INSERT INTO SesionesTueste (fecha, equipo_id, estado)
      VALUES (?, NULL, 'activa')
    `, [fecha]);
    const sesionId = resultSesion.lastID;

    // 4. Create OrdenesTueste linked to this session
    const resultOrden = await db.run(`
      INSERT INTO OrdenesTueste (
        sesion_id, servicio_id, codigo_lote, variedad, productor, proceso, cliente,
        target_weight, partitions, moisture, density, aw, estado, orden_visual
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 'activa', 1)
    `, [
      sesionId, servicioId, s.codigo_cafe, s.variedad, s.productor, s.proceso, s.cliente,
      target_weight, s.m_percent, s.d, s.aw
    ]);
    const orden_id = resultOrden.lastID;

    // 5. Create planified batch (Tuestes)
    await db.run(`
      INSERT INTO Tuestes (
        sesion_id, orden_id, batch_n, fecha, variedad, productor, proceso, codigo_lote,
        cliente, roaster, b_moist, b_density, aw, gc, rc, estado, es_referencia
      ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, 0, 'planificado', 0)
    `, [
      sesionId, orden_id, fecha, s.variedad, s.productor, s.proceso, s.codigo_cafe,
      s.cliente, s.m_percent, s.d, s.aw, target_weight
    ]);

    revalidatePath(`/tuestes/sesiones/${sesionId}`);
    revalidatePath(`/servicios/${s.n_orden}`);
    revalidatePath(`/servicios/${servicioId}`);
    revalidatePath('/tuestes');
    
    return { success: true, sesionId };
  } catch (error) {
    console.error('Failed to create session and program roast:', error);
    return { success: false, error: 'Error al crear la sesión y programar el tueste.' };
  }
}

export async function completarFaseTrillado(servicioId: number, pc: number, hc: number, trilladoraId?: number) {
  try {
    const db = await dbPromise;
    const s = await db.get('SELECT * FROM Servicios WHERE id = ?', [servicioId]);
    if (!s) return { success: false, error: 'Servicio no encontrado' };

    await db.run('UPDATE Servicios SET pc = ?, hc = ?, trilladora_id = ? WHERE id = ?', [pc, hc, trilladoraId || null, servicioId]);

    if (s.lote_id) {
      await registrarMovimientoStock(s.lote_id, 'SALIDA', pc, 'PERGAMINO', 'Servicio', servicioId, 'Salida para trillado');
      let tipo_ingreso = 'ORO_VERDE_BRUTO';
      if (trilladoraId) {
        const equipo = await db.get('SELECT nombre FROM Equipos WHERE id = ?', [trilladoraId]);
        if (equipo && equipo.nombre.includes('HGH 2QQ')) {
          tipo_ingreso = 'ORO_VERDE_SELECCIONADO';
        }
      }
      await registrarMovimientoStock(s.lote_id, 'INGRESO', hc, tipo_ingreso, 'Servicio', servicioId, 'Ingreso de trillado');
    }

    revalidatePath(`/servicios/${servicioId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to complete trillado phase:', error);
    return { success: false, error: 'Error al completar fase de trillado' };
  }
}

export async function completarFaseSeleccion(servicioId: number, pesoOroIn: number, pesoSeleccionadoOut: number) {
  try {
    const db = await dbPromise;
    const s = await db.get('SELECT * FROM Servicios WHERE id = ?', [servicioId]);
    if (!s) return { success: false, error: 'Servicio no encontrado' };

    const merma = pesoOroIn - pesoSeleccionadoOut;

    if (s.lote_id && merma >= 0) {
      await registrarMovimientoStock(s.lote_id, 'SALIDA', pesoOroIn, 'ORO_VERDE_BRUTO', 'Servicio', servicioId, 'Salida para selección');
      await registrarMovimientoStock(s.lote_id, 'INGRESO', pesoSeleccionadoOut, 'ORO_VERDE_SELECCIONADO', 'Servicio', servicioId, 'Ingreso post-selección');
      if (merma > 0) {
        await registrarMovimientoStock(s.lote_id, 'MERMA', merma, 'DESCARTE', 'Servicio', servicioId, 'Merma enviada a descarte');
      }
    }

    revalidatePath(`/servicios/${servicioId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to complete seleccion phase:', error);
    return { success: false, error: 'Error al completar fase de selección' };
  }
}

export async function actualizarDetallesAnalisis(loteId: number, key: string, data: any) {
  try {
    const db = await dbPromise;
    const lote = await db.get('SELECT detalles_analisis FROM Lotes WHERE id = ?', [loteId]);
    if (!lote) return { success: false, error: 'Lote no encontrado' };

    let currentDetails = {};
    if (lote.detalles_analisis) {
      try {
        currentDetails = JSON.parse(lote.detalles_analisis);
      } catch (e) {
        console.warn('Invalid JSON in detalles_analisis, overriding.');
      }
    }

    const updatedDetails = {
      ...currentDetails,
      [key]: data
    };

    await db.run('UPDATE Lotes SET detalles_analisis = ? WHERE id = ?', [JSON.stringify(updatedDetails), loteId]);
    revalidatePath(`/lotes`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update detalles analisis:', error);
    return { success: false, error: 'Error al guardar detalles de análisis' };
  }
}

export async function updateServicioEstado(id: number, nuevoEstado: string) {
  try {
    const db = await dbPromise;
    await db.run('UPDATE Servicios SET estado = ? WHERE id = ?', [nuevoEstado, id]);
    revalidatePath('/servicios');
    revalidatePath(`/servicios/${id}`);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update service state:', error);
    return { success: false, error: error.message || 'Error al cambiar el estado.' };
  }
}


// ═══════════════════════════════════════════════════════════
// DESPACHOS MANAGEMENT
// ═══════════════════════════════════════════════════════════

export async function createDespacho(formData: FormData) {
  try {
    const db = await dbPromise;
    const clienteInput = formData.get('cliente') as string || '';
    let cliente = clienteInput;
    const existingClient = await db.get('SELECT nombre FROM Clientes WHERE UPPER(nombre) = ? OR UPPER(empresa) = ?', [clienteInput.toUpperCase(), clienteInput.toUpperCase()]);
    if (existingClient) {
      cliente = existingClient.nombre;
    }
    const n_ticket = formData.get('n_ticket') as string;
    const notas = formData.get('notas') as string;
    const fecha = new Date().toISOString();
    
    // items is a JSON string: [{lote_id: 1, tipo_item: 'cafe', tipo_cafe: 'stock_tostado', cantidad_kg: 10, bolsa_id: null, cantidad_bolsas: null}, ...]
    const itemsStr = formData.get('items') as string;
    const items = JSON.parse(itemsStr);

    const runResult = await db.run(`
      INSERT INTO Despachos (cliente, fecha, n_ticket, notas) VALUES (?, ?, ?, ?)
    `, [cliente, fecha, n_ticket || '', notas || '']);
    
    const despacho_id = runResult.lastID;

    for (const item of items) {
      await db.run(`
        INSERT INTO Despachos_Detalle (despacho_id, lote_id, tipo_item, tipo_cafe, cantidad_kg, bolsa_id, cantidad_bolsas)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        despacho_id, 
        item.lote_id, 
        item.tipo_item, 
        item.tipo_cafe || null, 
        item.cantidad_kg || null, 
        item.bolsa_id || null, 
        item.cantidad_bolsas || null
      ]);

      // Deduct from stock
      if (item.tipo_item === 'cafe' && item.lote_id && item.tipo_cafe && item.cantidad_kg) {
        await registrarMovimientoStock(
          item.lote_id,
          'SALIDA',
          item.cantidad_kg,
          item.tipo_cafe,
          'Despacho',
          despacho_id,
          'Despacho: ' + (n_ticket || `Tck-${despacho_id}`)
        );
      } else if (item.tipo_item === 'bolsa' && item.lote_id && item.bolsa_id && item.cantidad_bolsas) {
        // deduct from LotesBolsas
        await db.run(`
          UPDATE LotesBolsas SET cantidad_en_almacen = cantidad_en_almacen - ? 
          WHERE lote_id = ? AND bolsa_id = ?
        `, [item.cantidad_bolsas, item.lote_id, item.bolsa_id]);
      }
    }

    revalidatePath('/despachos');
    revalidatePath('/stock');
    return { success: true, id: despacho_id };
  } catch (error) {
    console.error('Failed to create despacho:', error);
    return { success: false, error: 'Failed to create despacho' };
  }
}

export async function getDespachos() {
  try {
    const db = await dbPromise;
    const despachos = await db.all(`
      SELECT * FROM Despachos ORDER BY fecha DESC
    `);
    return despachos;
  } catch (error) {
    console.error('Failed to fetch despachos:', error);
    return [];
  }
}

export async function getDespachoById(id: number) {
  try {
    const db = await dbPromise;
    const despacho = await db.get(`SELECT * FROM Despachos WHERE id = ?`, [id]);
    if (!despacho) return null;

    const detalles = await db.all(`
      SELECT d.*, l.codigo_lote, b.nombre as bolsa_nombre 
      FROM Despachos_Detalle d
      LEFT JOIN Lotes l ON d.lote_id = l.id
      LEFT JOIN CatalogoBolsas b ON d.bolsa_id = b.id
      WHERE d.despacho_id = ?
    `, [id]);

    return { ...despacho, detalles };
  } catch (error) {
    console.error('Failed to fetch despacho:', error);
    return null;
  }
}
