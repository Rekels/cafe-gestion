'use server'

import dbPromise from '@/lib/db'
import { revalidatePath } from 'next/cache'

export interface Bolsa {
  id: number
  nombre: string
  capacidad_g: number
  tipo_material: string | null
  stock_disponible: number
  precio_costo: number | null
}

export async function createBolsa(formData: FormData) {
  try {
    const db = await dbPromise

    const nombre = formData.get('nombre') as string
    const capacidad_g = Number(formData.get('capacidad_g'))
    const tipo_material = formData.get('tipo_material') as string || null
    const stock_disponible = Number(formData.get('stock_disponible') || 0)
    const precio_costo = formData.get('precio_costo') ? Number(formData.get('precio_costo')) : null

    await db.run(
      `INSERT INTO CatalogoBolsas (nombre, capacidad_g, tipo_material, stock_disponible, precio_costo)
       VALUES (?, ?, ?, ?, ?)`,
      [nombre, capacidad_g, tipo_material, stock_disponible, precio_costo]
    )

    revalidatePath('/catalogos')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateBolsa(formData: FormData) {
  try {
    const db = await dbPromise

    const id = Number(formData.get('id'))
    const nombre = formData.get('nombre') as string
    const capacidad_g = Number(formData.get('capacidad_g'))
    const tipo_material = formData.get('tipo_material') as string || null
    const stock_disponible = Number(formData.get('stock_disponible') || 0)
    const precio_costo = formData.get('precio_costo') ? Number(formData.get('precio_costo')) : null

    await db.run(
      `UPDATE CatalogoBolsas 
       SET nombre = ?, capacidad_g = ?, tipo_material = ?, stock_disponible = ?, precio_costo = ?
       WHERE id = ?`,
      [nombre, capacidad_g, tipo_material, stock_disponible, precio_costo, id]
    )

    revalidatePath('/catalogos')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteBolsa(id: number) {
  try {
    const db = await dbPromise
    // Wait, if it is used in LotesBolsas or OrdenesEnvasado_Detalle, deletion might fail due to FK.
    // Let's rely on standard sqlite behavior or catch the constraint error.
    await db.run('DELETE FROM CatalogoBolsas WHERE id = ?', [id])
    revalidatePath('/catalogos')
    return { success: true }
  } catch (error: any) {
    if (error.message.includes('FOREIGN KEY')) {
      return { success: false, error: 'No se puede eliminar la bolsa porque está siendo utilizada en el inventario o en una orden de envasado.' }
    }
    return { success: false, error: error.message }
  }
}
