'use server'

import dbPromise from '@/lib/db'
import { revalidatePath } from 'next/cache'

export interface Productor {
  id: number
  nombre: string
  telefono: string | null
  notas: string | null
  abreviatura: string
}

export async function getProductores(): Promise<Productor[]> {
  try {
    const db = await dbPromise;
    return await db.all('SELECT * FROM Productores ORDER BY nombre ASC');
  } catch (error) {
    console.error('Failed to get productores:', error);
    return [];
  }
}

export async function createProductor(formData: FormData) {
  try {
    const nombre = (formData.get('nombre') as string || '').toUpperCase().trim();
    const telefono = (formData.get('telefono') as string || '').trim() || null;
    const notas = (formData.get('notas') as string || '').trim() || null;
    const abreviatura = (formData.get('abreviatura') as string || '').toUpperCase().trim();

    if (!nombre) return { success: false, error: 'El nombre es requerido.' };
    if (!abreviatura) return { success: false, error: 'La abreviatura es requerida.' };

    const db = await dbPromise;
    
    // Check if duplicate name
    const existing = await db.get('SELECT id FROM Productores WHERE UPPER(nombre) = ?', [nombre]);
    if (existing) {
      return { success: false, error: 'Ya existe un productor con ese nombre.' };
    }

    await db.run(
      'INSERT INTO Productores (nombre, telefono, notas, abreviatura) VALUES (?, ?, ?, ?)',
      [nombre, telefono, notas, abreviatura]
    );

    revalidatePath('/catalogos');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to create productor:', error);
    return { success: false, error: error.message || 'Error al crear productor.' };
  }
}

export async function updateProductor(formData: FormData) {
  try {
    const id = Number(formData.get('id'));
    const nombre = (formData.get('nombre') as string || '').toUpperCase().trim();
    const telefono = (formData.get('telefono') as string || '').trim() || null;
    const notas = (formData.get('notas') as string || '').trim() || null;
    const abreviatura = (formData.get('abreviatura') as string || '').toUpperCase().trim();

    if (!nombre) return { success: false, error: 'El nombre es requerido.' };
    if (!abreviatura) return { success: false, error: 'La abreviatura es requerida.' };

    const db = await dbPromise;
    
    // Check if new name conflicts with another productor
    const duplicate = await db.get('SELECT id FROM Productores WHERE UPPER(nombre) = ? AND id != ?', [nombre, id]);
    if (duplicate) {
      return { success: false, error: 'Ya existe otro productor con ese nombre.' };
    }

    const oldProductor = await db.get('SELECT nombre FROM Productores WHERE id = ?', [id]);
    if (oldProductor && oldProductor.nombre !== nombre) {
      // Cascade update to keep data integrity
      await db.run('UPDATE Lotes SET productor = ? WHERE UPPER(productor) = ?', [nombre, oldProductor.nombre.toUpperCase()]);
      await db.run('UPDATE Servicios SET productor = ? WHERE UPPER(productor) = ?', [nombre, oldProductor.nombre.toUpperCase()]);
      await db.run('UPDATE SesionesTueste SET productor = ? WHERE UPPER(productor) = ?', [nombre, oldProductor.nombre.toUpperCase()]);
      await db.run('UPDATE OrdenesTueste SET productor = ? WHERE UPPER(productor) = ?', [nombre, oldProductor.nombre.toUpperCase()]);
      await db.run('UPDATE Tuestes SET productor = ? WHERE UPPER(productor) = ?', [nombre, oldProductor.nombre.toUpperCase()]);
    }

    await db.run(
      'UPDATE Productores SET nombre = ?, telefono = ?, notas = ?, abreviatura = ? WHERE id = ?',
      [nombre, telefono, notas, abreviatura, id]
    );

    revalidatePath('/catalogos');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update productor:', error);
    return { success: false, error: error.message || 'Error al actualizar productor.' };
  }
}

export async function deleteProductor(id: number) {
  try {
    const db = await dbPromise;
    const productor = await db.get('SELECT nombre FROM Productores WHERE id = ?', [id]);
    if (!productor) return { success: false, error: 'Productor no encontrado.' };

    const nameUpper = productor.nombre.toUpperCase();

    // Check references
    const inLotes = await db.get('SELECT id FROM Lotes WHERE UPPER(productor) = ? LIMIT 1', [nameUpper]);
    const inServicios = await db.get('SELECT id FROM Servicios WHERE UPPER(productor) = ? LIMIT 1', [nameUpper]);

    if (inLotes || inServicios) {
      return { 
        success: false, 
        error: 'No se puede eliminar el productor porque tiene lotes o servicios de café asociados.' 
      };
    }

    await db.run('DELETE FROM Productores WHERE id = ?', [id]);
    
    revalidatePath('/catalogos');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete productor:', error);
    return { success: false, error: error.message || 'Error al eliminar productor.' };
  }
}
