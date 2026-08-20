'use server'

import dbPromise from '@/lib/db'
import { revalidatePath } from 'next/cache'

// ═══════════════════════════════════════════════════════════
// CATALOG OF PREDEFINED CONCEPTS
// ═══════════════════════════════════════════════════════════

export async function getConceptosPredefinidos() {
  try {
    const db = await dbPromise;
    return await db.all('SELECT * FROM ConceptosPredefinidos ORDER BY nombre ASC');
  } catch (error) {
    console.error('Failed to get predefined concepts:', error);
    return [];
  }
}

export async function createConceptoPredefinido(nombre: string, precioDefecto: number) {
  try {
    const db = await dbPromise;
    const nameUpper = nombre.toUpperCase().trim();
    if (!nameUpper) return { success: false, error: 'El nombre es requerido.' };
    
    await db.run(
      'INSERT INTO ConceptosPredefinidos (nombre, precio_defecto) VALUES (?, ?)',
      [nameUpper, precioDefecto]
    );
    
    revalidatePath('/ajustes');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to create predefined concept:', error);
    return { success: false, error: error.message || 'Error al crear el concepto.' };
  }
}

export async function deleteConceptoPredefinido(id: number) {
  try {
    const db = await dbPromise;
    await db.run('DELETE FROM ConceptosPredefinidos WHERE id = ?', [id]);
    revalidatePath('/ajustes');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete predefined concept:', error);
    return { success: false, error: 'Error al eliminar el concepto.' };
  }
}

export async function updateConceptoPredefinido(id: number, nombre: string, precioDefecto: number) {
  try {
    const db = await dbPromise;
    const nameUpper = nombre.toUpperCase().trim();
    if (!nameUpper) return { success: false, error: 'El nombre es requerido.' };
    
    await db.run(
      'UPDATE ConceptosPredefinidos SET nombre = ?, precio_defecto = ? WHERE id = ?',
      [nameUpper, precioDefecto, id]
    );
    
    revalidatePath('/ajustes');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update predefined concept:', error);
    return { success: false, error: error.message || 'Error al actualizar el concepto.' };
  }
}

// ═══════════════════════════════════════════════════════════
// PROFORMAS OPERATIONS
// ═══════════════════════════════════════════════════════════

export async function getProformas() {
  try {
    const db = await dbPromise;
    return await db.all('SELECT * FROM Proformas ORDER BY id DESC');
  } catch (error) {
    console.error('Failed to fetch proformas:', error);
    return [];
  }
}

export async function getProformaById(id: number) {
  try {
    const db = await dbPromise;
    const proforma = await db.get('SELECT * FROM Proformas WHERE id = ?', [id]);
    if (!proforma) return null;

    const conceptos = await db.all('SELECT * FROM ProformaConceptos WHERE proforma_id = ?', [id]);
    const servicios = await db.all(
      `SELECT s.*, 
        (
          COALESCE(s.total_trillado, 0) + 
          COALESCE(s.total_seleccion, 0) + 
          COALESCE(s.total_tueste, 0) + 
          (COALESCE(s.total, 0) * COALESCE(s.molienda_precio_kg, 0)) + 
          COALESCE(s.total_envasado, 0)
        ) as total_costo,
        ot.moisture as tueste_moisture,
        ot.density as tueste_density,
        ot.aw as tueste_aw
      FROM Servicios s 
      LEFT JOIN OrdenesTueste ot ON ot.servicio_id = s.id
      WHERE s.proforma_id = ?`,
      [id]
    );

    return {
      ...proforma,
      conceptos,
      servicios
    };
  } catch (error) {
    console.error(`Failed to fetch proforma id=${id}:`, error);
    return null;
  }
}

export async function getPendingServiciosByCliente(cliente: string, currentProformaId?: number) {
  try {
    const db = await dbPromise;
    const clientUpper = cliente.toUpperCase().trim();
    
    const queryStr = `
      SELECT s.*, (
        COALESCE(s.total_trillado, 0) + 
        COALESCE(s.total_seleccion, 0) + 
        COALESCE(s.total_tueste, 0) + 
        (COALESCE(s.total, 0) * COALESCE(s.molienda_precio_kg, 0)) + 
        COALESCE(s.total_envasado, 0)
      ) as total_costo,
      ot.moisture as tueste_moisture,
      ot.density as tueste_density,
      ot.aw as tueste_aw
      FROM Servicios s
      LEFT JOIN OrdenesTueste ot ON ot.servicio_id = s.id
      WHERE UPPER(s.cliente) = ? 
        AND (${currentProformaId ? 's.proforma_id IS NULL OR s.proforma_id = ?' : 's.proforma_id IS NULL'})
      ORDER BY s.id DESC
    `;
    
    const params = currentProformaId ? [clientUpper, currentProformaId] : [clientUpper];
    return await db.all(queryStr, params);
  } catch (error) {
    console.error('Failed to fetch pending services:', error);
    return [];
  }
}

