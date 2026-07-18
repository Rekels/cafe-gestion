'use client'

import { useState, useTransition } from 'react'
import { createDespacho } from '@/app/actions'

interface DespachoItem {
  id: string; // temp ui id
  lote_id: number;
  tipo_item: 'cafe' | 'bolsa';
  tipo_cafe?: string;
  cantidad_kg?: string;
  bolsa_id?: number;
  cantidad_bolsas?: string;
}

export default function NuevoDespachoModal({ onClose, lotes, clientes, bolsas }: any) {
  const [isPending, startTransition] = useTransition()
  const [cliente, setCliente] = useState('')
  const [nTicket, setNTicket] = useState('')
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState<DespachoItem[]>([])

  const addItem = (tipo: 'cafe' | 'bolsa') => {
    setItems([...items, { 
      id: Math.random().toString(36).substr(2, 9), 
      lote_id: lotes[0]?.id || 0, 
      tipo_item: tipo,
      tipo_cafe: tipo === 'cafe' ? 'stock_tostado' : undefined,
      bolsa_id: tipo === 'bolsa' ? bolsas[0]?.id : undefined
    }])
  }

  const updateItem = (id: string, updates: Partial<DespachoItem>) => {
    setItems(items.map(it => it.id === id ? { ...it, ...updates } : it))
  }

  const removeItem = (id: string) => {
    setItems(items.filter(it => it.id !== id))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!cliente) return alert('Selecciona un cliente')
    if (items.length === 0) return alert('Añade al menos un ítem al despacho')

    const formData = new FormData()
    formData.append('cliente', cliente)
    formData.append('n_ticket', nTicket)
    formData.append('notas', notas)
    formData.append('items', JSON.stringify(items))

    startTransition(async () => {
      const res = await createDespacho(formData)
      if (res.success) {
        onClose()
      } else {
        alert('Error: ' + res.error)
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="relative bg-[#1a120b] border border-white/10 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        
        <div className="flex items-center justify-between border-b border-white/10 p-6 shrink-0">
          <h2 className="text-xl font-bold text-[#c2a077] flex items-center gap-2">
            <span>📤</span> Nuevo Despacho / Remisión
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Cliente *</label>
              <input
                type="text"
                list="clientes-list"
                value={cliente}
                onChange={e => setCliente(e.target.value)}
                required
                placeholder="Escribe o selecciona..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#c2a077] uppercase"
              />
              <datalist id="clientes-list">
                {clientes.map((c: any) => (
                  <option key={`${c.id}-nombre`} value={c.nombre} />
                ))}
                {clientes.filter((c: any) => c.empresa).map((c: any) => (
                  <option key={`${c.id}-empresa`} value={c.empresa} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Nº Ticket / Guía</label>
              <input
                type="text"
                value={nTicket}
                onChange={e => setNTicket(e.target.value)}
                placeholder="Ej: 001-000521"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#c2a077] uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Notas / Observaciones</label>
            <input
              type="text"
              value={notas}
              onChange={e => setNotas(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#c2a077]"
            />
          </div>

          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Ítems a Despachar</h3>
              <div className="flex gap-2">
                <button type="button" onClick={() => addItem('cafe')} className="px-3 py-1.5 bg-[#c2a077]/20 text-[#c2a077] hover:bg-[#c2a077]/40 rounded-lg text-xs font-bold transition-colors">
                  + Café Granel
                </button>
                <button type="button" onClick={() => addItem('bolsa')} className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 rounded-lg text-xs font-bold transition-colors">
                  + Bolsas
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.id} className="bg-black/30 border border-white/5 p-3 rounded-xl flex gap-3 items-end">
                  <div className="w-8 text-center text-gray-500 font-bold text-xs pb-2">{idx + 1}.</div>
                  
                  <div className="flex-1">
                    <label className="block text-[10px] text-gray-400 mb-1">Lote Origen</label>
                    <select 
                      value={item.lote_id} 
                      onChange={e => updateItem(item.id, { lote_id: Number(e.target.value) })}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                    >
                      {lotes.map((l: any) => <option key={l.id} value={l.id}>{l.codigo_lote}</option>)}
                    </select>
                  </div>

                  {item.tipo_item === 'cafe' ? (
                    <>
                      <div className="flex-1">
                        <label className="block text-[10px] text-gray-400 mb-1">Tipo de Grano</label>
                        <select 
                          value={item.tipo_cafe} 
                          onChange={e => updateItem(item.id, { tipo_cafe: e.target.value })}
                          className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                        >
                          <option value="stock_tostado">Tostado</option>
                          <option value="stock_oro_verde_seleccionado">Oro Seleccionado</option>
                          <option value="stock_pergamino">Pergamino</option>
                        </select>
                      </div>
                      <div className="w-24">
                        <label className="block text-[10px] text-gray-400 mb-1">Kilos</label>
                        <input 
                          type="number" step="0.01" required
                          value={item.cantidad_kg || ''} 
                          onChange={e => updateItem(item.id, { cantidad_kg: e.target.value })}
                          className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <label className="block text-[10px] text-gray-400 mb-1">Tipo de Bolsa</label>
                        <select 
                          value={item.bolsa_id} 
                          onChange={e => updateItem(item.id, { bolsa_id: Number(e.target.value) })}
                          className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                        >
                          {bolsas.map((b: any) => <option key={b.id} value={b.id}>{b.nombre} ({b.capacidad_g}g)</option>)}
                        </select>
                      </div>
                      <div className="w-24">
                        <label className="block text-[10px] text-gray-400 mb-1">Cant. Bolsas</label>
                        <input 
                          type="number" step="1" required
                          value={item.cantidad_bolsas || ''} 
                          onChange={e => updateItem(item.id, { cantidad_bolsas: e.target.value })}
                          className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                        />
                      </div>
                    </>
                  )}

                  <button type="button" onClick={() => removeItem(item.id)} className="pb-1 text-red-500 hover:text-red-400">
                    ✕
                  </button>
                </div>
              ))}
              
              {items.length === 0 && (
                <div className="text-center p-6 bg-black/20 rounded-xl border border-dashed border-white/10 text-gray-500 text-sm">
                  Agrega ítems para continuar.
                </div>
              )}
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-4 border-t border-white/10 p-6 shrink-0 bg-[#1a120b]">
          <button type="button" onClick={onClose} className="px-6 py-2 border border-white/10 hover:bg-white/5 text-gray-300 rounded-xl font-bold transition-all">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || items.length === 0}
            className="px-8 py-2 bg-[#c2a077] hover:bg-[#b08f65] text-[#1a120b] font-extrabold rounded-xl transition-all shadow-lg disabled:opacity-50"
          >
            {isPending ? 'Procesando...' : 'Confirmar Salida'}
          </button>
        </div>

      </div>
    </div>
  )
}
