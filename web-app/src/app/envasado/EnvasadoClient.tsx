'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import EnvasadoBuilder from './EnvasadoBuilder'
import { getOrdenEnvasadoById, updateEstadoOrdenEnvasado, completeOrdenEnvasado } from './envasadoActions'

export default function EnvasadoClient({ 
  initialOrdenes, 
  lotes, 
  bolsas 
}: { 
  initialOrdenes: any[]; 
  lotes: any[]; 
  bolsas: any[];
}) {
  const [showBuilder, setShowBuilder] = useState(false)
  const [activeOrden, setActiveOrden] = useState<any>(null)
  const [activePaquetes, setActivePaquetes] = useState<any[]>([])
  const [activeDetalles, setActiveDetalles] = useState<any[]>([])

  const handleOpenNew = () => {
    setActiveOrden(null)
    setActivePaquetes([])
    setActiveDetalles([])
    setShowBuilder(true)
  }

  const handleOpenEdit = async (orden: any) => {
    const fullData = await getOrdenEnvasadoById(orden.id)
    if (fullData) {
      setActiveOrden(fullData)
      setActivePaquetes(fullData.paquetes)
      setActiveDetalles(fullData.detalles)
    }
  }

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>, o: any) => {
    const newValue = e.target.value;
    if (newValue === o.estado) return;

    if (newValue === 'Completado' && o.estado !== 'Completado') {
      if (confirm('¿Marcar como Completado? Esto descontará el stock de café y de bolsas.')) {
        const updated = activeOrden?.id === o.id ? { ...activeOrden, estado: newValue } : null;
        if (updated) setActiveOrden(updated);
        await completeOrdenEnvasado(o.id);
      } else {
        e.target.value = o.estado;
      }
    } else {
      const updated = activeOrden?.id === o.id ? { ...activeOrden, estado: newValue } : null;
      if (updated) setActiveOrden(updated);
      await updateEstadoOrdenEnvasado(o.id, newValue);
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Envasado" icon="📦" />

      {showBuilder ? (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <div className="mb-6 flex justify-between items-center">
            <button onClick={() => setShowBuilder(false)} className="text-gray-400 hover:text-white flex items-center gap-2 font-bold">
              ← Volver
            </button>
          </div>
          
          <EnvasadoBuilder
            servicioId={null as any} // null because it's independent
            lotes={lotes}
            bolsas={bolsas}
            ordenEnvasado={activeOrden}
            paquetesEnvasado={activePaquetes}
            detallesEnvasado={activeDetalles}
          />
        </div>
      ) : (
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white">Órdenes de Envasado</h2>
              <p className="text-sm text-gray-400">Constructor de empaques y encomiendas</p>
            </div>
            <button
              onClick={handleOpenNew}
              className="px-6 py-2.5 bg-[#c2a077] hover:bg-[#b08f65] text-[#1a120b] font-extrabold rounded-xl transition-all shadow-lg shadow-[#c2a077]/10 whitespace-nowrap"
            >
              + Nueva Orden
            </button>
          </div>

          <div className="bg-[#1a120b] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="text-xs uppercase bg-black/40 text-gray-400 border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 font-bold">ID</th>
                    <th className="px-6 py-4 font-bold">Fecha</th>
                    <th className="px-6 py-4 font-bold">Lote Origen</th>
                    <th className="px-6 py-4 font-bold">Estado</th>
                    <th className="px-6 py-4 font-bold">Servicio Vinculado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {initialOrdenes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                        No hay órdenes de envasado.
                      </td>
                    </tr>
                  ) : (
                    initialOrdenes.map(o => (
                      <tr key={o.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => handleOpenEdit(o)}>
                        <td className="px-6 py-4 font-mono text-[#c2a077]">ENV-{o.id}</td>
                        <td className="px-6 py-4">{o.fecha ? new Date(o.fecha).toLocaleDateString() : '-'}</td>
                        <td className="px-6 py-4 font-bold text-white uppercase">{o.codigo_lote}</td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <select 
                            value={o.estado}
                            onChange={(e) => handleStatusChange(e, o)}
                            className={`bg-transparent border-b border-dashed border-white/30 text-xs font-bold focus:outline-none focus:border-[#c2a077] w-full max-w-[120px] ${o.estado === 'Completado' ? 'text-emerald-400' : o.estado === 'Entregado' ? 'text-blue-400' : 'text-yellow-400'}`}
                          >
                            <option value="Planeado" className="bg-black text-white">Planeado</option>
                            <option value="Completado" className="bg-black text-white">Completado</option>
                            <option value="Entregado" className="bg-black text-white">Entregado</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">{o.servicio_id ? `#${o.servicio_id}` : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}
    </div>
  )
}
