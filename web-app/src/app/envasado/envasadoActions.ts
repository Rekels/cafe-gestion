'use server'

import dbPromise from '@/lib/db'
import { revalidatePath } from 'next/cache'

export interface PaqueteEnvio {
  id?: number
  orden_envasado_id?: number
  nombre_paquete: string
  notas: string | null
  // For frontend use to map details
  tempId?: string
}

export interface OrdenEnvasadoDetalle {
  id?: number
  orden_envasado_id?: number
  paquete_envio_id?: number | null
  bolsa_id: number
  estado_grano: string
  cantidad_bolsas: number
  destino_al_completar: string // 'almacen' | 'despacho'
  lote_id: number
  // For frontend use
  tempPaqueteId?: string | null
  // Extra joined fields
  codigo_lote?: string
  variedad?: string
  proceso?: string
  productor_nombre?: string
}

export interface OrdenEnvasadoData {
  id?: number
  servicio_id?: number | null
  estado?: string
  notas?: string | null
  paquetes: PaqueteEnvio[]
  detalles: OrdenEnvasadoDetalle[]
}

export async function getOrdenEnvasado(servicioId: number) {
  const db = await dbPromise
  const orden = await db.get('SELECT * FROM OrdenesEnvasado WHERE servicio_id = ?', [servicioId])
  if (!orden) return null

  const paquetes = await db.all('SELECT * FROM PaquetesEnvio WHERE orden_envasado_id = ?', [orden.id])
  const detalles = await db.all('SELECT * FROM OrdenesEnvasado_Detalle WHERE orden_envasado_id = ?', [orden.id])

  return { ...orden, paquetes, detalles }
}

