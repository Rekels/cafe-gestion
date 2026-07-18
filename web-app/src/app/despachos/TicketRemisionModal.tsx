'use client'

import { useEffect, useState, useRef } from 'react'
import { getDespachoById } from '@/app/actions'
import { useReactToPrint } from 'react-to-print'

export default function TicketRemisionModal({ despachoId, onClose }: { despachoId: number, onClose: () => void }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const componentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getDespachoById(despachoId).then(res => {
      setData(res)
      setLoading(false)
    })
  }, [despachoId])

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Ticket_Remision_${data?.n_ticket || despachoId}`,
  })

  if (loading) return null

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="relative bg-[#1a120b] border border-white/10 rounded-3xl shadow-2xl max-w-lg w-full flex flex-col">
        
        <div className="flex items-center justify-between border-b border-white/10 p-6 shrink-0">
          <h2 className="text-xl font-bold text-[#c2a077]">🎫 Ticket de Remisión</h2>
          <div className="flex gap-2">
            <button onClick={() => handlePrint()} className="px-4 py-2 bg-[#c2a077] text-black font-bold rounded-lg hover:bg-[#b08f65]">
              🖨️ Imprimir
            </button>
            <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">✕</button>
          </div>
        </div>

        <div className="p-8 bg-white text-black overflow-y-auto" ref={componentRef}>
          {/* Print Template */}
          <div className="text-center border-b-2 border-black pb-4 mb-4">
            <h1 className="text-2xl font-black uppercase">Cafetería Pantiwayta</h1>
            <p className="text-sm font-bold mt-1">Tostaduría Enace</p>
            <h2 className="text-lg font-bold mt-4 uppercase tracking-widest">TICKET DE REMISIÓN</h2>
            <p className="font-mono text-sm mt-1">{data.n_ticket || `Tck-${data.id}`}</p>
          </div>

          <div className="text-sm space-y-2 mb-6">
            <p><strong>Fecha:</strong> {new Date(data.fecha).toLocaleString()}</p>
            <p><strong>Cliente / Destino:</strong> {data.cliente}</p>
            {data.notas && <p><strong>Notas:</strong> {data.notas}</p>}
          </div>

          <table className="w-full text-sm mb-8 text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="py-2">CANT.</th>
                <th className="py-2">DESCRIPCIÓN</th>
                <th className="py-2">LOTE REF.</th>
              </tr>
            </thead>
            <tbody>
              {data.detalles.map((d: any) => (
                <tr key={d.id} className="border-b border-gray-300">
                  <td className="py-2 font-bold">
                    {d.tipo_item === 'cafe' ? `${d.cantidad_kg} kg` : `${d.cantidad_bolsas} und`}
                  </td>
                  <td className="py-2">
                    {d.tipo_item === 'cafe' ? `Café Granel (${d.tipo_cafe.replace('stock_', '').replace(/_/g, ' ')})` : `Bolsa: ${d.bolsa_nombre}`}
                  </td>
                  <td className="py-2 font-mono text-xs">{d.codigo_lote}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-16 flex justify-between text-sm">
            <div className="text-center w-40">
              <div className="border-t border-black pt-1">Entregado por</div>
            </div>
            <div className="text-center w-40">
              <div className="border-t border-black pt-1">Recibido por</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
