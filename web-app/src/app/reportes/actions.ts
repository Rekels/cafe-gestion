'use server'

import dbPromise from '@/lib/db'

export interface ReportRow {
  id: string;
  categoria: string;
  fecha: string;
  cliente: string;
  producto: string;
  precio_uni: number;
  cantidad: number;
  total: number;
  op_grava: number;
  igv: number;
  importe_total: number;
  estado: string;
  detalle: string;
}

export async function getReporteVentas(fechaInicio: string, fechaFin: string): Promise<ReportRow[]> {
  try {
    const db = await dbPromise;
    const reportData: ReportRow[] = [];

    // Fechas vienen en formato YYYY-MM-DD
    
    // Obtener todos los servicios que tienen una proforma_id asociada
    const servicios = await db.all(`
      SELECT 
        s.*, 
        p.estado as proforma_estado, 
        p.fecha_emision as proforma_fecha
      FROM Servicios s
      JOIN Proformas p ON s.proforma_id = p.id
    `);

    for (const s of servicios) {
      const cliente = s.cliente;
      const estado = s.proforma_estado?.toUpperCase() || 'DESCONOCIDO';
      const detalle = s.detalle || '';

      // Trillado
      if (s.total_trillado > 0) {
        const fecha = s.fecha_trillado || s.proforma_fecha;
        if (fecha >= fechaInicio && fecha <= fechaFin) {
          const total = s.total_trillado;
          const opGrava = total / 1.18;
          reportData.push({
            id: `S-${s.id}-trillado`,
            categoria: 'SERVICIO TRILLADO',
            fecha,
            cliente,
            producto: 'Servicio trillado',
            precio_uni: s.trillado_precio_kg || 0,
            cantidad: s.pc || 0,
            total: total,
            op_grava: opGrava,
            igv: total - opGrava,
            importe_total: total,
            estado,
            detalle
          });
        }
      }

      // Tueste
      if (s.total_tueste > 0) {
        const fecha = s.fecha_tueste || s.proforma_fecha;
        if (fecha >= fechaInicio && fecha <= fechaFin) {
          const total = s.total_tueste;
          const opGrava = total / 1.18;
          reportData.push({
            id: `S-${s.id}-tueste`,
            categoria: 'SERVICIO TUESTE',
            fecha,
            cliente,
            producto: 'Servicio tueste',
            precio_uni: s.tueste_precio_kg || 0,
            cantidad: s.gc || 0,
            total: total,
            op_grava: opGrava,
            igv: total - opGrava,
            importe_total: total,
            estado,
            detalle
          });
        }
      }

      // Selección
      if (s.total_seleccion > 0) {
        const fecha = s.proforma_fecha;
        if (fecha >= fechaInicio && fecha <= fechaFin) {
          const total = s.total_seleccion;
          const opGrava = total / 1.18;
          const precio = s.seleccion_precio_kg || 0;
          const cant = precio > 0 ? total / precio : 0;
          reportData.push({
            id: `S-${s.id}-seleccion`,
            categoria: 'SERVICIO SELECCIÓN',
            fecha,
            cliente,
            producto: 'Servicio selección',
            precio_uni: precio,
            cantidad: parseFloat(cant.toFixed(2)),
            total: total,
            op_grava: opGrava,
            igv: total - opGrava,
            importe_total: total,
            estado,
            detalle
          });
        }
      }

      // Envasado
      if (s.total_envasado > 0) {
        const fecha = s.proforma_fecha;
        if (fecha >= fechaInicio && fecha <= fechaFin) {
          const total = s.total_envasado;
          const opGrava = total / 1.18;
          reportData.push({
            id: `S-${s.id}-envasado`,
            categoria: 'SERVICIO ENVASADO',
            fecha,
            cliente,
            producto: 'Servicio envasado',
            precio_uni: s.envasado_precio_unidad || 0,
            cantidad: s.envasado_cantidad || 0,
            total: total,
            op_grava: opGrava,
            igv: total - opGrava,
            importe_total: total,
            estado,
            detalle
          });
        }
      }
    }

    // Conceptos Adicionales
    const conceptos = await db.all(`
      SELECT 
        pc.*, 
        p.fecha_emision, 
        p.cliente, 
        p.estado as proforma_estado 
      FROM ProformaConceptos pc
      JOIN Proformas p ON pc.proforma_id = p.id
    `);

    for (const c of conceptos) {
      const fecha = c.fecha_emision;
      if (fecha >= fechaInicio && fecha <= fechaFin) {
        const total = c.total;
        const opGrava = total / 1.18;
        const estado = c.proforma_estado?.toUpperCase() || 'DESCONOCIDO';
        reportData.push({
          id: `C-${c.id}`,
          categoria: 'ADICIONALES',
          fecha,
          cliente: c.cliente,
          producto: c.descripcion,
          precio_uni: c.precio_unitario || 0,
          cantidad: c.cantidad || 0,
          total: total,
          op_grava: opGrava,
          igv: total - opGrava,
          importe_total: total,
          estado,
          detalle: ''
        });
      }
    }

    // Sort by fecha DESC
    reportData.sort((a, b) => {
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    });

    return reportData;
  } catch (error) {
    console.error('Failed to get report:', error);
    throw new Error('Failed to fetch report data');
  }
}
