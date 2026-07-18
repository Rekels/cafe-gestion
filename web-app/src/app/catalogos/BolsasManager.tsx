'use client'

import { useState, useTransition } from 'react'
import { createBolsa, updateBolsa, deleteBolsa } from './bolsasActions'
import type { Bolsa } from './bolsasActions'

interface BolsasManagerProps {
  bolsas: Bolsa[]
}

export default function BolsasManager({ bolsas }: BolsasManagerProps) {
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Add form state
  const [newNombre, setNewNombre] = useState('')
  const [newCapacidad, setNewCapacidad] = useState('')
  const [newMaterial, setNewMaterial] = useState('')
  const [newStock, setNewStock] = useState('0')
  const [newPrecio, setNewPrecio] = useState('')

  // Edit form state
  const [editNombre, setEditNombre] = useState('')
  const [editCapacidad, setEditCapacidad] = useState('')
  const [editMaterial, setEditMaterial] = useState('')
  const [editStock, setEditStock] = useState('0')
  const [editPrecio, setEditPrecio] = useState('')

  function startEditing(b: Bolsa) {
    setEditingId(b.id)
    setEditNombre(b.nombre)
    setEditCapacidad(String(b.capacidad_g))
    setEditMaterial(b.tipo_material || '')
    setEditStock(String(b.stock_disponible))
    setEditPrecio(b.precio_costo !== null ? String(b.precio_costo) : '')
    setError(null)
  }

  function cancelEditing() {
    setEditingId(null)
    setError(null)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!newNombre.trim() || !newCapacidad.trim()) {
      setError('El nombre y la capacidad son requeridos.')
      return
    }

    const fd = new FormData()
    fd.set('nombre', newNombre)
    fd.set('capacidad_g', newCapacidad)
    fd.set('tipo_material', newMaterial)
    fd.set('stock_disponible', newStock)
    if (newPrecio) fd.set('precio_costo', newPrecio)

    startTransition(async () => {
      const res = await createBolsa(fd)
      if (!res.success) {
        setError(res.error || 'Error al crear bolsa.')
      } else {
        setNewNombre('')
        setNewCapacidad('')
        setNewMaterial('')
        setNewStock('0')
        setNewPrecio('')
        setShowAddForm(false)
      }
    })
  }

  async function handleUpdate(e: React.FormEvent, id: number) {
    e.preventDefault()
    setError(null)

    if (!editNombre.trim() || !editCapacidad.trim()) {
      setError('El nombre y la capacidad son requeridos.')
      return
    }

    const fd = new FormData()
    fd.set('id', String(id))
    fd.set('nombre', editNombre)
    fd.set('capacidad_g', editCapacidad)
    fd.set('tipo_material', editMaterial)
    fd.set('stock_disponible', editStock)
    if (editPrecio) fd.set('precio_costo', editPrecio)

    startTransition(async () => {
      const res = await updateBolsa(fd)
      if (!res.success) {
        setError(res.error || 'Error al actualizar bolsa.')
      } else {
        setEditingId(null)
      }
    })
  }

  async function handleDelete(id: number) {
    setError(null)
    if (!confirm('¿Estás seguro de que deseas eliminar este insumo de bolsa?')) return

    startTransition(async () => {
      const res = await deleteBolsa(id)
      if (!res.success) {
        setError(res.error)
      }
    })
  }

  const filteredBolsas = bolsas.filter(b => 
    b.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.tipo_material && b.tipo_material.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/20 border border-red-400/30 text-red-200 px-5 py-3 rounded-2xl text-sm">
          ⚠️ {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-4 top-3 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Buscar por nombre o material..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#c2a077]"
          />
        </div>

        <button
          onClick={() => { setShowAddForm(!showAddForm); setError(null) }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#c2a077]/20 hover:bg-[#c2a077]/40 text-[#c2a077] hover:text-white rounded-xl font-medium border border-[#c2a077]/30 transition-all duration-300"
        >
          {showAddForm ? '✕ Cancelar' : '＋ Nueva Bolsa'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleCreate} className="bg-[#1a120b]/60 backdrop-blur-xl rounded-3xl border border-[#c2a077]/30 shadow-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-[#c2a077]">Agregar Nuevo Insumo (Bolsa)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">Nombre *</label>
              <input type="text" value={newNombre} onChange={e => setNewNombre(e.target.value)} placeholder="Ej: Bolsa Kraft Válvula" required className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#c2a077]" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">Capacidad (g) *</label>
              <input type="number" value={newCapacidad} onChange={e => setNewCapacidad(e.target.value)} placeholder="Ej: 250" required className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#c2a077]" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">Material</label>
              <input type="text" value={newMaterial} onChange={e => setNewMaterial(e.target.value)} placeholder="Ej: Kraft" className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#c2a077]" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">Stock Disponible</label>
              <input type="number" value={newStock} onChange={e => setNewStock(e.target.value)} placeholder="Ej: 100" className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#c2a077]" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">Precio Costo (Opcional)</label>
              <input type="number" step="0.01" value={newPrecio} onChange={e => setNewPrecio(e.target.value)} placeholder="Ej: 0.50" className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#c2a077]" />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={isPending} className="px-6 py-2.5 bg-[#c2a077] hover:bg-[#b08f65] text-[#1a120b] font-bold rounded-xl transition-all shadow-md disabled:opacity-50 text-sm">
              {isPending ? 'Guardando...' : 'Crear Bolsa'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-[#1a120b]/60 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-white/5 text-[#c2a077] text-sm tracking-wider uppercase">
                <th className="p-5 font-semibold">Bolsa</th>
                <th className="p-5 font-semibold text-center">Capacidad</th>
                <th className="p-5 font-semibold text-center">Material</th>
                <th className="p-5 font-semibold text-center">Stock</th>
                <th className="p-5 font-semibold text-center">Costo</th>
                <th className="p-5 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredBolsas.map((b) => {
                const isEditing = editingId === b.id
                if (isEditing) {
                  return (
                    <tr key={b.id} className="bg-white/[0.02]">
                      <td colSpan={6} className="p-4">
                        <form onSubmit={(e) => handleUpdate(e, b.id)} className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 w-full">
                          <div className="flex-1 min-w-[150px]">
                            <label className="block text-[10px] text-gray-400 mb-1">Nombre *</label>
                            <input type="text" value={editNombre} onChange={e => setEditNombre(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-[#c2a077]" />
                          </div>
                          <div className="w-24">
                            <label className="block text-[10px] text-gray-400 mb-1">Cap. (g) *</label>
                            <input type="number" value={editCapacidad} onChange={e => setEditCapacidad(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077]" />
                          </div>
                          <div className="flex-1 min-w-[100px]">
                            <label className="block text-[10px] text-gray-400 mb-1">Material</label>
                            <input type="text" value={editMaterial} onChange={e => setEditMaterial(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077]" />
                          </div>
                          <div className="w-24">
                            <label className="block text-[10px] text-gray-400 mb-1">Stock</label>
                            <input type="number" value={editStock} onChange={e => setEditStock(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077]" />
                          </div>
                          <div className="w-24">
                            <label className="block text-[10px] text-gray-400 mb-1">Costo</label>
                            <input type="number" step="0.01" value={editPrecio} onChange={e => setEditPrecio(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077]" />
                          </div>
                          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                            <button type="submit" disabled={isPending} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors text-xs">Guardar</button>
                            <button type="button" onClick={cancelEditing} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold border border-white/10 transition-colors text-xs">Cancelar</button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={b.id} className="hover:bg-white/[0.03] transition-colors duration-200 group">
                    <td className="p-5">
                      <span className="text-white font-bold block">{b.nombre}</span>
                    </td>
                    <td className="p-5 text-center">
                      <span className="text-white bg-white/10 px-2 py-1 rounded-md text-xs font-mono">{b.capacidad_g}g</span>
                    </td>
                    <td className="p-5 text-center text-gray-300">
                      {b.tipo_material || '-'}
                    </td>
                    <td className="p-5 text-center">
                      <span className={`inline-flex items-center justify-center px-2 py-1 rounded font-bold text-xs ${b.stock_disponible > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                        {b.stock_disponible}
                      </span>
                    </td>
                    <td className="p-5 text-center text-gray-400 font-mono">
                      {b.precio_costo ? `S/ ${b.precio_costo.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => startEditing(b)} className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 rounded-xl font-bold border border-amber-500/20 transition-all text-xs flex items-center gap-1">✏️ Editar</button>
                        <button onClick={() => handleDelete(b.id)} className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl font-bold border border-red-500/20 transition-all text-xs flex items-center gap-1">🗑️ Eliminar</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredBolsas.length === 0 && (
            <div className="p-12 text-center text-gray-400">
              No se encontraron insumos de bolsas.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
