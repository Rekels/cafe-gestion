'use client'

import { useState, useTransition } from 'react'
import { createCliente, updateCliente, deleteCliente } from './actions'
import TarifasClienteModal from './TarifasClienteModal'

export default function ClientesManager({ clientes }: { clientes: any[] }) {
  const [isPending, startTransition] = useTransition()
  const [selectedCliente, setSelectedCliente] = useState<any>(null)
  const [showRatesModal, setShowRatesModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  // ── Add form state ──
  const [newNombre, setNewNombre] = useState('')
  const [newEmpresa, setNewEmpresa] = useState('')
  const [newTelefono, setNewTelefono] = useState('')
  const [newCorreo, setNewCorreo] = useState('')
  const [newRazonSocial, setNewRazonSocial] = useState('')
  const [newRuc, setNewRuc] = useState('')
  const [newAbreviatura, setNewAbreviatura] = useState('')

  // ── Edit inline state ──
  const [editNombre, setEditNombre] = useState('')
  const [editEmpresa, setEditEmpresa] = useState('')
  const [editTelefono, setEditTelefono] = useState('')
  const [editCorreo, setEditCorreo] = useState('')
  const [editRazonSocial, setEditRazonSocial] = useState('')
  const [editRuc, setEditRuc] = useState('')
  const [editAbreviatura, setEditAbreviatura] = useState('')

  function suggestAbbreviation(name: string): string {
    const clean = name.trim().toUpperCase()
    if (!clean) return ''
    const words = clean.split(/\s+/)
    if (words.length >= 2) {
      return words.map(w => w[0]).join("").substring(0, 4)
    }
    return clean.substring(0, 3)
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

  function startEditing(c: any) {
    setEditingId(c.id)
    setEditNombre(c.nombre)
    setEditEmpresa(c.empresa || '')
    setEditTelefono(c.telefono || '')
    setEditCorreo(c.correo || '')
    setEditRazonSocial(c.razon_social || '')
    setEditRuc(c.ruc || '')
    setEditAbreviatura(c.abreviatura || '')
    setError(null)
  }

  function cancelEditing() {
    setEditingId(null)
    setError(null)
  }

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await createCliente(formData)
      if (res && !res.success) {
        setError(res.error || 'Error al crear cliente.')
      } else {
        setNewNombre('')
        setNewEmpresa('')
        setNewTelefono('')
        setNewCorreo('')
        setNewRazonSocial('')
        setNewRuc('')
        setNewAbreviatura('')
        setShowAddForm(false)
      }
    })
  }

  const handleUpdateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await updateCliente(formData)
      if (res && !res.success) {
        setError(res.error || 'Error al actualizar cliente.')
      } else {
        setEditingId(null)
      }
    })
  }

  const handleDelete = (id: number) => {
    setError(null)
    if (!confirm('¿Estás seguro de que deseas eliminar este cliente del catálogo?')) return

    startTransition(async () => {
      const res = await deleteCliente(id)
      if (res && !res.success) {
        setError(res.error)
      }
    })
  }

  const filteredClientes = clientes.filter(c => 
    c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.empresa || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.razon_social || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.ruc || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Error banner */}
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
            placeholder="Buscar cliente por nombre, empresa, RUC..."
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
          {showAddForm ? '✕ Cancelar' : '＋ Nuevo Cliente'}
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <form onSubmit={handleCreate} className="bg-[#1a120b]/60 backdrop-blur-xl rounded-3xl border border-[#c2a077]/30 shadow-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-[#c2a077]">Agregar Nuevo Cliente</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">Nombre Comercial / Común *</label>
              <input
                type="text"
                name="nombre"
                value={newNombre}
                onChange={(e) => handleNombreChange(e.target.value, false)}
                placeholder="Ej: MARIO"
                required
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#c2a077]"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">Abreviatura *</label>
              <input
                type="text"
                name="abreviatura"
                value={newAbreviatura}
                onChange={(e) => setNewAbreviatura(e.target.value.toUpperCase().trim())}
                placeholder="Ej: MAR"
                maxLength={4}
                required
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#c2a077]"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">Nombre Empresa (Corto)</label>
              <input
                type="text"
                name="empresa"
                value={newEmpresa}
                onChange={(e) => setNewEmpresa(e.target.value)}
                placeholder="Ej: CAFE DON MARIO"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#c2a077]"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">WhatsApp / Teléfono</label>
              <input
                type="text"
                name="telefono"
                value={newTelefono}
                onChange={(e) => setNewTelefono(e.target.value)}
                placeholder="+51999888777"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#c2a077]"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">Correo Electrónico</label>
              <input
                type="email"
                name="correo"
                value={newCorreo}
                onChange={(e) => setNewCorreo(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#c2a077]"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">Razón Social Fiscal (Opcional)</label>
              <input
                type="text"
                name="razon_social"
                value={newRazonSocial}
                onChange={(e) => setNewRazonSocial(e.target.value)}
                placeholder="Ej: AGRICOLA DON MARIO S.A.C."
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#c2a077]"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">RUC (Opcional)</label>
              <input
                type="text"
                name="ruc"
                value={newRuc}
                onChange={(e) => setNewRuc(e.target.value)}
                placeholder="Ej: 20123456789"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#c2a077]"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2.5 bg-[#c2a077] hover:bg-[#b08f65] text-[#1a120b] font-bold rounded-xl transition-all shadow-md disabled:opacity-50 text-sm"
            >
              {isPending ? 'Guardando...' : 'Crear Cliente'}
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
                <th className="p-5 font-semibold">Cliente / Razón Social</th>
                <th className="p-5 font-semibold">Empresa / RUC</th>
                <th className="p-5 font-semibold">WhatsApp / Correo</th>
                <th className="p-5 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredClientes.map((c: any) => {
                const isEditing = editingId === c.id
                if (isEditing) {
                  return (
                    <tr key={c.id} className="bg-white/[0.02]">
                      <td colSpan={4} className="p-4">
                        <form onSubmit={handleUpdateSubmit} className="flex flex-col gap-4 w-full">
                          <input type="hidden" name="id" value={c.id} />
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1">Nombre Cliente *</label>
                              <input 
                                type="text" 
                                name="nombre" 
                                value={editNombre}
                                onChange={(e) => setEditNombre(e.target.value)}
                                required
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-bold uppercase focus:outline-none focus:border-[#c2a077]"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1">Abreviatura *</label>
                              <input 
                                type="text" 
                                name="abreviatura" 
                                value={editAbreviatura}
                                onChange={(e) => setEditAbreviatura(e.target.value.toUpperCase().trim())}
                                maxLength={4}
                                required
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-bold uppercase focus:outline-none focus:border-[#c2a077]"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1">Nombre Empresa</label>
                              <input 
                                type="text" 
                                name="empresa" 
                                value={editEmpresa}
                                onChange={(e) => setEditEmpresa(e.target.value)}
                                placeholder="NINGUNA"
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077] uppercase"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1">WhatsApp / Teléfono</label>
                              <input 
                                type="text" 
                                name="telefono" 
                                value={editTelefono}
                                onChange={(e) => setEditTelefono(e.target.value)}
                                placeholder="+51999888777"
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077]"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1">Correo Electrónico</label>
                              <input 
                                type="email" 
                                name="correo" 
                                value={editCorreo}
                                onChange={(e) => setEditCorreo(e.target.value)}
                                placeholder="correo@ejemplo.com"
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077]"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1">Razón Social Fiscal</label>
                              <input 
                                type="text" 
                                name="razon_social" 
                                value={editRazonSocial}
                                onChange={(e) => setEditRazonSocial(e.target.value)}
                                placeholder="AGRICOLA SAC"
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077] uppercase"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1">RUC</label>
                              <input 
                                type="text" 
                                name="ruc" 
                                value={editRuc}
                                onChange={(e) => setEditRuc(e.target.value)}
                                placeholder="20123456789"
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077]"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                            <button 
                                type="submit" 
                                disabled={isPending}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors text-xs"
                            >
                              Guardar
                            </button>
                            <button 
                              type="button" 
                              onClick={cancelEditing}
                              className="px-5 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold border border-white/10 transition-colors text-xs"
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
                  <tr key={c.id} className="hover:bg-white/[0.03] transition-colors duration-200 group">
                    <td className="p-5">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold uppercase block">{c.nombre}</span>
                        {c.abreviatura && (
                          <span className="bg-[#c2a077]/20 text-[#c2a077] text-xs px-2 py-0.5 rounded font-mono font-bold uppercase">
                            {c.abreviatura}
                          </span>
                        )}
                      </div>
                      {c.razon_social && (
                        <span className="text-gray-400 text-xs block mt-0.5 font-medium italic">
                          RS: {c.razon_social}
                        </span>
                      )}
                    </td>
                    <td className="p-5">
                      <span className="text-white text-sm block uppercase">{c.empresa || 'NINGUNA'}</span>
                      {c.ruc && (
                        <span className="text-gray-400 text-xs block mt-0.5">
                          RUC: {c.ruc}
                        </span>
                      )}
                    </td>
                    <td className="p-5">
                      <div className="text-sm text-gray-300">{c.telefono || '-'}</div>
                      <div className="text-xs text-gray-400">{c.correo || '-'}</div>
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          type="button"
                          onClick={() => {
                            setSelectedCliente(c);
                            setShowRatesModal(true);
                          }}
                          className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 rounded-xl font-bold border border-amber-500/20 transition-all text-xs flex items-center gap-1"
                          title="Configurar tarifas personalizadas"
                        >
                          💰 Tarifas
                        </button>
                        <button 
                          type="button"
                          onClick={() => startEditing(c)}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[#c2a077] hover:text-white rounded-xl font-bold border border-white/10 transition-all text-xs"
                        >
                          ✏️ Editar
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl font-bold border border-red-500/20 transition-all text-xs"
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
          {filteredClientes.length === 0 && (
            <div className="p-12 text-center text-gray-400">
              No hay clientes registrados.
            </div>
          )}
        </div>
      </div>

      {showRatesModal && selectedCliente && (
        <TarifasClienteModal
          cliente={selectedCliente}
          onClose={() => {
            setShowRatesModal(false);
            setSelectedCliente(null);
          }}
        />
      )}
    </div>
  )
}
