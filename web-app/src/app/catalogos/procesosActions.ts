'use server'

import dbPromise from '@/lib/db'
import { revalidatePath } from 'next/cache'

export interface Proceso {
  id: number
  nombre: string
  abreviatura: string
}

export async function getProcesos(): Promise<Proceso[]> {
  try {
    const db = await dbPromise;
    return await db.all('SELECT * FROM Procesos ORDER BY nombre ASC');
  } catch (error) {
    console.error('Failed to get procesos:', error);
    return [];
  }
}

export async function createProceso(formData: FormData) {
  try {
    const nombre = (formData.get('nombre') as string || '').toUpperCase().trim();
    const abreviatura = (formData.get('abreviatura') as string || '').toUpperCase().trim();

    if (!nombre) return { success: false, error: 'El nombre es requerido.' };
    if (!abreviatura) return { success: false, error: 'La abreviatura es requerida.' };

    const db = await dbPromise;
    
    // Check if duplicate name
    const existing = await db.get('SELECT id FROM Procesos WHERE UPPER(nombre) = ?', [nombre]);
    if (existing) {
      return { success: false, error: 'Ya existe un proceso con ese nombre.' };
    }

    await db.run(
      'INSERT INTO Procesos (nombre, abreviatura) VALUES (?, ?)',
      [nombre, abreviatura]
    );

    revalidatePath('/catalogos');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to create proceso:', error);
    return { success: false, error: error.message || 'Error al crear el proceso.' };
  }
}

export async function updateProceso(formData: FormData) {
  try {
    const id = Number(formData.get('id'));
    const nombre = (formData.get('nombre') as string || '').toUpperCase().trim();
    const abreviatura = (formData.get('abreviatura') as string || '').toUpperCase().trim();

    if (!nombre) return { success: false, error: 'El nombre es requerido.' };
    if (!abreviatura) return { success: false, error: 'La abreviatura es requerida.' };

    const db = await dbPromise;
    
    // Check if name conflicts with another process
    const duplicate = await db.get('SELECT id FROM Procesos WHERE UPPER(nombre) = ? AND id != ?', [nombre, id]);
    if (duplicate) {
      return { success: false, error: 'Ya existe otro proceso con ese nombre.' };
    }

    const oldProc = await db.get('SELECT nombre FROM Procesos WHERE id = ?', [id]);
    if (oldProc && oldProc.nombre !== nombre) {
      // Update linked values
      await db.run('UPDATE Lotes SET proceso = ? WHERE UPPER(proceso) = ?', [nombre, oldProc.nombre.toUpperCase()]);
      await db.run('UPDATE Servicios SET proceso = ? WHERE UPPER(proceso) = ?', [nombre, oldProc.nombre.toUpperCase()]);
      await db.run('UPDATE SesionesTueste SET proceso = ? WHERE UPPER(proceso) = ?', [nombre, oldProc.nombre.toUpperCase()]);
      await db.run('UPDATE OrdenesTueste SET proceso = ? WHERE UPPER(proceso) = ?', [nombre, oldProc.nombre.toUpperCase()]);
      await db.run('UPDATE Tuestes SET proceso = ? WHERE UPPER(proceso) = ?', [nombre, oldProc.nombre.toUpperCase()]);
    }

    await db.run(
      'UPDATE Procesos SET nombre = ?, abreviatura = ? WHERE id = ?',
      [nombre, abreviatura, id]
    );

    revalidatePath('/catalogos');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update proceso:', error);
    return { success: false, error: error.message || 'Error al actualizar el proceso.' };
  }
}

export async function deleteProceso(id: number) {
  try {
    const db = await dbPromise;
    const proceso = await db.get('SELECT nombre FROM Procesos WHERE id = ?', [id]);
    if (!proceso) return { success: false, error: 'Proceso no encontrado.' };

    const nameUpper = proceso.nombre.toUpperCase();

    // Check references in Lotes or Servicios
    const inLotes = await db.get('SELECT id FROM Lotes WHERE UPPER(proceso) = ? LIMIT 1', [nameUpper]);
    const inServicios = await db.get('SELECT id FROM Servicios WHERE UPPER(proceso) = ? LIMIT 1', [nameUpper]);

    if (inLotes || inServicios) {
      return { 
        success: false, 
        error: 'No se puede eliminar el proceso porque tiene lotes o servicios de café asociados.' 
      };
    }

    await db.run('DELETE FROM Procesos WHERE id = ?', [id]);
    
    revalidatePath('/catalogos');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete proceso:', error);
    return { success: false, error: error.message || 'Error al eliminar el proceso.' };
  }
}
