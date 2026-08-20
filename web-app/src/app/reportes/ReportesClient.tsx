'use client'

import { useState, useEffect, useMemo } from 'react'
import { getReporteVentas, ReportRow } from './actions'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import DatePicker from 'react-datepicker'

export default function ReportesClient() {
  const [data, setData] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fechaInicio, setFechaInicio] = useState<Date>(new Date(new Date().setMonth(new Date().getMonth() - 1)))
  const [fechaFin, setFechaFin] = useState<Date>(new Date())
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')

  useEffect(() => {
    fetchData()
  }, [fechaInicio, fechaFin]) // Refetch if dates change

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getReporteVentas(format(fechaInicio, 'yyyy-MM-dd'), format(fechaFin, 'yyyy-MM-dd'))
      setData(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: number) => {
    return `S/ ${val.toFixed(2)}`
  }

  const filteredData = useMemo(() => {
    return data.filter(row => {
      const matchCliente = row.cliente.toLowerCase().includes(filtroCliente.toLowerCase())
      const matchCategoria = filtroCategoria === '' || row.categoria.toLowerCase() === filtroCategoria.toLowerCase()
      return matchCliente && matchCategoria
    })
  }, [data, filtroCliente, filtroCategoria])

  const exportToExcel = () => {
    if (filteredData.length === 0) return;
    
    const wsData = filteredData.map(row => ({
      'CATEGORÍA': row.categoria,
      'Fecha': row.fecha,
      'CLIENTE': row.cliente,
      'PRODUCTO': row.producto,
      'PRECIO UNI': formatCurrency(row.precio_uni),
      'CANTIDAD': row.cantidad,
      'TOTAL': formatCurrency(row.total),
      'Op. Grava': formatCurrency(row.op_grava),
      'IGV': formatCurrency(row.igv),
      'IMPORTE TOTAL': formatCurrency(row.importe_total),
      'ESTADO': row.estado,
      'DETALLE': row.detalle,
    }))

    const ws = XLSX.utils.json_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Resumen")
    XLSX.writeFile(wb, `Reporte_${format(fechaInicio, 'yyyy-MM-dd')}_a_${format(fechaFin, 'yyyy-MM-dd')}.xlsx`)
  }

  const categoriasUnicas = useMemo(() => {
    const cats = new Set(data.map(d => d.categoria))
    return Array.from(cats)
  }, [data])

  return (
    <div className="p-6 max-w-[1600px] mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Reporte de Ventas</h1>
          <p className="text-gray-400 mt-1">Resumen exportable de servicios y adicionales</p>
        </div>
        
        <button
          onClick={exportToExcel}
          disabled={filteredData.length === 0 || loading}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Exportar Excel
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8 backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Fecha Inicio</label>
            <DatePicker
              selected={fechaInicio}
              onChange={(date: Date | null) => date && setFechaInicio(date)}
              dateFormat="dd/MM/yyyy"
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#c2a077] cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Fecha Fin</label>
            <DatePicker
              selected={fechaFin}
              onChange={(date: Date | null) => date && setFechaFin(date)}
              dateFormat="dd/MM/yyyy"
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#c2a077] cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Cliente</label>
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[#c2a077] focus:border-transparent transition-all outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Categoría</label>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[#c2a077] focus:border-transparent transition-all outline-none appearance-none"
            >
              <option value="">Todas las categorías</option>
              {categoriasUnicas.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-[#1a120b]/50 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 uppercase bg-black/20 border-b border-white/10">
              <tr>
                <th className="px-4 py-4 font-semibold">Categoría</th>
                <th className="px-4 py-4 font-semibold whitespace-nowrap">Fecha</th>
                <th className="px-4 py-4 font-semibold">Cliente</th>
                <th className="px-4 py-4 font-semibold">Producto/Servicio</th>
                <th className="px-4 py-4 font-semibold text-right whitespace-nowrap">Precio Uni</th>
                <th className="px-4 py-4 font-semibold text-right">Cant.</th>
                <th className="px-4 py-4 font-semibold text-right">Total</th>
                <th className="px-4 py-4 font-semibold text-right whitespace-nowrap">Op. Grava</th>
                <th className="px-4 py-4 font-semibold text-right">IGV</th>
                <th className="px-4 py-4 font-semibold text-right whitespace-nowrap">Importe Total</th>
                <th className="px-4 py-4 font-semibold text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-[#c2a077] border-t-transparent rounded-full animate-spin" />
                      Cargando datos...
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                    No se encontraron registros para los filtros seleccionados
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => (
                  <tr key={row.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-gray-300 font-medium whitespace-nowrap">
                      {row.categoria}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{row.fecha}</td>
                    <td className="px-4 py-3 text-gray-300">{row.cliente}</td>
                    <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate" title={row.producto}>
                      {row.producto}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-right font-mono">
                      {formatCurrency(row.precio_uni)}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-right font-mono">
                      {row.cantidad}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-right font-mono">
                      {formatCurrency(row.total)}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-right font-mono">
                      {formatCurrency(row.op_grava)}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-right font-mono">
                      {formatCurrency(row.igv)}
                    </td>
                    <td className="px-4 py-3 text-[#c2a077] font-bold text-right font-mono">
                      {formatCurrency(row.importe_total)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        row.estado === 'PAGADA' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                        row.estado === 'BORRADOR' ? 'bg-gray-500/20 text-gray-400 border border-gray-500/20' :
                        'bg-red-500/20 text-red-400 border border-red-500/20'
                      }`}>
                        {row.estado}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