export async function createProforma(
  cliente: string,
  fechaEmision: string,
  fechaVencimiento: string | null,
  descuento: number,
  notas: string,
  conceptos: { descripcion: string; cantidad: number; precioUnitario: number }[],
  serviciosIds: number[]
) {
  try {
    const db = await dbPromise;
    const clientUpper = cliente.toUpperCase().trim();
    if (!clientUpper) return { success: false, error: 'El cliente es requerido.' };

    // 1. Calculate subtotal from Services
    let serviciosSubtotal = 0;
    if (serviciosIds.length > 0) {
      const placeholders = serviciosIds.map(() => '?').join(',');
      const rows = await db.all(
        `SELECT (
          COALESCE(total_trillado, 0) + 
          COALESCE(total_seleccion, 0) + 
          COALESCE(total_tueste, 0) + 
          (COALESCE(total, 0) * COALESCE(molienda_precio_kg, 0)) + 
          COALESCE(total_envasado, 0)
        ) as total_costo FROM Servicios WHERE id IN (${placeholders})`,
        serviciosIds
      );
      serviciosSubtotal = rows.reduce((sum, r) => sum + (r.total_costo || 0), 0);
    }

    // 2. Calculate subtotal from Concepts
    const conceptsSubtotal = conceptos.reduce((sum, c) => sum + (c.cantidad * c.precioUnitario), 0);
    const subtotal = serviciosSubtotal + conceptsSubtotal;
    const total = Math.max(0, subtotal - descuento);

    // 3. Insert Proforma Header
    const result = await db.run(`
      INSERT INTO Proformas (
        cliente, fecha_emision, fecha_vencimiento, subtotal, descuento, total, estado, notas
      ) VALUES (?, ?, ?, ?, ?, ?, 'Borrador', ?)
    `, [clientUpper, fechaEmision, fechaVencimiento || null, subtotal, descuento, total, notas]);

    const proformaId = result.lastID;
    if (typeof proformaId !== 'number') {
      throw new Error('No se pudo crear la proforma');
    }

    // 4. Generate n_proforma correlative (PR-YYYY-XXXX)
    const year = fechaEmision ? new Date(fechaEmision).getFullYear() : new Date().getFullYear();
    const n_proforma = `PR-${year}-${String(proformaId).padStart(4, '0')}`;
    await db.run('UPDATE Proformas SET n_proforma = ? WHERE id = ?', [n_proforma, proformaId]);

    // 5. Insert concepts
    for (const c of conceptos) {
      const lineTotal = c.cantidad * c.precioUnitario;
      await db.run(`
        INSERT INTO ProformaConceptos (
          proforma_id, descripcion, cantidad, precio_unitario, total
        ) VALUES (?, ?, ?, ?, ?)
      `, [proformaId, c.descripcion.toUpperCase().trim(), c.cantidad, c.precioUnitario, lineTotal]);
    }

    // 6. Link services
    if (serviciosIds.length > 0) {
      const placeholders = serviciosIds.map(() => '?').join(',');
      await db.run(`
        UPDATE Servicios SET proforma_id = ? WHERE id IN (${placeholders})
      `, [proformaId, ...serviciosIds]);
    }

    revalidatePath('/proformas');
    revalidatePath('/servicios');
    return { success: true, id: proformaId };
  } catch (error: any) {
    console.error('Failed to create proforma:', error);
    return { success: false, error: error.message || 'Error al crear la proforma.' };
  }
}

