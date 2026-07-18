'use client'

import { useState, useTransition } from 'react'
import { createEquipo, updateEquipo, toggleEquipoActivo, deleteEquipo } from './actions'
import type { Equipo } from './actions'

interface EquiposManagerProps {
  initialEquipos: Equipo[]
}

export default function EquiposManager({ initialEquipos }: EquiposManagerProps) {
  const [equipos, setEquipos] = useState(initialEquipos)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // ── Add form state ──
  const [newNombre, setNewNombre] = useState('')
  const [newTipo, setNewTipo] = useState('tostadora')
  const [newCapacidad, setNewCapacidad] = useState('')
  const [newNotas, setNewNotas] = useState('')
  const [newTempTs, setNewTempTs] = useState('')
  const [newTempFc, setNewTempFc] = useState('')
  const [newTempEnd, setNewTempEnd] = useState('')

  // ── Edit form state ──
  const [editNombre, setEditNombre] = useState('')
  const [editTipo, setEditTipo] = useState('')
  const [editCapacidad, setEditCapacidad] = useState('')
  const [editNotas, setEditNotas] = useState('')
  const [editTempTs, setEditTempTs] = useState('')
  const [editTempFc, setEditTempFc] = useState('')
  const [editTempEnd, setEditTempEnd] = useState('')

  function startEditing(equipo: Equipo) {
    setEditingId(equipo.id)
    setEditNombre(equipo.nombre)
    setEditTipo(equipo.tipo || 'tostadora')
    setEditCapacidad(equipo.capacidad_kg?.toString() || '')
    setEditNotas(equipo.notas || '')
    setEditTempTs(equipo.default_temp_ts?.toString() || '')
    setEditTempFc(equipo.default_temp_fc?.toString() || '')
    setEditTempEnd(equipo.default_temp_end?.toString() || '')
    setError(null)
  }

  function cancelEditing() {
    setEditingId(null)
    setError(null)
  }

  async function handleCreate() {
    setError(null)
    const fd = new FormData()
    fd.set('nombre', newNombre)
    fd.set('tipo', newTipo)
    if (newCapacidad) fd.set('capacidad_kg', newCapacidad)
    if (newNotas) fd.set('notas', newNotas)
    if (newTempTs) fd.set('default_temp_ts', newTempTs)
    if (newTempFc) fd.set('default_temp_fc', newTempFc)
    if (newTempEnd) fd.set('default_temp_end', newTempEnd)

    startTransition(async () => {
      const result = await createEquipo(fd)
      if (!result.success) {
        setError(result.error || 'Error al crear')
        return
      }
      setNewNombre('')
      setNewTipo('tostadora')
      setNewCapacidad('')
      setNewNotas('')
      setNewTempTs('')
      setNewTempFc('')
      setNewTempEnd('')
      setShowAddForm(false)
    })
  }

  async function handleUpdate(id: number) {
    setError(null)
    const fd = new FormData()
    fd.set('nombre', editNombre)
    fd.set('tipo', editTipo)
    if (editCapacidad) fd.set('capacidad_kg', editCapacidad)
    if (editNotas) fd.set('notas', editNotas)
    if (editTempTs) fd.set('default_temp_ts', editTempTs)
    if (editTempFc) fd.set('default_temp_fc', editTempFc)
    if (editTempEnd) fd.set('default_temp_end', editTempEnd)

    startTransition(async () => {
      const result = await updateEquipo(id, fd)
      if (!result.success) {
        setError(result.error || 'Error al actualizar')
        return
      }
      setEditingId(null)
    })
  }

  async function handleToggle(id: number, currentActivo: number) {
    setError(null)
    startTransition(async () => {
      const result = await toggleEquipoActivo(id, currentActivo === 0)
      if (!result.success) {
        setError(result.error || 'Error al cambiar estado')
      }
    })
  }

  async function handleDelete(id: number) {
    setError(null)
    if (!confirm('¿Eliminar este equipo? Esta acción no se puede deshacer.')) return

    startTransition(async () => {
      const result = await deleteEquipo(id)
      if (!result.success) {
        setError(result.error || 'Error al eliminar')
      }
    })
  }

  const tipoOptions = [
    { value: 'tostadora', label: '🔥 Tostadora' },
    { value: 'molino', label: '⚙️ Molino' },
    { value: 'selladora', label: '📦 Selladora' },
    { value: 'otro', label: '🔧 Otro' },
  ]

  const tipoLabel = (tipo: string) =>
    tipoOptions.find((t) => t.value === tipo)?.label || tipo

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="bg-red-500/20 border border-red-400/30 text-red-200 px-5 py-3 rounded-2xl text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Add button */}
      <div className="flex justify-end">
        <button
          onClick={() => { setShowAddForm(!showAddForm); setError(null) }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#c2a077]/20 hover:bg-[#c2a077]/40 text-[#c2a077] hover:text-white rounded-xl font-medium border border-[#c2a077]/30 transition-all duration-300"
        >
          {showAddForm ? '✕ Cancelar' : '＋ Nuevo Equipo'}
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-[#1a120b]/60 backdrop-blur-xl rounded-3xl border border-[#c2a077]/30 shadow-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-[#c2a077]">Agregar Nuevo Equipo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#c2a077]/70 mb-1.5">Nombre *</label>
              <input
                type="text"
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
                placeholder="Ej: Diedrich IR-3"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#c2a077] focus:ring-1 focus:ring-[#c2a077]/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#c2a077]/70 mb-1.5">Tipo</label>
              <select
                value={newTipo}
                onChange={(e) => setNewTipo(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#c2a077] focus:ring-1 focus:ring-[#c2a077]/30 transition-colors"
              >
                {tipoOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#1a120b]">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#c2a077]/70 mb-1.5">Capacidad (kg)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={newCapacidad}
                onChange={(e) => setNewCapacidad(e.target.value)}
                placeholder="Ej: 3.0"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#c2a077] focus:ring-1 focus:ring-[#c2a077]/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#c2a077]/70 mb-1.5">Notas</label>
              <input
                type="text"
                value={newNotas}
                onChange={(e) => setNewNotas(e.target.value)}
                placeholder="Notas opcionales..."
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#c2a077] focus:ring-1 focus:ring-[#c2a077]/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#c2a077]/70 mb-1.5">Temp TS Def. (°C)</label>
              <input
                type="number"
                step="0.1"
                value={newTempTs}
                onChange={(e) => setNewTempTs(e.target.value)}
                placeholder="Ej: 150"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#c2a077] focus:ring-1 focus:ring-[#c2a077]/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#c2a077]/70 mb-1.5">Temp FC Def. (°C)</label>
              <input
                type="number"
                step="0.1"
                value={newTempFc}
                onChange={(e) => setNewTempFc(e.target.value)}
                placeholder="Ej: 198"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#c2a077] focus:ring-1 focus:ring-[#c2a077]/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#c2a077]/70 mb-1.5">Temp End Def. (°C)</label>
              <input
                type="number"
                step="0.1"
                value={newTempEnd}
                onChange={(e) => setNewTempEnd(e.target.value)}
                placeholder="Ej: 210"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#c2a077] focus:ring-1 focus:ring-[#c2a077]/30 transition-colors"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={handleCreate}
              disabled={isPending || !newNombre.trim()}
              className="px-6 py-2.5 bg-[#c2a077] hover:bg-[#d4b48a] text-[#0d0906] font-bold rounded-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
            >
              {isPending ? 'Guardando...' : 'Guardar Equipo'}
            </button>
          </div>
        </div>
      )}

      {/* Equipos table */}
      <div className="bg-[#1a120b]/60 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-[#c2a077] text-sm tracking-wider uppercase">
                <th className="p-5 font-semibold">Nombre</th>
                <th className="p-5 font-semibold">Tipo</th>
                <th className="p-5 font-semibold">Capacidad</th>
                <th className="p-5 font-semibold text-center">Temp Def. (TS/FC/End)</th>
                <th className="p-5 font-semibold text-center">Estado</th>
                <th className="p-5 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {equipos.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-white/40 text-lg">
                    No hay equipos registrados. ¡Agrega el primero!
                  </td>
                </tr>
              )}
              {equipos.map((equipo) => (
                <tr
                  key={equipo.id}
                  className={`hover:bg-white/[0.03] transition-colors duration-200 ${
                    equipo.activo === 0 ? 'opacity-50' : ''
                  }`}
                >
                  {editingId === equipo.id ? (
                    /* ── Editing row ── */
                    <>
                      <td className="p-3">
                        <input
                          type="text"
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                          className="w-full bg-black/30 border border-[#c2a077]/40 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#c2a077] transition-colors"
                        />
                      </td>
                      <td className="p-3">
                        <select
                          value={editTipo}
                          onChange={(e) => setEditTipo(e.target.value)}
                          className="w-full bg-black/30 border border-[#c2a077]/40 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#c2a077] transition-colors"
                        >
                          {tipoOptions.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-[#1a120b]">
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={editCapacidad}
                          onChange={(e) => setEditCapacidad(e.target.value)}
                          className="w-full bg-black/30 border border-[#c2a077]/40 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#c2a077] transition-colors max-w-[100px]"
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <input
                            type="number"
                            step="0.1"
                            value={editTempTs}
                            onChange={(e) => setEditTempTs(e.target.value)}
                            className="w-16 bg-black/30 border border-[#c2a077]/40 rounded-lg px-2 py-1 text-white text-xs text-center focus:outline-none focus:border-[#c2a077]"
                            title="Temp TS Default"
                          />
                          <input
                            type="number"
                            step="0.1"
                            value={editTempFc}
                            onChange={(e) => setEditTempFc(e.target.value)}
                            className="w-16 bg-black/30 border border-[#c2a077]/40 rounded-lg px-2 py-1 text-white text-xs text-center focus:outline-none focus:border-[#c2a077]"
                            title="Temp FC Default"
                          />
                          <input
                            type="number"
                            step="0.1"
                            value={editTempEnd}
                            onChange={(e) => setEditTempEnd(e.target.value)}
                            className="w-16 bg-black/30 border border-[#c2a077]/40 rounded-lg px-2 py-1 text-white text-xs text-center focus:outline-none focus:border-[#c2a077]"
                            title="Temp End Default"
                          />
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                          equipo.activo ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}>
                          {equipo.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleUpdate(equipo.id)}
                            disabled={isPending}
                            className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 rounded-lg text-sm font-medium border border-emerald-500/30 transition-colors disabled:opacity-40"
                          >
                            ✓
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-sm font-medium border border-white/10 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    /* ── Display row ── */
                    <>
                      <td className="p-5 font-bold text-white text-lg">{equipo.nombre}</td>
                      <td className="p-5 text-gray-300">{tipoLabel(equipo.tipo)}</td>
                      <td className="p-5 text-gray-300 font-mono">
                        {equipo.capacidad_kg != null ? `${equipo.capacidad_kg} kg` : '—'}
                      </td>
                      <td className="p-5 text-center text-gray-400 font-mono text-sm">
                        <span title="Temp TS">{equipo.default_temp_ts || '-'}</span> /{' '}
                        <span title="Temp FC">{equipo.default_temp_fc || '-'}</span> /{' '}
                        <span title="Temp End">{equipo.default_temp_end || '-'}</span>
                      </td>
                      <td className="p-5 text-center">
                        <button
                          onClick={() => handleToggle(equipo.id, equipo.activo)}
                          disabled={isPending}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all duration-300 cursor-pointer disabled:opacity-40 ${
                            equipo.activo
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/40'
                              : 'bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/40'
                          }`}
                        >
                          <span className={`inline-block w-2 h-2 rounded-full ${equipo.activo ? 'bg-emerald-400' : 'bg-red-400'}`} />
                          {equipo.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEditing(equipo)}
                            className="px-3 py-1.5 bg-[#c2a077]/15 hover:bg-[#c2a077]/30 text-[#c2a077] rounded-lg text-sm font-medium border border-[#c2a077]/20 transition-colors"
                            title="Editar"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleDelete(equipo.id)}
                            disabled={isPending}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/25 text-red-400 rounded-lg text-sm font-medium border border-red-500/20 transition-colors disabled:opacity-40"
                            title="Eliminar"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
