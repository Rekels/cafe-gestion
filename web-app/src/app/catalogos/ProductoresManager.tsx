'use client'

import { useState, useTransition } from 'react'
import { createProductor, updateProductor, deleteProductor } from './productoresActions'
import type { Productor } from './productoresActions'

interface ProductoresManagerProps {
  productores: Productor[]
}

export default function ProductoresManager({ productores }: ProductoresManagerProps) {
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  // ── Add form state ──
  const [newNombre, setNewNombre] = useState('')
  const [newTelefono, setNewTelefono] = useState('')
  const [newNotas, setNewNotas] = useState('')
  const [newAbreviatura, setNewAbreviatura] = useState('')

  // ── Edit form state ──
  const [editNombre, setEditNombre] = useState('')
  const [editTelefono, setEditTelefono] = useState('')
  const [editNotas, setEditNotas] = useState('')
  const [editAbreviatura, setEditAbreviatura] = useState('')

  function suggestAbbreviation(name: string): string {
    const clean = name.trim().toUpperCase()
    if (!clean) return ''
    const words = clean.split(/\s+/)
    if (words.length >= 2) {
      return (words[0].substring(0, 2) + words[1].substring(0, 2)).substring(0, 4)
    }
    return clean.substring(0, 4)
  }

  function handleNombreChange(val: string, isEdit: boolean) {
    if (isEdit) {
      setEditNombre(val)
      setEditAbreviatura(suggestAbbreviation(val))
    } else {
      setNewNombre(val)
      setNewAbreviatura(suggestAbbreviation(val))
    }
  }

  function startEditing(p: Productor) {
    setEditingId(p.id)
    setEditNombre(p.nombre)
    setEditTelefono(p.telefono || '')
    setEditNotas(p.notas || '')
    setEditAbreviatura(p.abreviatura || '')
    setError(null)
  }

  function cancelEditing() {
    setEditingId(null)
    setError(null)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!newNombre.trim()) {
      setError('El nombre del productor es requerido.')
      return
    }

    const fd = new FormData()
    fd.set('nombre', newNombre)
    fd.set('telefono', newTelefono)
    fd.set('notas', newNotas)
    fd.set('abreviatura', newAbreviatura)

    startTransition(async () => {
      const res = await createProductor(fd)
      if (!res.success) {
        setError(res.error || 'Error al crear productor.')
      } else {
        setNewNombre('')
        setNewTelefono('')
        setNewNotas('')
        setNewAbreviatura('')
        setShowAddForm(false)
      }
    })
  }

  async function handleUpdate(e: React.FormEvent, id: number) {
    e.preventDefault()
    setError(null)

    if (!editNombre.trim()) {
      setError('El nombre del productor es requerido.')
      return
    }
    if (!editAbreviatura.trim()) {
      setError('La abreviatura del productor es requerida.')
      return
    }

    const fd = new FormData()
    fd.set('id', String(id))
    fd.set('nombre', editNombre)
    fd.set('telefono', editTelefono)
    fd.set('notas', editNotas)
    fd.set('abreviatura', editAbreviatura)

    startTransition(async () => {
      const res = await updateProductor(fd)
      if (!res.success) {
        setError(res.error || 'Error al actualizar productor.')
      } else {
        setEditingId(null)
      }
    })
  }

  async function handleDelete(id: number) {
    setError(null)
    if (!confirm('¿Estás seguro de que deseas eliminar este productor del catálogo?')) return

    startTransition(async () => {
      const res = await deleteProductor(id)
      if (!res.success) {
        setError(res.error)
      }
    })
  }

  const filteredProductores = productores.filter(p => 
    p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.notas || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/20 border border-red-400/30 text-red-200 px-5 py-3 rounded-2xl text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Control bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-4 top-3 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Buscar productor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#c2a077]"
          />
        </div>

        {/* Add button */}
        <button
          onClick={() => { setShowAddForm(!showAddForm); setError(null) }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#c2a077]/20 hover:bg-[#c2a077]/40 text-[#c2a077] hover:text-white rounded-xl font-medium border border-[#c2a077]/30 transition-all duration-300"
        >
          {showAddForm ? '✕ Cancelar' : '＋ Nuevo Productor'}
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <form onSubmit={handleCreate} className="bg-[#1a120b]/60 backdrop-blur-xl rounded-3xl border border-[#c2a077]/30 shadow-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-[#c2a077]">Agregar Nuevo Productor</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">Nombre Completo *</label>
              <input
                type="text"
                value={newNombre}
                onChange={(e) => handleNombreChange(e.target.value, false)}
                placeholder="Ej: TEODOCIO CCOYCCA"
                required
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#c2a077]"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">Abreviatura *</label>
              <input
                type="text"
                value={newAbreviatura}
                onChange={(e) => setNewAbreviatura(e.target.value.toUpperCase().trim())}
                placeholder="Ej: TECC"
                maxLength={4}
                required
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#c2a077]"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">Teléfono / WhatsApp</label>
              <input
                type="text"
                value={newTelefono}
                onChange={(e) => setNewTelefono(e.target.value)}
                placeholder="Ej: +51 987654321"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#c2a077]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">Notas / Detalles de Finca</label>
              <input
                type="text"
                value={newNotas}
                onChange={(e) => setNewNotas(e.target.value)}
                placeholder="Ej: Finca El Mirador, San Ignacio..."
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#c2a077]"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2.5 bg-[#c2a077] hover:bg-[#b08f65] text-[#1a120b] font-bold rounded-xl transition-all shadow-md disabled:opacity-50 text-sm"
            >
              {isPending ? 'Guardando...' : 'Crear Productor'}
            </button>
          </div>
        </form>
      )}

      {/* List / Table */}
      <div className="bg-[#1a120b]/60 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-white/5 text-[#c2a077] text-sm tracking-wider uppercase">
                <th className="p-5 font-semibold">Productor</th>
                <th className="p-5 font-semibold">Abreviatura</th>
                <th className="p-5 font-semibold">Teléfono</th>
                <th className="p-5 font-semibold">Notas / Detalles</th>
                <th className="p-5 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProductores.map((p) => {
                const isEditing = editingId === p.id
                if (isEditing) {
                  return (
                    <tr key={p.id} className="bg-white/[0.02]">
                      <td colSpan={5} className="p-4">
                        <form onSubmit={(e) => handleUpdate(e, p.id)} className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 w-full">
                          <div className="flex-1 min-w-[180px]">
                            <label className="block text-[10px] text-gray-400 mb-1">Nombre Completo *</label>
                            <input
                              type="text"
                              value={editNombre}
                              onChange={(e) => handleNombreChange(e.target.value, true)}
                              required
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-bold uppercase focus:outline-none focus:border-[#c2a077]"
                            />
                          </div>
                          <div className="flex-1 min-w-[80px]">
                            <label className="block text-[10px] text-gray-400 mb-1">Abrev. *</label>
                            <input
                              type="text"
                              value={editAbreviatura}
                              onChange={(e) => setEditAbreviatura(e.target.value.toUpperCase().trim())}
                              required
                              maxLength={4}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077]"
                            />
                          </div>
                          <div className="flex-1 min-w-[120px]">
                            <label className="block text-[10px] text-gray-400 mb-1">Teléfono</label>
                            <input
                              type="text"
                              value={editTelefono}
                              onChange={(e) => setEditTelefono(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077]"
                            />
                          </div>
                          <div className="flex-[2] min-w-[200px]">
                            <label className="block text-[10px] text-gray-400 mb-1">Notas / Finca</label>
                            <input
                              type="text"
                              value={editNotas}
                              onChange={(e) => setEditNotas(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077]"
                            />
                          </div>
                          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                            <button
                              type="submit"
                              disabled={isPending}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors text-xs"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditing}
                              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold border border-white/10 transition-colors text-xs"
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={p.id} className="hover:bg-white/[0.03] transition-colors duration-200 group">
                    <td className="p-5">
                      <span className="text-white font-bold uppercase block">{p.nombre}</span>
                    </td>
                    <td className="p-5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-[#c2a077]/10 text-[#c2a077] border border-[#c2a077]/20 font-mono">
                        {p.abreviatura}
                      </span>
                    </td>
                    <td className="p-5">
                      <span className="text-gray-300 text-sm">{p.telefono || 'Sin registrar'}</span>
                    </td>
                    <td className="p-5">
                      <span className="text-gray-400 text-sm block max-w-sm truncate" title={p.notas || ''}>
                        {p.notas || '-'}
                      </span>
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEditing(p)}
                          className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 rounded-xl font-bold border border-amber-500/20 transition-all text-xs flex items-center gap-1"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl font-bold border border-red-500/20 transition-all text-xs flex items-center gap-1"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredProductores.length === 0 && (
            <div className="p-12 text-center text-gray-400">
              No se encontraron productores.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