export async function updateProforma(
  id: number,
  cliente: string,
  fechaEmision: string,
  fechaVencimiento: string | null,
  descuento: number,
  notas: string,
  conceptos: { descripcion: string; cantidad: number; precioUnitario: number }[],
  serviciosIds: number[]
) {
  try {
    const db = await dbPromise;
    const clientUpper = cliente.toUpperCase().trim();
    if (!clientUpper) return { success: false, error: 'El cliente es requerido.' };

    const existing = await db.get('SELECT estado FROM Proformas WHERE id = ?', [id]);
    if (!existing) return { success: false, error: 'Proforma no encontrada.' };

    // 1. Calculate subtotal from Services
    let serviciosSubtotal = 0;
    if (serviciosIds.length > 0) {
      const placeholders = serviciosIds.map(() => '?').join(',');
      const rows = await db.all(
        `SELECT (
          COALESCE(total_trillado, 0) + 
          COALESCE(total_seleccion, 0) + 
          COALESCE(total_tueste, 0) + 
          (COALESCE(total, 0) * COALESCE(molienda_precio_kg, 0)) + 
          COALESCE(total_envasado, 0)
        ) as total_costo FROM Servicios WHERE id IN (${placeholders})`,
        serviciosIds
      );
      serviciosSubtotal = rows.reduce((sum, r) => sum + (r.total_costo || 0), 0);
    }

    // 2. Calculate subtotal from Concepts
    const conceptsSubtotal = conceptos.reduce((sum, c) => sum + (c.cantidad * c.precioUnitario), 0);
    const subtotal = serviciosSubtotal + conceptsSubtotal;
    const total = Math.max(0, subtotal - descuento);

    // 3. Clear existing relations (to rewrite)
    await db.run('DELETE FROM ProformaConceptos WHERE proforma_id = ?', [id]);
    await db.run('UPDATE Servicios SET proforma_id = NULL WHERE proforma_id = ?', [id]);

    // 4. Update Header
    await db.run(`
      UPDATE Proformas SET
        cliente = ?,
        fecha_emision = ?,
        fecha_vencimiento = ?,
        subtotal = ?,
        descuento = ?,
        total = ?,
        notas = ?
      WHERE id = ?
    `, [clientUpper, fechaEmision, fechaVencimiento || null, subtotal, descuento, total, notas, id]);

    // 5. Re-insert concepts
    for (const c of conceptos) {
      const lineTotal = c.cantidad * c.precioUnitario;
      await db.run(`
        INSERT INTO ProformaConceptos (
          proforma_id, descripcion, cantidad, precio_unitario, total
        ) VALUES (?, ?, ?, ?, ?)
      `, [id, c.descripcion.toUpperCase().trim(), c.cantidad, c.precioUnitario, lineTotal]);
    }

    // 6. Re-link services
    if (serviciosIds.length > 0) {
      const placeholders = serviciosIds.map(() => '?').join(',');
      await db.run(`
        UPDATE Servicios SET proforma_id = ? WHERE id IN (${placeholders})
      `, [id, ...serviciosIds]);
    }

    // If already marked as Pagada, make sure they match completions
    if (existing.estado === 'Pagada') {
      if (serviciosIds.length > 0) {
        const placeholders = serviciosIds.map(() => '?').join(',');
        await db.run(`
          UPDATE Servicios SET estado = 'Completado' WHERE id IN (${placeholders})
        `, serviciosIds);
      }
    }

    revalidatePath('/proformas');
    revalidatePath(`/proformas/${id}`);
    revalidatePath('/servicios');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update proforma:', error);
    return { success: false, error: error.message || 'Error al actualizar la proforma.' };
  }
}

export async function updateProformaEstado(id: number, nuevoEstado: string) {
  try {
    const db = await dbPromise;

    // Update state
    await db.run('UPDATE Proformas SET estado = ? WHERE id = ?', [nuevoEstado, id]);

    // Cascade effect: If pagada, all linked servicios become Completado
    if (nuevoEstado === 'Pagada') {
      await db.run("UPDATE Servicios SET estado = 'Completado' WHERE proforma_id = ?", [id]);
    }

    revalidatePath('/proformas');
    revalidatePath(`/proformas/${id}`);
    revalidatePath('/servicios');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update proforma state:', error);
    return { success: false, error: error.message || 'Error al cambiar el estado.' };
  }
}

