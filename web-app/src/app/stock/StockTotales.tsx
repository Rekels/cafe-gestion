'use client'

import React, { useState, useMemo } from 'react'

export default function StockTotales({ totales }: { totales: any[] }) {
  const [selectedPropietario, setSelectedPropietario] = useState('')
  const [selectedEstado, setSelectedEstado] = useState('')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc' | 'none'>('none')

  const propietarioOptions = useMemo(() => {
    const values = totales.map(t => t.propietario).filter(Boolean)
    return Array.from(new Set(values)).sort() as string[]
  }, [totales])

  const estadoOptions = useMemo(() => {
    const values = totales.map(t => t.estado_actual).filter(Boolean)
    return Array.from(new Set(values)).sort() as string[]
  }, [totales])

  const filteredTotales = useMemo(() => {
    return totales.filter(t => {
      if (selectedPropietario && (t.propietario || '').toUpperCase() !== selectedPropietario.toUpperCase()) return false
      if (selectedEstado && (t.estado_actual || '').toUpperCase() !== selectedEstado.toUpperCase()) return false
      return true
    })
  }, [totales, selectedPropietario, selectedEstado])

  const sortedTotales = useMemo(() => {
    let sorted = [...filteredTotales];
    if (sortOrder === 'asc') {
      sorted.sort((a, b) => Number(a.total_kg) - Number(b.total_kg));
    } else if (sortOrder === 'desc') {
      sorted.sort((a, b) => Number(b.total_kg) - Number(a.total_kg));
    }
    return sorted;
  }, [filteredTotales, sortOrder]);

  const totalKilos = filteredTotales.reduce((sum, t) => sum + (Number(t.total_kg) || 0), 0)
  const totalContenedores = filteredTotales.reduce((sum, t) => sum + (Number(t.cantidad_contenedores) || 0), 0)

  if (!totales || totales.length === 0) return null;

  return (
    <div className="bg-[#1a120b]/45 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] space-y-4 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <h2 className="text-lg font-bold text-[#c2a077] uppercase tracking-wider">
            Resumen Global de Inventario
          </h2>
        </div>
        
        <div className="flex gap-2">
          <select
            value={selectedPropietario}
            onChange={e => setSelectedPropietario(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077] uppercase"
          >
            <option value="">-- Todos los Clientes --</option>
            {propietarioOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <select
            value={selectedEstado}
            onChange={e => setSelectedEstado(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077] uppercase"
          >
            <option value="">-- Todos los Estados --</option>
            {estadoOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-white/5 text-[#c2a077] text-[10px] tracking-wider uppercase">
              <th className="p-3 font-semibold rounded-tl-lg">Propietario</th>
              <th className="p-3 font-semibold">Variedad</th>
              <th className="p-3 font-semibold">Productor</th>
              <th className="p-3 font-semibold">Proceso</th>
              <th className="p-3 font-semibold text-center">Estado Físico</th>
              <th className="p-3 font-semibold text-center">N° Contenedores</th>
              <th 
                className="p-3 font-semibold text-right rounded-tr-lg text-white cursor-pointer hover:bg-white/10 transition-colors select-none"
                onClick={() => {
                  setSortOrder(prev => prev === 'none' ? 'desc' : prev === 'desc' ? 'asc' : 'none');
                }}
              >
                Total (kg) {sortOrder === 'desc' ? '↓' : sortOrder === 'asc' ? '↑' : ''}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sortedTotales.map((t, i) => (
              <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-3 text-sm font-medium text-gray-200">{t.propietario}</td>
                <td className="p-3 text-xs text-gray-400">
                  <span className="inline-flex px-2 py-0.5 rounded bg-[#c2a077]/10 text-[#c2a077] uppercase font-bold">
                    {t.variedad || 'S/V'}
                  </span>
                </td>
                <td className="p-3 text-xs text-gray-300">{t.productor || '-'}</td>
                <td className="p-3 text-xs text-gray-400">{t.proceso || '-'}</td>
                <td className="p-3 text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/5 border border-white/10 text-gray-300">
                    {t.estado_actual}
                  </span>
                </td>
                <td className="p-3 text-center text-sm font-mono text-gray-400">
                  {t.cantidad_contenedores}
                </td>
                <td className="p-3 text-right font-mono font-bold text-white bg-white/[0.01]">
                  {Number(t.total_kg).toFixed(2)} kg
                </td>
              </tr>
            ))}
            {filteredTotales.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400">
                  No se encontraron resultados con los filtros actuales.
                </td>
              </tr>
            )}
            {/* Total Row */}
            {filteredTotales.length > 0 && (
              <tr className="bg-white/5 font-bold">
                <td colSpan={5} className="p-3 text-right text-gray-300 uppercase text-xs">Total Filtrado:</td>
                <td className="p-3 text-center font-mono text-[#c2a077]">{totalContenedores}</td>
                <td className="p-3 text-right font-mono text-[#c2a077] text-lg">{totalKilos.toFixed(2)} kg</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
