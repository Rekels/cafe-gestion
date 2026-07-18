'use server'

import dbPromise from '@/lib/db'
import { revalidatePath } from 'next/cache'

export interface Equipo {
  id: number
  nombre: string
  tipo: string
  capacidad_kg: number | null
  notas: string | null
  activo: number
  default_temp_ts?: number | null
  default_temp_fc?: number | null
  default_temp_end?: number | null
}

export async function getEquipos(): Promise<Equipo[]> {
  const db = await dbPromise
  return db.all<Equipo[]>('SELECT * FROM Equipos ORDER BY nombre ASC')
}

export async function createEquipo(formData: FormData) {
  try {
    const db = await dbPromise

    const nombre = (formData.get('nombre') as string)?.trim()
    if (!nombre) {
      return { success: false, error: 'El nombre es obligatorio' }
    }

    const tipo = (formData.get('tipo') as string) || 'tostadora'
    const capacidad_kg = formData.get('capacidad_kg') ? Number(formData.get('capacidad_kg')) : null
    const notas = (formData.get('notas') as string)?.trim() || null

    const default_temp_ts = formData.get('default_temp_ts') ? Number(formData.get('default_temp_ts')) : null
    const default_temp_fc = formData.get('default_temp_fc') ? Number(formData.get('default_temp_fc')) : null
    const default_temp_end = formData.get('default_temp_end') ? Number(formData.get('default_temp_end')) : null

    await db.run(
      'INSERT INTO Equipos (nombre, tipo, capacidad_kg, notas, activo, default_temp_ts, default_temp_fc, default_temp_end) VALUES (?, ?, ?, ?, 1, ?, ?, ?)',
      [nombre, tipo, capacidad_kg, notas, default_temp_ts, default_temp_fc, default_temp_end]
    )

    revalidatePath('/equipos')
    return { success: true }
  } catch (error) {
    console.error('Failed to create equipo:', error)
    return { success: false, error: 'Error al crear el equipo' }
  }
}

export async function updateEquipo(id: number, formData: FormData) {
  try {
    const db = await dbPromise

    const nombre = (formData.get('nombre') as string)?.trim()
    if (!nombre) {
      return { success: false, error: 'El nombre es obligatorio' }
    }

    const tipo = (formData.get('tipo') as string) || 'tostadora'
    const capacidad_kg = formData.get('capacidad_kg') ? Number(formData.get('capacidad_kg')) : null
    const notas = (formData.get('notas') as string)?.trim() || null

    const default_temp_ts = formData.get('default_temp_ts') ? Number(formData.get('default_temp_ts')) : null
    const default_temp_fc = formData.get('default_temp_fc') ? Number(formData.get('default_temp_fc')) : null
    const default_temp_end = formData.get('default_temp_end') ? Number(formData.get('default_temp_end')) : null

    await db.run(
      'UPDATE Equipos SET nombre = ?, tipo = ?, capacidad_kg = ?, notas = ?, default_temp_ts = ?, default_temp_fc = ?, default_temp_end = ? WHERE id = ?',
      [nombre, tipo, capacidad_kg, notas, default_temp_ts, default_temp_fc, default_temp_end, id]
    )

    revalidatePath('/equipos')
    return { success: true }
  } catch (error) {
    console.error('Failed to update equipo:', error)
    return { success: false, error: 'Error al actualizar el equipo' }
  }
}

export async function toggleEquipoActivo(id: number, activo: boolean) {
  try {
    const db = await dbPromise

    await db.run(
      'UPDATE Equipos SET activo = ? WHERE id = ?',
      [activo ? 1 : 0, id]
    )

    revalidatePath('/equipos')
    return { success: true }
  } catch (error) {
    console.error('Failed to toggle equipo:', error)
    return { success: false, error: 'Error al cambiar el estado' }
  }
}

export async function deleteEquipo(id: number) {
  try {
    const db = await dbPromise

    // Check if the equipo is referenced by any session
    const ref = await db.get(
      'SELECT COUNT(*) as count FROM SesionesTueste WHERE equipo_id = ?',
      [id]
    )

    if (ref && ref.count > 0) {
      return {
        success: false,
        error: `No se puede eliminar: el equipo está referenciado en ${ref.count} sesión(es) de tueste`
      }
    }

    await db.run('DELETE FROM Equipos WHERE id = ?', [id])

    revalidatePath('/equipos')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete equipo:', error)
    return { success: false, error: 'Error al eliminar el equipo' }
  }
}