export async function mergeProformas(ids: number[]) {
  try {
    if (!ids || ids.length < 2) {
      return { success: false, error: 'Se requieren al menos 2 proformas para juntar.' };
    }

    const db = await dbPromise;

    // 1. Fetch all proformas to validate they belong to the same client
    const placeholders = ids.map(() => '?').join(',');
    const proformasToMerge = await db.all(`SELECT * FROM Proformas WHERE id IN (${placeholders})`, ids);

    if (proformasToMerge.length !== ids.length) {
      return { success: false, error: 'Algunas proformas seleccionadas no existen.' };
    }

    const firstClient = proformasToMerge[0].cliente.toUpperCase().trim();
    for (const p of proformasToMerge) {
      if (p.cliente.toUpperCase().trim() !== firstClient) {
        return { success: false, error: 'No puedes juntar proformas de distintos clientes.' };
      }
    }

    // Calculate new expiration date (e.g. 7 days from today)
    const fechaEmision = new Date().toISOString().split('T')[0];
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 7);
    const fechaVencimientoStr = fechaVencimiento.toISOString().split('T')[0];

    // Create the master proforma with 0 totals initially
    const result = await db.run(`
      INSERT INTO Proformas (cliente, fecha_emision, fecha_vencimiento, subtotal, descuento, total, estado, notas)
      VALUES (?, ?, ?, 0, 0, 0, 'Borrador', ?)
    `, [firstClient, fechaEmision, fechaVencimientoStr, `Proforma consolidada de: ${proformasToMerge.map(p => p.n_proforma).join(', ')}`]);

    const newProformaId = result.lastID;
    if (typeof newProformaId !== 'number') {
      throw new Error('No se pudo crear la proforma consolidada');
    }

    // Generate official n_proforma correlative (PR-YYYY-XXXX)
    const year = new Date().getFullYear();
    const n_proforma = `PR-${year}-${String(newProformaId).padStart(4, '0')}`;
    await db.run('UPDATE Proformas SET n_proforma = ? WHERE id = ?', [n_proforma, newProformaId]);

    // 3. Move ProformaConceptos to the new proforma
    await db.run(`UPDATE ProformaConceptos SET proforma_id = ? WHERE proforma_id IN (${placeholders})`, [newProformaId, ...ids]);

    // 4. Move Servicios to the new proforma
    await db.run(`UPDATE Servicios SET proforma_id = ? WHERE proforma_id IN (${placeholders})`, [newProformaId, ...ids]);

    // 5. Mark old proformas as Fusionada and zero their totals (or leave as is, but change state)
    await db.run(`UPDATE Proformas SET estado = 'Fusionada' WHERE id IN (${placeholders})`, ids);

    // 6. Recalculate totals for the new proforma
    const newConceptos = await db.all('SELECT total FROM ProformaConceptos WHERE proforma_id = ?', [newProformaId]);
    const totalConceptos = newConceptos.reduce((sum, c) => sum + (c.total || 0), 0);

    const newServicios = await db.all(`
      SELECT 
        (
          COALESCE(total_trillado, 0) + 
          COALESCE(total_seleccion, 0) + 
          COALESCE(total_tueste, 0) + 
          (COALESCE(total, 0) * COALESCE(molienda_precio_kg, 0)) + 
          COALESCE(total_envasado, 0)
        ) as total_costo
      FROM Servicios WHERE proforma_id = ?
    `, [newProformaId]);
    
    const totalServicios = newServicios.reduce((sum, s) => sum + (s.total_costo || 0), 0);
    const combinedTotal = totalConceptos + totalServicios;
    // Standard IVA logic used elsewhere is usually just the sum, or sometimes IVA is not strictly calculated here. I will just set subtotal and total to combinedTotal (since VAT logic might be applied later or handled in edit).
    // Looking at add_proforma it might just take values, so let's set subtotal = combinedTotal, total = combinedTotal
    await db.run('UPDATE Proformas SET subtotal = ?, total = ? WHERE id = ?', [combinedTotal, combinedTotal, newProformaId]);

    revalidatePath('/proformas');
    return { success: true, newProformaId };
  } catch (error: any) {
    console.error('Failed to merge proformas:', error);
    return { success: false, error: error.message || 'Error al juntar las proformas.' };
  }
}

export async function deleteProforma(id: number) {
  try {
    const db = await dbPromise;
    
    // Unlink services first explicitly
    await db.run('UPDATE Servicios SET proforma_id = NULL WHERE proforma_id = ?', [id]);
    // Delete concepts (ON DELETE CASCADE should handle this, but let's do it explicitly)
    await db.run('DELETE FROM ProformaConceptos WHERE proforma_id = ?', [id]);
    // Delete header
    await db.run('DELETE FROM Proformas WHERE id = ?', [id]);

    revalidatePath('/proformas');
    revalidatePath('/servicios');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete proforma:', error);
    return { success: false, error: error.message || 'Error al eliminar la proforma.' };
  }
}
