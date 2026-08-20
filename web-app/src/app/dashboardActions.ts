'use server'

import dbPromise from '@/lib/db'
import { getReporteVentas } from '@/app/reportes/actions'

export interface DashboardData {
  ventasTotales: number;
  ticketPromedio: number;
  ventasPorDia: { date: string; total: number }[];
  ticketPorDia: { date: string; promedio: number }[];
  productosMasVendidos: { name: string; value: number }[];
  categoriasMasVendidas: { name: string; value: number }[];
  estadoProformas: { name: string; value: number }[];
  topClientes: { name: string; total: number }[];
}

export async function getDashboardData(fechaInicio: string, fechaFin: string): Promise<DashboardData> {
  try {
    const reportes = await getReporteVentas(fechaInicio, fechaFin);
    const db = await dbPromise;

    // Obtener proformas únicas en el rango para calcular el ticket promedio real
    // (cada proforma es un ticket)
    const proformasUnicas = await db.all(`
      SELECT id, total, fecha_emision, estado, cliente 
      FROM Proformas 
      WHERE fecha_emision >= ? AND fecha_emision <= ?
    `, [fechaInicio, fechaFin]);

    const numProformas = proformasUnicas.length;
    const ventasTotales = proformasUnicas.reduce((acc, p) => acc + p.total, 0);
    const ticketPromedio = numProformas > 0 ? ventasTotales / numProformas : 0;

    // Agrupación por día para ventas totales y tickets
    const ventasPorDiaMap = new Map<string, { total: number; count: number }>();
    proformasUnicas.forEach(p => {
      const date = p.fecha_emision;
      const current = ventasPorDiaMap.get(date) || { total: 0, count: 0 };
      ventasPorDiaMap.set(date, { 
        total: current.total + p.total, 
        count: current.count + 1 
      });
    });

    const ventasPorDia = Array.from(ventasPorDiaMap.entries())
      .map(([date, data]) => ({ date, total: data.total }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const ticketPorDia = Array.from(ventasPorDiaMap.entries())
      .map(([date, data]) => ({ date, promedio: data.count > 0 ? data.total / data.count : 0 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Estado Proformas (Donut)
    const estadoMap = new Map<string, number>();
    proformasUnicas.forEach(p => {
      const st = p.estado?.toUpperCase() || 'DESCONOCIDO';
      estadoMap.set(st, (estadoMap.get(st) || 0) + p.total);
    });
    const estadoProformas = Array.from(estadoMap.entries()).map(([name, value]) => ({ name, value }));

    // Productos y Categorías (Usando getReporteVentas para el nivel de detalle)
    const prodMap = new Map<string, number>();
    const catMap = new Map<string, number>();
    const clientMap = new Map<string, number>();

    reportes.forEach(r => {
      // Agrupación para Productos
      prodMap.set(r.producto, (prodMap.get(r.producto) || 0) + r.total);
      // Agrupación para Categorías
      catMap.set(r.categoria, (catMap.get(r.categoria) || 0) + r.total);
    });

    proformasUnicas.forEach(p => {
      // Clientes Top (basado en el total facturado)
      clientMap.set(p.cliente, (clientMap.get(p.cliente) || 0) + p.total);
    });

    const productosMasVendidos = Array.from(prodMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5

    const categoriasMasVendidas = Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const topClientes = Array.from(clientMap.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      ventasTotales,
      ticketPromedio,
      ventasPorDia,
      ticketPorDia,
      productosMasVendidos,
      categoriasMasVendidas,
      estadoProformas,
      topClientes
    };
  } catch (error) {
    console.error('Failed to get dashboard data:', error);
    throw new Error('Failed to fetch dashboard data');
  }
}
