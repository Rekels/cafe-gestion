'use server'

import dbPromise from '@/lib/db'
import { revalidatePath } from 'next/cache'

export interface Variedad {
  id: number
  nombre: string
  abreviatura: string
}

export async function getVariedades(): Promise<Variedad[]> {
  try {
    const db = await dbPromise;
    return await db.all('SELECT * FROM Variedades ORDER BY nombre ASC');
  } catch (error) {
    console.error('Failed to get variedades:', error);
    return [];
  }
}

export async function createVariedad(formData: FormData) {
  try {
    const nombre = (formData.get('nombre') as string || '').toUpperCase().trim();
    const abreviatura = (formData.get('abreviatura') as string || '').toUpperCase().trim();

    if (!nombre) return { success: false, error: 'El nombre es requerido.' };
    if (!abreviatura) return { success: false, error: 'La abreviatura es requerida.' };

    const db = await dbPromise;
    
    // Check if duplicate name
    const existing = await db.get('SELECT id FROM Variedades WHERE UPPER(nombre) = ?', [nombre]);
    if (existing) {
      return { success: false, error: 'Ya existe una variedad con ese nombre.' };
    }

    await db.run(
      'INSERT INTO Variedades (nombre, abreviatura) VALUES (?, ?)',
      [nombre, abreviatura]
    );

    revalidatePath('/catalogos');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to create variedad:', error);
    return { success: false, error: error.message || 'Error al crear la variedad.' };
  }
}

export async function updateVariedad(formData: FormData) {
  try {
    const id = Number(formData.get('id'));
    const nombre = (formData.get('nombre') as string || '').toUpperCase().trim();
    const abreviatura = (formData.get('abreviatura') as string || '').toUpperCase().trim();

    if (!nombre) return { success: false, error: 'El nombre es requerido.' };
    if (!abreviatura) return { success: false, error: 'La abreviatura es requerida.' };

    const db = await dbPromise;
    
    // Check if name conflicts with another variety
    const duplicate = await db.get('SELECT id FROM Variedades WHERE UPPER(nombre) = ? AND id != ?', [nombre, id]);
    if (duplicate) {
      return { success: false, error: 'Ya existe otra variedad con ese nombre.' };
    }

    const oldVar = await db.get('SELECT nombre FROM Variedades WHERE id = ?', [id]);
    if (oldVar && oldVar.nombre !== nombre) {
      // Update linked values
      await db.run('UPDATE Lotes SET variedad = ? WHERE UPPER(variedad) = ?', [nombre, oldVar.nombre.toUpperCase()]);
      await db.run('UPDATE Servicios SET variedad = ? WHERE UPPER(variedad) = ?', [nombre, oldVar.nombre.toUpperCase()]);
      await db.run('UPDATE SesionesTueste SET variedad = ? WHERE UPPER(variedad) = ?', [nombre, oldVar.nombre.toUpperCase()]);
      await db.run('UPDATE OrdenesTueste SET variedad = ? WHERE UPPER(variedad) = ?', [nombre, oldVar.nombre.toUpperCase()]);
      await db.run('UPDATE Tuestes SET variedad = ? WHERE UPPER(variedad) = ?', [nombre, oldVar.nombre.toUpperCase()]);
    }

    await db.run(
      'UPDATE Variedades SET nombre = ?, abreviatura = ? WHERE id = ?',
      [nombre, abreviatura, id]
    );

    revalidatePath('/catalogos');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update variedad:', error);
    return { success: false, error: error.message || 'Error al actualizar la variedad.' };
  }
}

export async function deleteVariedad(id: number) {
  try {
    const db = await dbPromise;
    const variedad = await db.get('SELECT nombre FROM Variedades WHERE id = ?', [id]);
    if (!variedad) return { success: false, error: 'Variedad no encontrada.' };

    const nameUpper = variedad.nombre.toUpperCase();

    // Check references in Lotes or Servicios
    const inLotes = await db.get('SELECT id FROM Lotes WHERE UPPER(variedad) = ? LIMIT 1', [nameUpper]);
    const inServicios = await db.get('SELECT id FROM Servicios WHERE UPPER(variedad) = ? LIMIT 1', [nameUpper]);

    if (inLotes || inServicios) {
      return { 
        success: false, 
        error: 'No se puede eliminar la variedad porque tiene lotes o servicios de café asociados.' 
      };
    }

    await db.run('DELETE FROM Variedades WHERE id = ?', [id]);
    
    revalidatePath('/catalogos');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete variedad:', error);
    return { success: false, error: error.message || 'Error al eliminar la variedad.' };
  }
}
