'use server'

import dbPromise from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function createCliente(formData: FormData) {
  try {
    const nombre = (formData.get('nombre') as string || '').toUpperCase().trim();
    const empresa = (formData.get('empresa') as string || '').toUpperCase().trim() || null;
    const telefono = (formData.get('telefono') as string || '').trim() || null;
    const correo = (formData.get('correo') as string || '').trim() || null;
    const razon_social = (formData.get('razon_social') as string || '').toUpperCase().trim() || null;
    const ruc = (formData.get('ruc') as string || '').trim() || null;
    const abreviatura = (formData.get('abreviatura') as string || '').toUpperCase().trim();

    if (!nombre) return { success: false, error: 'El nombre es requerido.' };
    if (!abreviatura) return { success: false, error: 'La abreviatura es requerida.' };

    const db = await dbPromise;

    // Check duplicate
    const existing = await db.get('SELECT id FROM Clientes WHERE UPPER(nombre) = ?', [nombre]);
    if (existing) return { success: false, error: 'Ya existe un cliente con ese nombre.' };

    await db.run(`
      INSERT INTO Clientes (
        nombre, empresa, telefono, correo, razon_social, ruc, abreviatura
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [nombre, empresa, telefono, correo, razon_social, ruc, abreviatura]);

    revalidatePath('/catalogos');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to create client:', error);
    return { success: false, error: error.message || 'Error al crear cliente.' };
  }
}

export async function updateCliente(formData: FormData) {
  try {
    const id = Number(formData.get('id'));
    const nombre = (formData.get('nombre') as string || '').toUpperCase().trim();
    const empresa = (formData.get('empresa') as string || '').toUpperCase().trim() || null;
    const telefono = (formData.get('telefono') as string || '').trim() || null;
    const correo = (formData.get('correo') as string || '').trim() || null;
    const razon_social = (formData.get('razon_social') as string || '').toUpperCase().trim() || null;
    const ruc = (formData.get('ruc') as string || '').trim() || null;
    const abreviatura = (formData.get('abreviatura') as string || '').toUpperCase().trim();

    if (!nombre) return { success: false, error: 'El nombre es requerido.' };
    if (!abreviatura) return { success: false, error: 'La abreviatura es requerida.' };

    const db = await dbPromise;
    
    // Check if the name changed to handle cascade updates
    const oldClient = await db.get('SELECT nombre FROM Clientes WHERE id = ?', [id]);
    if (oldClient && oldClient.nombre !== nombre) {
      // Cascade update to keep data integrity
      await db.run('UPDATE Servicios SET cliente = ? WHERE UPPER(cliente) = ?', [nombre, oldClient.nombre.toUpperCase()]);
      await db.run('UPDATE SesionesTueste SET cliente = ? WHERE UPPER(cliente) = ?', [nombre, oldClient.nombre.toUpperCase()]);
      await db.run('UPDATE OrdenesTueste SET cliente = ? WHERE UPPER(cliente) = ?', [nombre, oldClient.nombre.toUpperCase()]);
      await db.run('UPDATE Tuestes SET cliente = ? WHERE UPPER(cliente) = ?', [nombre, oldClient.nombre.toUpperCase()]);
      await db.run('UPDATE Proformas SET cliente = ? WHERE UPPER(cliente) = ?', [nombre, oldClient.nombre.toUpperCase()]);
    }

    await db.run(`
      UPDATE Clientes SET 
        nombre = ?, 
        empresa = ?,
        telefono = ?, 
        correo = ?,
        razon_social = ?,
        ruc = ?,
        abreviatura = ?
      WHERE id = ?
    `, [nombre, empresa, telefono, correo, razon_social, ruc, abreviatura, id]);
    
    revalidatePath('/catalogos');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update client:', error);
    return { success: false, error: error.message || 'Error al actualizar cliente.' };
  }
}

export async function deleteCliente(id: number) {
  try {
    const db = await dbPromise;
    const client = await db.get('SELECT nombre FROM Clientes WHERE id = ?', [id]);
    if (!client) return { success: false, error: 'Cliente no encontrado.' };

    const clientUpper = client.nombre.toUpperCase();

    // Check references in Servicios or Proformas
    const inServicios = await db.get('SELECT id FROM Servicios WHERE UPPER(cliente) = ? LIMIT 1', [clientUpper]);
    const inProformas = await db.get('SELECT id FROM Proformas WHERE UPPER(cliente) = ? LIMIT 1', [clientUpper]);

    if (inServicios || inProformas) {
      return { 
        success: false, 
        error: 'No se puede eliminar el cliente porque tiene servicios o proformas asociadas.' 
      };
    }

    await db.run('DELETE FROM Clientes WHERE id = ?', [id]);
    revalidatePath('/catalogos');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete client:', error);
    return { success: false, error: error.message || 'Error al eliminar cliente.' };
  }
}

export async function updateClienteTarifas(id: number, tarifas: Record<string, number | null>) {
  try {
    const db = await dbPromise;
    await db.run(`
      UPDATE Clientes SET 
        default_trillado_precio_kg = ?,
        default_seleccion_precio_kg = ?,
        default_tueste_precio_kg = ?,
        default_molienda_precio_kg = ?,
        default_envasado_precio_unidad = ?
      WHERE id = ?
    `, [
      tarifas.default_trillado_precio_kg,
      tarifas.default_seleccion_precio_kg,
      tarifas.default_tueste_precio_kg,
      tarifas.default_molienda_precio_kg,
      tarifas.default_envasado_precio_unidad,
      id
    ]);
    
    revalidatePath('/catalogos');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update client rates:', error);
    return { success: false, error: 'Error al actualizar tarifas.' };
  }
}
