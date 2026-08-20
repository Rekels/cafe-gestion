'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deleteProforma, updateProformaEstado, mergeProformas } from './actions'
import AddProformaModal from './AddProformaModal'
import { formatDateLatino } from '@/lib/dateUtils'

interface Proforma {
  id: number
  n_proforma: string
  cliente: string
  fecha_emision: string
  fecha_vencimiento: string | null
  subtotal: number
  descuento: number
  total: number
  estado: string
  notas: string | null
}

interface ClientInfo {
  id: number
  nombre: string
  empresa: string | null
}

interface PredefinedConcept {
  id: number
  nombre: string
  precio_defecto: number
}

interface ProformasClientProps {
  proformas: Proforma[]
  clientes: ClientInfo[]
  conceptosPredefinidos: PredefinedConcept[]
}

export default function ProformasClient({
  proformas,
  clientes,
  conceptosPredefinidos
}: ProformasClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [selectedProformas, setSelectedProformas] = useState<Set<number>>(new Set())
  const [isMergeMode, setIsMergeMode] = useState(false)

  const handleToggleMergeMode = () => {
    setIsMergeMode(prev => {
      const next = !prev
      if (!next) {
        setSelectedProformas(new Set())
      }
      return next
    })
  }

  // Filter proformas
  const filteredProformas = proformas.filter((p) => {
    const matchesSearch =
      p.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.n_proforma.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'todos'
      ? p.estado.toLowerCase() !== 'fusionada'
      : p.estado.toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  // Delete proforma handler
  const handleDelete = async (id: number, n_proforma: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la Proforma ${n_proforma}? Las Órdenes de Servicio vinculadas volverán a estar libres.`)) return
    
    startTransition(async () => {
      const res = await deleteProforma(id)
      if (res.success) {
        router.refresh()
      } else {
        alert(res.error || 'Error al eliminar la proforma.')
      }
    })
  }

  // Handle proforma status change
  const handleEstadoChange = async (id: number, oldEstado: string, nuevoEstado: string) => {
    if (nuevoEstado === 'Pagada') {
      const confirmOk = confirm(
        `¿Estás seguro de que deseas marcar la Proforma como PAGADA?\n\nEsta acción completará automáticamente todas las Órdenes de Servicio asociadas.`
      )
      if (!confirmOk) {
        router.refresh()
        return
      }
    }

    startTransition(async () => {
      const res = await updateProformaEstado(id, nuevoEstado)
      if (res.success) {
        router.refresh()
      } else {
        alert(res.error || 'Error al actualizar el estado de la proforma.')
        router.refresh()
      }
    })
  }

  // Helper for status classes
  const getStatusPillClass = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'borrador':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400'
      case 'emitida':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400'
      case 'pagada':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
      case 'fusionada': 
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
      default:
        return 'bg-gray-500/10 border-gray-500/30 text-gray-400'
    }
  }

  const handleToggleSelect = (id: number) => {
    setSelectedProformas(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleToggleSelectAll = () => {
    if (selectedProformas.size === filteredProformas.length && filteredProformas.length > 0) {
      setSelectedProformas(new Set())
    } else {
      setSelectedProformas(new Set(filteredProformas.map(p => p.id)))
    }
  }

  const handleMerge = async () => {
    const ids = Array.from(selectedProformas)
    if (ids.length < 2) return

    if (!confirm(`¿Estás seguro de que deseas juntar estas ${ids.length} proformas? Se creará una nueva proforma maestra con todos los conceptos y las originales se marcarán como Fusionadas.`)) {
      return
    }

    startTransition(async () => {
      const res = await mergeProformas(ids)
      if (res.success) {
        setSelectedProformas(new Set())
        router.push(`/proformas/${res.newProformaId}`)
      } else {
        alert(res.error || 'Error al juntar las proformas.')
      }
    })
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1a120b] via-[#2a1d13] to-[#1a120b] text-gray-100 p-4 md:p-8 font-sans selection:bg-[#c2a077]/30">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#c2a077] to-yellow-200">
              Proformas de Pago
            </h1>
            <p className="text-[#c2a077]/60 text-sm mt-1">
              Agrupa servicios cobrables por cliente y gestiona presupuestos y adicionales.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleToggleMergeMode}
              className={`flex items-center justify-center gap-2 px-5 py-3 border font-bold rounded-2xl transition-all shadow-lg text-sm ${
                isMergeMode
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
              }`}
            >
              <span>{isMergeMode ? '❌ Cancelar Selección' : '🔗 Juntar Proformas'}</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-[#c2a077] hover:bg-[#b08f65] text-[#1a120b] font-bold rounded-2xl transition-all shadow-lg shadow-[#c2a077]/10 text-sm"
            >
              <span>📄</span> Nueva Proforma
            </button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search bar */}
          <div className="flex-1 relative">
            <span className="absolute left-4 top-3 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Buscar por cliente o código de proforma..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1a120b]/60 border border-white/10 rounded-2xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#c2a077] placeholder-gray-500"
            />
          </div>
          
          {/* Status selector */}
          <div className="sm:w-56">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#1a120b]/60 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#c2a077]"
            >
              <option value="todos">Todos los Estados</option>
              <option value="borrador">📝 Borrador</option>
              <option value="emitida">📨 Emitida</option>
              <option value="pagada">✅ Pagada</option>
              <option value="fusionada">🔗 Fusionada</option>
            </select>
          </div>
        </div>

        {selectedProformas.size > 1 && (
          <div className="bg-[#c2a077]/20 border border-[#c2a077]/30 rounded-2xl p-4 flex items-center justify-between animate-fade-in mb-6">
            <span className="text-[#c2a077] font-semibold">{selectedProformas.size} proformas seleccionadas</span>
            <button
              onClick={handleMerge}
              disabled={isPending}
              className="bg-[#c2a077] text-black px-6 py-2 rounded-xl font-bold hover:bg-[#a68863] transition-colors shadow-lg"
            >
              🔗 Juntar Seleccionadas
            </button>
          </div>
        )}

        {/* Proformas Table */}
        {filteredProformas.length === 0 ? (
          <div className="bg-[#1a120b]/40 border border-white/10 rounded-3xl p-12 text-center text-gray-500">
            {searchQuery || statusFilter !== 'todos'
              ? 'No se encontraron proformas con los filtros actuales.'
              : 'No hay ninguna proforma generada aún.'}
          </div>
        ) : (
          <div className="bg-[#1a120b]/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-[#1a120b]/60">
                    {isMergeMode && (
                      <th className="px-6 py-4 text-left">
                        <input 
                          type="checkbox"
                          checked={selectedProformas.size === filteredProformas.length && filteredProformas.length > 0}
                          onChange={handleToggleSelectAll}
                          className="rounded text-[#c2a077] focus:ring-0 cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#c2a077]">N° Proforma</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#c2a077]">Cliente</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#c2a077]">Fecha Emisión</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#c2a077]">Fecha Vencimiento</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#c2a077]">Importe Total</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#c2a077]">Estado</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#c2a077] text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredProformas.map((p) => (
                    <tr
                      key={p.id}
                      className={`hover:bg-white/5 transition-colors duration-150 group ${isMergeMode && selectedProformas.has(p.id) ? 'bg-[#c2a077]/5' : ''}`}
                    >
                      {isMergeMode && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input 
                            type="checkbox"
                            checked={selectedProformas.has(p.id)}
                            onChange={() => handleToggleSelect(p.id)}
                            className="rounded text-[#c2a077] focus:ring-0 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-[#c2a077]">
                        {p.n_proforma}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white uppercase">
                        {p.cliente}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatDateLatino(p.fecha_emision)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {p.fecha_vencimiento ? formatDateLatino(p.fecha_vencimiento) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-white">
                        S/ {p.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={p.estado}
                          onChange={(e) => handleEstadoChange(p.id, p.estado, e.target.value)}
                          disabled={isPending}
                          className={`text-xs font-bold px-3 py-1.5 border rounded-xl uppercase tracking-wider bg-[#1a120b] cursor-pointer focus:outline-none focus:border-[#c2a077] ${getStatusPillClass(p.estado)}`}
                        >
                          <option value="Borrador" className="bg-[#1a120b] text-amber-400">Borrador</option>
                          <option value="Emitida" className="bg-[#1a120b] text-blue-400">Emitida</option>
                          <option value="Pagada" className="bg-[#1a120b] text-emerald-400">Pagada</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/proformas/${p.id}`}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white rounded-xl text-xs font-semibold transition-all"
                            title="Ver Detalle"
                          >
                            👁️
                          </Link>
                          <button
                            onClick={() => handleDelete(p.id, p.n_proforma)}
                            disabled={isPending}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-semibold transition-all border border-transparent hover:border-red-500/20 disabled:opacity-50"
                            title="Eliminar Proforma"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Creation Modal */}
        {showAddModal && (
          <AddProformaModal
            onClose={() => setShowAddModal(false)}
            clientes={clientes}
            conceptosPredefinidos={conceptosPredefinidos}
          />
        )}

      </div>
    </div>
  )
}
