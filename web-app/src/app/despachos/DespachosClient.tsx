'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import NuevoDespachoModal from './NuevoDespachoModal'
import TicketRemisionModal from './TicketRemisionModal'

export default function DespachosClient({ 
  initialDespachos, 
  lotes, 
  clientes,
  bolsas 
}: { 
  initialDespachos: any[]; 
  lotes: any[]; 
  clientes: any[];
  bolsas: any[];
}) {
  const [showNuevoModal, setShowNuevoModal] = useState(false)
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null)

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Despachos y Salidas" icon="📤" />

      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Guías de Remisión</h2>
            <p className="text-sm text-gray-400">Historial de despachos y salidas de inventario</p>
          </div>
          <button
            onClick={() => setShowNuevoModal(true)}
            className="px-6 py-2.5 bg-[#c2a077] hover:bg-[#b08f65] text-[#1a120b] font-extrabold rounded-xl transition-all shadow-lg shadow-[#c2a077]/10 whitespace-nowrap"
          >
            + Nuevo Despacho
          </button>
        </div>

        <div className="bg-[#1a120b] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs uppercase bg-black/40 text-gray-400 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-bold">Nº Ticket</th>
                  <th className="px-6 py-4 font-bold">Fecha</th>
                  <th className="px-6 py-4 font-bold">Cliente</th>
                  <th className="px-6 py-4 font-bold">Notas</th>
                  <th className="px-6 py-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {initialDespachos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                      No hay despachos registrados.
                    </td>
                  </tr>
                ) : (
                  initialDespachos.map(d => (
                    <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-mono text-[#c2a077]">{d.n_ticket || `Tck-${d.id}`}</td>
                      <td className="px-6 py-4">{new Date(d.fecha).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-bold text-white uppercase">{d.cliente}</td>
                      <td className="px-6 py-4 text-gray-500 max-w-[200px] truncate">{d.notas || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedTicketId(d.id)}
                          className="px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 rounded-lg text-xs font-bold transition-colors"
                        >
                          🖨️ Ver Ticket
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showNuevoModal && (
        <NuevoDespachoModal
          onClose={() => setShowNuevoModal(false)}
          lotes={lotes}
          clientes={clientes}
          bolsas={bolsas}
        />
      )}

      {selectedTicketId && (
        <TicketRemisionModal
          despachoId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
        />
      )}
    </div>
  )
}
