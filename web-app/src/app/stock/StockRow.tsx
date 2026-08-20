'use client'

import { useState, useTransition } from 'react'
import { updateLoteStock, updateLoteActivo } from '../actions'
import ProcessBadge from '@/components/ProcessBadge'

export default function StockRow({ lote, bolsas = [] }: { lote: any, bolsas?: any[] }) {
  const [isPending, startTransition] = useTransition()
  const [isActivoPending, startActivoTransition] = useTransition()
  
  const [ajusteVal, setAjusteVal] = useState<number | ''>('')
  const [ajusteTipo, setAjusteTipo] = useState<'Ajuste' | 'Merma'>('Ajuste')
  const [expanded, setExpanded] = useState(false)

  const handleAjuste = (isDespacho: boolean) => {
    if (ajusteVal === '' || ajusteVal <= 0) return;
    startTransition(async () => {
      const cantidad = isDespacho ? -Math.abs(Number(ajusteVal)) : Number(ajusteVal);
      // Pass the current lote.estado_actual as the "tipo_cafe" equivalent.
      const res = await updateLoteStock(lote.id, cantidad, lote.estado_actual)
      if (res.success) {
        setAjusteVal('')
      } else {
        alert('Error actualizando el stock')
      }
    })
  }

  const handleToggleActivo = (checked: boolean) => {
    startActivoTransition(async () => {
      const res = await updateLoteActivo(lote.id, checked)
      if (!res.success) {
        alert(res.error || 'Error al cambiar estado de lote')
      }
    })
  }

  return (
    <>
    <tr className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors duration-150 ${!lote.activo ? 'opacity-40 grayscale-[20%]' : ''}`}>
      {/* Código Lote */}
      <td className="p-4">
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer select-none" title={lote.activo ? 'Desactivar lote' : 'Activar lote'}>
            <input
              type="checkbox"
              checked={!!lote.activo}
              disabled={isActivoPending}
              onChange={(e) => handleToggleActivo(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-8 h-4.5 bg-white/10 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-3.5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#c2a077] transition-all"></div>
          </label>
          <div>
            <span className="font-mono font-bold text-white block">{lote.codigo_lote}</span>
            <span className="text-[10px] text-gray-500 block mt-1">ID: {lote.id} | Lote: {lote.n_lote}{lote.contenedor ? ` | Contenedor: ${lote.contenedor}` : ''}</span>
          </div>
        </div>
      </td>
      
      {/* Variedad / Productor */}
      <td className="p-4 text-gray-400">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#c2a077]/10 text-[#c2a077] uppercase">
            {lote.variedad || 'S/V'}
          </span>
          <ProcessBadge proceso={lote.proceso} />
        </div>
        <span className="text-white block font-medium text-xs truncate max-w-[150px]">{lote.productor || 'Sin Productor'}</span>
        <span className="text-[10px] block mt-0.5 text-gray-500">Prop: {lote.propietario}</span>
      </td>
      
      {/* Estado */}
      <td className="p-4 text-center">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-gray-300">
          {lote.estado_actual || 'Desconocido'}
        </span>
      </td>

      {/* Stock Actual */}
      <td className="p-4 text-center font-mono">
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-bold text-white bg-white/5 px-4 py-2 rounded-lg shadow-inner">
            {lote.stock_actual ? `${Number(lote.stock_actual).toFixed(2)} kg` : '0.00 kg'}
          </span>
          {bolsas.length > 0 && (
            <button 
              onClick={() => setExpanded(!expanded)} 
              className="text-[10px] text-[#c2a077] hover:text-white flex items-center gap-1 font-bold bg-[#c2a077]/10 px-2 py-1 rounded-md"
            >
              📦 {bolsas.reduce((acc: number, b: any) => acc + b.cantidad_en_almacen, 0)} bolsas {expanded ? '▲' : '▼'}
            </button>
          )}
        </div>
      </td>
      
      {/* Despacho / Ajuste */}
      <td className="p-4 border-l border-white/5 bg-black/20">
        <div className="flex flex-col gap-2 min-w-[180px]">
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              value={ajusteVal}
              onChange={(e) => setAjusteVal(e.target.value ? Number(e.target.value) : '')}
              className="w-full text-center text-xs px-2 py-1.5 bg-black/40 border border-white/10 rounded focus:outline-none focus:border-[#c2a077] text-white placeholder-gray-600"
              placeholder="0.00 kg"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleAjuste(false)}
              disabled={isPending || ajusteVal === '' || ajusteVal <= 0}
              className="flex-1 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 hover:text-white disabled:opacity-30 rounded text-[10px] font-bold uppercase transition-all border border-blue-500/30"
            >
              + Ingreso
            </button>
            <button
              onClick={() => handleAjuste(true)}
              disabled={isPending || ajusteVal === '' || ajusteVal <= 0}
              className="flex-1 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-white disabled:opacity-30 rounded text-[10px] font-bold uppercase transition-all border border-red-500/30"
            >
              - Despacho
            </button>
          </div>
        </div>
      </td>
    </tr>
    {expanded && bolsas.length > 0 && (
      <tr className="bg-white/[0.01] border-b border-white/5">
        <td colSpan={5} className="p-4 pl-12 border-l-2 border-l-[#c2a077]/50">
          <div className="flex items-center gap-4 text-xs">
            <span className="font-bold text-[#c2a077]">📦 Bolsas en Almacén:</span>
            <div className="flex gap-4 flex-wrap">
              {bolsas.map((b: any) => (
                <div key={b.id} className="bg-black/30 border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2">
                  <span className="text-white font-medium">{b.cantidad_en_almacen}x {b.nombre}</span>
                  <span className="text-gray-500">({b.capacidad_g}g) - {b.estado_grano}</span>
                </div>
              ))}
            </div>
          </div>
        </td>
      </tr>
    )}
    </>
  )
}