export async function saveOrdenEnvasado(data: OrdenEnvasadoData) {
  const db = await dbPromise
  
  try {
    await db.run('BEGIN TRANSACTION')

    let ordenId = data.id
    if (!ordenId) {
      const fecha = new Date().toISOString()
      const res = await db.run(
        'INSERT INTO OrdenesEnvasado (servicio_id, estado, notas, fecha) VALUES (?, ?, ?, ?)',
        [data.servicio_id || null, data.estado || 'Planeado', data.notas, fecha]
      )
      ordenId = res.lastID
    } else {
      await db.run('UPDATE OrdenesEnvasado SET notas = ?, estado = ? WHERE id = ?', [data.notas, data.estado || 'Planeado', ordenId])
    }

    // Clean up old ones for simplicity of this builder
    await db.run('DELETE FROM OrdenesEnvasado_Detalle WHERE orden_envasado_id = ?', [ordenId])
    await db.run('DELETE FROM PaquetesEnvio WHERE orden_envasado_id = ?', [ordenId])

    const paqueteIdMap = new Map<string, number>() // tempId -> real db id

    for (const p of data.paquetes) {
      const pRes = await db.run(
        'INSERT INTO PaquetesEnvio (orden_envasado_id, nombre_paquete, notas) VALUES (?, ?, ?)',
        [ordenId, p.nombre_paquete, p.notas]
      )
      if (p.tempId && pRes.lastID) {
        paqueteIdMap.set(p.tempId, pRes.lastID)
      }
    }

    for (const d of data.detalles) {
      let realPaqueteId = null
      if (d.tempPaqueteId && paqueteIdMap.has(d.tempPaqueteId)) {
        realPaqueteId = paqueteIdMap.get(d.tempPaqueteId)
      } else if (d.paquete_envio_id) {
        // Fallback for cases where it was existing (though we deleted and re-inserted, so tempId is safer)
        realPaqueteId = null 
      }

      await db.run(
        `INSERT INTO OrdenesEnvasado_Detalle (orden_envasado_id, paquete_envio_id, bolsa_id, estado_grano, cantidad_bolsas, destino_al_completar, lote_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [ordenId, realPaqueteId, d.bolsa_id, d.estado_grano, d.cantidad_bolsas, d.destino_al_completar, d.lote_id]
      )
    }

    await db.run('COMMIT')
    revalidatePath(`/servicios/${data.servicio_id}`)
    return { success: true, ordenId }
  } catch (error: any) {
    await db.run('ROLLBACK')
    return { success: false, error: error.message }
  }
}

export async function updateEstadoOrdenEnvasado(ordenId: number, estado: string) {
  const db = await dbPromise
  try {
    // Only update if not currently 'Completado' or if the user is forcing it, but let's just allow it for now.
    await db.run('UPDATE OrdenesEnvasado SET estado = ? WHERE id = ?', [estado, ordenId])
    revalidatePath('/envasado')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function completeOrdenEnvasado(ordenId: number) {
  const db = await dbPromise
  try {
    await db.run('BEGIN TRANSACTION')

    const orden = await db.get('SELECT * FROM OrdenesEnvasado WHERE id = ?', [ordenId])
    if (!orden || orden.estado === 'Completado') {
      throw new Error('Orden no existe o ya está completada')
    }

    const detalles = await db.all('SELECT * FROM OrdenesEnvasado_Detalle WHERE orden_envasado_id = ?', [ordenId])

    for (const d of detalles) {
      // 1. Deduct from Lotes (coffee stock)
      // We need to know capacity of the bag to know how many kg to deduct
      const bolsa = await db.get('SELECT * FROM CatalogoBolsas WHERE id = ?', [d.bolsa_id])
      if (!bolsa) throw new Error(`Bolsa con ID ${d.bolsa_id} no encontrada`)

      const kg_a_descontar = (bolsa.capacidad_g * d.cantidad_bolsas) / 1000

      // Deduct from the specific state in Lotes
      let colToDeduct = ''
      switch(d.estado_grano.toLowerCase()) {
        case 'pergamino': colToDeduct = 'stock_pergamino'; break;
        case 'oro verde': colToDeduct = 'stock_oro_verde_bruto'; break;
        case 'oro verde seleccionado': colToDeduct = 'stock_oro_verde_seleccionado'; break;
        case 'tostado': colToDeduct = 'stock_tostado'; break;
        case 'molido': colToDeduct = 'stock_tostado'; break; // Treat molido as tostado stock for now, or add stock_molido
        default: colToDeduct = 'stock_tostado';
      }

      await db.run(`UPDATE Lotes SET ${colToDeduct} = ${colToDeduct} - ? WHERE id = ?`, [kg_a_descontar, d.lote_id])
      
      // Log Lote movimiento
      await db.run(`INSERT INTO Lotes_Movimientos (lote_id, tipo_movimiento, tipo_cafe, cantidad, notas) VALUES (?, ?, ?, ?, ?)`,
        [d.lote_id, 'salida', colToDeduct, kg_a_descontar, `Envasado de ${d.cantidad_bolsas} bolsas de ${bolsa.capacidad_g}g`])

      // 2. Deduct from CatalogoBolsas
      await db.run('UPDATE CatalogoBolsas SET stock_disponible = stock_disponible - ? WHERE id = ?', [d.cantidad_bolsas, d.bolsa_id])

      // 3. Add to LotesBolsas if destination is almacen
      if (d.destino_al_completar === 'almacen') {
        const existingLoteBolsa = await db.get('SELECT id FROM LotesBolsas WHERE lote_id = ? AND bolsa_id = ? AND estado_grano = ?', 
          [d.lote_id, d.bolsa_id, d.estado_grano])
        
        if (existingLoteBolsa) {
          await db.run('UPDATE LotesBolsas SET cantidad_en_almacen = cantidad_en_almacen + ? WHERE id = ?', [d.cantidad_bolsas, existingLoteBolsa.id])
        } else {
          await db.run('INSERT INTO LotesBolsas (lote_id, bolsa_id, cantidad_en_almacen, estado_grano) VALUES (?, ?, ?, ?)', 
            [d.lote_id, d.bolsa_id, d.cantidad_bolsas, d.estado_grano])
        }
      }
    }

    await db.run('UPDATE OrdenesEnvasado SET estado = ? WHERE id = ?', ['Completado', ordenId])
    await db.run('COMMIT')
    
    if (orden.servicio_id) revalidatePath(`/servicios/${orden.servicio_id}`)
    revalidatePath('/envasado')
    revalidatePath('/stock')
    return { success: true }
  } catch (error: any) {
    await db.run('ROLLBACK')
    return { success: false, error: error.message }
  }
}

export async function getAllOrdenesEnvasado() {
  const db = await dbPromise
  // Since lote_id is now in detalles, we can just fetch the orders. 
  // We can join with a group_concat to show lotes, or just fetch orders.
  const ordenes = await db.all(`
    SELECT o.*,
           (SELECT GROUP_CONCAT(DISTINCT l.codigo_lote) 
            FROM OrdenesEnvasado_Detalle od 
            JOIN Lotes l ON od.lote_id = l.id 
            WHERE od.orden_envasado_id = o.id) as codigo_lote
    FROM OrdenesEnvasado o
    ORDER BY o.id DESC
  `)
  return ordenes
}

export async function getOrdenEnvasadoById(id: number) {
  const db = await dbPromise
  const orden = await db.get('SELECT * FROM OrdenesEnvasado WHERE id = ?', [id])
  if (!orden) return null

  const paquetes = await db.all('SELECT * FROM PaquetesEnvio WHERE orden_envasado_id = ?', [id])
  const detalles = await db.all(`
    SELECT od.*, l.codigo_lote, l.variedad, l.proceso, l.productor as productor_nombre
    FROM OrdenesEnvasado_Detalle od
    LEFT JOIN Lotes l ON od.lote_id = l.id
    WHERE od.orden_envasado_id = ?
  `, [id])

  return { ...orden, paquetes, detalles }
}
