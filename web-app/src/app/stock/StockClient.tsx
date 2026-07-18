'use client'

import { useState, useMemo } from 'react'
import StockRow from './StockRow'
import ProcessBadge from '@/components/ProcessBadge'

interface StockClientProps {
  initialLotes: any[]
  initialBolsas?: any[]
}

export default function StockClient({ initialLotes, initialBolsas = [] }: StockClientProps) {
  const [searchText, setSearchText] = useState('');
  const [selectedCliente, setSelectedCliente] = useState('');
  const [selectedProductor, setSelectedProductor] = useState('');
  const [selectedVariedad, setSelectedVariedad] = useState('');
  const [selectedProceso, setSelectedProceso] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<'activos' | 'inactivos' | 'todos'>('activos');

  // Extract unique options for filter dropdowns dynamically
  const clientOptions = useMemo(() => {
    const values = initialLotes.map(l => l.propietario).filter(Boolean);
    return Array.from(new Set(values)).sort() as string[];
  }, [initialLotes]);

  const productorOptions = useMemo(() => {
    const values = initialLotes.map(l => l.productor).filter(Boolean);
    return Array.from(new Set(values)).sort() as string[];
  }, [initialLotes]);

  const variedadOptions = useMemo(() => {
    const values = initialLotes.map(l => l.variedad).filter(Boolean);
    return Array.from(new Set(values)).sort() as string[];
  }, [initialLotes]);

  const procesoOptions = useMemo(() => {
    const values = initialLotes.map(l => l.proceso).filter(Boolean);
    return Array.from(new Set(values)).sort() as string[];
  }, [initialLotes]);

  // Filter logic
  const filteredLotes = useMemo(() => {
    return initialLotes.filter(lote => {
      // 1. Text Search
      if (searchText.trim()) {
        const query = searchText.toLowerCase().trim();
        const codeMatch = (lote.codigo_lote || '').toLowerCase().includes(query);
        const nameMatch = (lote.n_lote || '').toLowerCase().includes(query);
        if (!codeMatch && !nameMatch) return false;
      }

      // 2. Client Filter
      if (selectedCliente && (lote.propietario || '').toUpperCase() !== selectedCliente.toUpperCase()) {
        return false;
      }

      // 3. Productor Filter
      if (selectedProductor && (lote.productor || '').toUpperCase() !== selectedProductor.toUpperCase()) {
        return false;
      }

      // 4. Variety Filter
      if (selectedVariedad && (lote.variedad || '').toUpperCase() !== selectedVariedad.toUpperCase()) {
        return false;
      }

      // 5. Process Filter
      if (selectedProceso && (lote.proceso || '').toUpperCase() !== selectedProceso.toUpperCase()) {
        return false;
      }

      // 6. Active/Inactive Filter
      const isActive = !!lote.activo;
      if (estadoFilter === 'activos' && !isActive) return false;
      if (estadoFilter === 'inactivos' && isActive) return false;

      return true;
    });
  }, [initialLotes, searchText, selectedCliente, selectedProductor, selectedVariedad, selectedProceso, estadoFilter]);

  const activeCount = useMemo(() => {
    return initialLotes.filter(l => !!l.activo).length;
  }, [initialLotes]);

  const clearFilters = () => {
    setSearchText('');
    setSelectedCliente('');
    setSelectedProductor('');
    setSelectedVariedad('');
    setSelectedProceso('');
    setEstadoFilter('activos');
  };

  const hasActiveFilters = searchText || selectedCliente || selectedProductor || selectedVariedad || selectedProceso || estadoFilter !== 'activos';

  return (
    <div className="space-y-6">
      
      {/* Metrics & Header Stats */}
      <div className="flex justify-between items-center bg-[#1a120b]/30 border border-white/5 rounded-2xl px-5 py-3.5 backdrop-blur-md">
        <div className="text-sm text-gray-400">
          Mostrando <span className="text-[#c2a077] font-bold">{filteredLotes.length}</span> de {initialLotes.length} lotes totales
        </div>
        <div className="bg-[#c2a077]/10 text-[#c2a077] px-4 py-1.5 rounded-full font-bold border border-[#c2a077]/30 text-xs">
          {activeCount} Lotes Activos
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div className="bg-[#1a120b]/45 backdrop-blur-md rounded-2xl border border-white/10 p-5 shadow-lg space-y-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <h2 className="text-sm font-bold text-[#c2a077] uppercase tracking-wider flex items-center gap-1.5">
            <span>🔍</span> Filtros de Búsqueda
          </h2>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-red-400 hover:text-red-300 font-semibold hover:underline"
            >
              Limpiar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 items-end">
          {/* Text Search */}
          <div className="md:col-span-2">
            <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1.5 font-bold">Buscar Código / N° Lote</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-400 text-sm">🔍</span>
              <input
                type="text"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="Ej: PTY-23..."
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#c2a077]"
              />
            </div>
          </div>

          {/* Client Filter */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1.5 font-bold">Cliente / Propietario</label>
            <select
              value={selectedCliente}
              onChange={e => setSelectedCliente(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c2a077] uppercase"
            >
              <option value="">-- Todos --</option>
              {clientOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Productor Filter */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1.5 font-bold">Productor / Finca</label>
            <select
              value={selectedProductor}
              onChange={e => setSelectedProductor(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c2a077] uppercase"
            >
              <option value="">-- Todos --</option>
              {productorOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Variety Filter */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1.5 font-bold">Variedad</label>
            <select
              value={selectedVariedad}
              onChange={e => setSelectedVariedad(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c2a077] uppercase"
            >
              <option value="">-- Todos --</option>
              {variedadOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Process Filter */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1.5 font-bold">Proceso</label>
            <select
              value={selectedProceso}
              onChange={e => setSelectedProceso(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c2a077] uppercase"
            >
              <option value="">-- Todos --</option>
              {procesoOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* State / Active status Filter tab selectors */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => setEstadoFilter('activos')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${estadoFilter === 'activos' ? 'bg-[#c2a077] text-[#1a120b]' : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'}`}
          >
            Lotes Activos
          </button>
          <button
            onClick={() => setEstadoFilter('inactivos')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${estadoFilter === 'inactivos' ? 'bg-red-900/40 text-red-200 border border-red-500/30' : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'}`}
          >
            Lotes Inactivos
          </button>
          <button
            onClick={() => setEstadoFilter('todos')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${estadoFilter === 'todos' ? 'bg-white/20 text-white' : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'}`}
          >
            Ver Todos
          </button>
        </div>
      </div>

      {/* Inventory Table - Glassmorphism */}
      <div className="bg-[#1a120b]/60 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-white/5 text-[#c2a077] text-xs tracking-wider uppercase">
                <th className="p-4 font-semibold">Código Lote</th>
                <th className="p-4 font-semibold">Variedad / Productor</th>
                <th className="p-4 font-semibold text-center">Estado Físico</th>
                <th className="p-4 font-semibold text-center text-white">Stock Actual</th>
                <th className="p-4 font-semibold text-center text-white">Despacho / Ajuste</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLotes.map((lote) => (
                <StockRow 
                key={lote.id} 
                lote={lote} 
                bolsas={initialBolsas.filter(b => b.lote_id === lote.id)}
              />
              ))}
              {filteredLotes.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-400">
                    No se encontraron lotes con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
