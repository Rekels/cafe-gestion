'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createProforma, getPendingServiciosByCliente } from './actions'
import { formatDateLatino } from '@/lib/dateUtils'
import ProcessBadge from '@/components/ProcessBadge'
import DatePicker from 'react-datepicker'
import { format } from 'date-fns'

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

interface AddProformaModalProps {
  onClose: () => void
  clientes: ClientInfo[]
  conceptosPredefinidos: PredefinedConcept[]
}

interface ConceptLine {
  id: string
  descripcion: string
  cantidad: number
  precioUnitario: number
}

interface PendingService {
  id: number
  n_orden: string
  variedad: string
  proceso: string
  codigo_cafe: string
  total_costo: number | null
  created_at: string
}

export default function AddProformaModal({
  onClose,
  clientes,
  conceptosPredefinidos
}: AddProformaModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Client Selection
  const [selectedClient, setSelectedClient] = useState('')
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false)

  // Pending services of selected client
  const [pendingServices, setPendingServices] = useState<PendingService[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([])
  const [isLoadingServices, setIsLoadingServices] = useState(false)

  // Concept lines (hybrid inputs)
  const [conceptLines, setConceptLines] = useState<ConceptLine[]>([])

  // Pricing & metadata
  const [descuento, setDescuento] = useState<string>('0.00')
  const [fechaEmision, setFechaEmision] = useState<Date>(new Date())
  const [fechaVencimiento, setFechaVencimiento] = useState<Date | null>(null)
  const [notas, setNotas] = useState('')

  // Filter clients for dropdown selector
  const filteredClients = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(clientSearchQuery.toLowerCase())
  )

  // Fetch pending services when client changes
  useEffect(() => {
    if (!selectedClient) {
      setPendingServices([])
      setSelectedServiceIds([])
      return
    }

    const fetchServices = async () => {
      setIsLoadingServices(true)
      const services = await getPendingServiciosByCliente(selectedClient)
      setPendingServices(services)
      // Auto-select all pending services by default for convenience
      setSelectedServiceIds(services.map((s) => s.id))
      setIsLoadingServices(false)
    }

    fetchServices()
  }, [selectedClient])

  // Select/deselect a service
  const toggleService = (id: number) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    )
  }

  // Predefined concepts selection handler
  const handleAddConceptLine = (conceptName = '', price = 0) => {
    const newLine: ConceptLine = {
      id: Math.random().toString(36).substring(2, 9),
      descripcion: conceptName,
      cantidad: 1,
      precioUnitario: price
    }
    setConceptLines((prev) => [...prev, newLine])
  }

  const handleUpdateConceptLine = (
    id: string,
    field: keyof ConceptLine,
    value: string | number
  ) => {
    setConceptLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line
        
        if (field === 'descripcion') {
          return { ...line, descripcion: String(value) }
        } else if (field === 'cantidad') {
          return { ...line, cantidad: Math.max(0, Number(value)) }
        } else if (field === 'precioUnitario') {
          return { ...line, precioUnitario: Math.max(0, Number(value)) }
        }
        return line
      })
    )
  }

  const handleDeleteConceptLine = (id: string) => {
    setConceptLines((prev) => prev.filter((l) => l.id !== id))
  }

  // Reactively calculate totals
  const servicesSubtotal = pendingServices
    .filter((s) => selectedServiceIds.includes(s.id))
    .reduce((sum, s) => sum + (s.total_costo || 0), 0)

  const conceptsSubtotal = conceptLines.reduce(
    (sum, l) => sum + (l.cantidad * l.precioUnitario),
    0
  )

  const subtotal = servicesSubtotal + conceptsSubtotal
  const discountVal = Number(descuento) || 0
  const total = Math.max(0, subtotal - discountVal)

  // Submit proforma
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClient) {
      alert('Por favor selecciona un cliente.')
      return
    }

    // Prepare concepts array
    const cleanConceptos = conceptLines
      .filter((l) => l.descripcion.trim())
      .map((l) => ({
        descripcion: l.descripcion,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario
      }))
    startTransition(async () => {
      const res = await createProforma(
        selectedClient,
        format(fechaEmision, 'yyyy-MM-dd'),
        fechaVencimiento ? format(fechaVencimiento, 'yyyy-MM-dd') : null,
        discountVal,
        notas,
        cleanConceptos,
        selectedServiceIds
      )

      if (res.success) {
        onClose()
        router.refresh()
      } else {
        alert(res.error || 'Error al guardar la proforma.')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#1a120b] border border-white/10 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] text-gray-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#c2a077] to-yellow-200">
            📄 Nueva Proforma de Pago
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left Column: Metadata & Client */}
            <div className="space-y-4 md:col-span-1 border-r border-white/5 pr-0 md:pr-6">
              
              {/* Client Selector */}
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Cliente de Facturación
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Escribir o elegir cliente..."
                    value={clientSearchQuery}
                    onChange={(e) => {
                      setClientSearchQuery(e.target.value)
                      setIsClientDropdownOpen(true)
                      if (selectedClient !== e.target.value) {
                        setSelectedClient('')
                      }
                    }}
                    onFocus={() => setIsClientDropdownOpen(true)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c2a077]"
                  />
                  {selectedClient && (
                    <span className="absolute right-3 top-2 text-xs text-emerald-400">✓ Seleccionado</span>
                  )}
                </div>

                {isClientDropdownOpen && filteredClients.length > 0 && (
                  <div className="absolute z-10 w-full bg-[#2a1d13] border border-white/10 rounded-xl mt-1 max-h-40 overflow-y-auto shadow-2xl">
                    {filteredClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedClient(c.nombre)
                          setClientSearchQuery(c.nombre)
                          setIsClientDropdownOpen(false)
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-[#c2a077]/10 hover:text-white transition-colors uppercase font-medium"
                      >
                        {c.nombre} {c.empresa ? `(${c.empresa})` : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fecha Emision */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Fecha de Emisión
                </label>
                <DatePicker
                  selected={fechaEmision}
                  onChange={(date: Date | null) => date && setFechaEmision(date)}
                  dateFormat="dd/MM/yy"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c2a077] cursor-pointer"
                />
              </div>

              {/* Fecha Vencimiento */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Fecha de Vencimiento (Opcional)
                </label>
                <DatePicker
                  selected={fechaVencimiento}
                  onChange={(date: Date | null) => setFechaVencimiento(date)}
                  dateFormat="dd/MM/yy"
                  isClearable
                  placeholderText="Seleccionar fecha"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c2a077] cursor-pointer"
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Comentarios / Datos Bancarios
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Detalles de cuentas, condiciones de pago..."
                  rows={4}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c2a077] placeholder-gray-600"
                />
              </div>
            </div>

            {/* Right Columns: OS List & Concept Lines */}
            <div className="md:col-span-2 space-y-6">
              
              {/* Service Orders selection list */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  1. Órdenes de Servicio a Incluir
                </h3>
                
                {!selectedClient ? (
                  <div className="py-8 text-center text-gray-500 border border-dashed border-white/5 rounded-2xl text-xs">
                    Selecciona un cliente para ver sus Órdenes de Servicio pendientes.
                  </div>
                ) : isLoadingServices ? (
                  <div className="py-8 text-center text-gray-500 text-xs">
                    ⏳ Cargando órdenes de servicio...
                  </div>
                ) : pendingServices.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 border border-dashed border-white/5 rounded-2xl text-xs">
                    No hay órdenes de servicio pendientes de facturar para este cliente.
                  </div>
                ) : (
                  <div className="border border-white/10 rounded-2xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-white/5">
                    {pendingServices.map((s) => {
                      const isChecked = selectedServiceIds.includes(s.id)
                      return (
                        <div
                          key={s.id}
                          onClick={() => toggleService(s.id)}
                          className={`flex items-center justify-between p-3 cursor-pointer select-none transition-all ${
                            isChecked ? 'bg-[#c2a077]/5' : 'hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              className="accent-[#c2a077] rounded"
                            />
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                                <span>Orden #{s.n_orden}</span>
                                <span className="text-[10px] text-gray-500 font-mono tracking-wider uppercase">
                                  {s.codigo_cafe}
                                </span>
                                {s.created_at && (
                                  <span className="text-[9px] text-[#c2a077] bg-[#c2a077]/10 px-1.5 py-0.5 rounded ml-2">
                                    {formatDateLatino(s.created_at)}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-400 uppercase mt-0.5 flex items-center gap-1.5 flex-wrap">
                                {s.variedad} <ProcessBadge proceso={s.proceso} />
                              </div>
                            </div>
                          </div>
                          <div className="text-sm font-extrabold text-white">
                            S/ {s.total_costo ? s.total_costo.toFixed(2) : '0.00'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Predefined Additions List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    2. Adicionales de Tostaduría
                  </h3>
                  
                  {/* Predefined Concepts Dropdown Trigger */}
                  {conceptosPredefinidos.length > 0 && (
                    <div className="flex gap-1.5 max-w-[280px]">
                      <select
                        onChange={(e) => {
                          if (!e.target.value) return
                          const val = JSON.parse(e.target.value)
                          handleAddConceptLine(val.nombre, val.precio)
                          e.target.value = '' // reset selection dropdown
                        }}
                        className="bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-[11px] text-[#c2a077] focus:outline-none"
                      >
                        <option value="" className="bg-[#2a1d13] text-gray-400">➕ Catálogo Adicionales...</option>
                        {conceptosPredefinidos.map((cp) => (
                          <option
                            key={cp.id}
                            value={JSON.stringify({ nombre: cp.nombre, precio: cp.precio_defecto })}
                            className="bg-[#2a1d13] text-gray-200"
                          >
                            {cp.nombre} (S/ {cp.precio_defecto.toFixed(2)})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAddConceptLine('', 0)}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[11px] text-white font-semibold transition-colors border border-white/5"
                      >
                        ✍️ Concepto Libre
                      </button>
                    </div>
                  )}
                </div>

                {conceptLines.length === 0 ? (
                  <div className="py-6 text-center text-gray-500 border border-dashed border-white/5 rounded-2xl text-xs">
                    No se han agregado conceptos adicionales. Utiliza el selector superior para agregar.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {conceptLines.map((line) => (
                      <div
                        key={line.id}
                        className="grid grid-cols-12 gap-2 bg-[#2a1d13]/20 border border-white/5 rounded-xl p-3 items-center group"
                      >
                        {/* Description */}
                        <div className="col-span-6">
                          <input
                            type="text"
                            placeholder="Descripción del concepto..."
                            value={line.descripcion}
                            onChange={(e) =>
                              handleUpdateConceptLine(line.id, 'descripcion', e.target.value)
                            }
                            required
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white uppercase focus:outline-none focus:border-[#c2a077]"
                          />
                        </div>

                        {/* Cantidad */}
                        <div className="col-span-2">
                          <input
                            type="number"
                            placeholder="Cant"
                            step="any"
                            value={line.cantidad || ''}
                            onChange={(e) =>
                              handleUpdateConceptLine(line.id, 'cantidad', e.target.value)
                            }
                            required
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077] text-center"
                          />
                        </div>

                        {/* Precio Unitario */}
                        <div className="col-span-3">
                          <div className="relative">
                            <span className="absolute left-1.5 top-1.5 text-gray-500 text-[10px]">S/</span>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Precio"
                              value={line.precioUnitario || ''}
                              onChange={(e) =>
                                handleUpdateConceptLine(line.id, 'precioUnitario', e.target.value)
                              }
                              required
                              className="w-full bg-black/40 border border-white/10 rounded-lg pl-5 pr-1 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077]"
                            />
                          </div>
                        </div>

                        {/* Delete button */}
                        <div className="col-span-1 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteConceptLine(line.id)}
                            className="text-red-400 hover:text-red-300 text-xs transition-colors p-1"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Totals Summary */}
          <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-end justify-between gap-6">
            
            {/* Descuento Input */}
            <div className="w-full md:w-52">
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                Descuento Total (Opcional)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2 text-gray-500 text-xs">S/</span>
                <input
                  type="number"
                  step="0.01"
                  value={descuento}
                  onChange={(e) => setDescuento(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Calculations block */}
            <div className="w-full md:w-80 bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Subtotal (OS + Adicionales):</span>
                <span className="font-semibold text-white">S/ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 border-b border-white/5 pb-2.5">
                <span>Descuento Aplicado:</span>
                <span className="font-semibold text-red-400">- S/ {discountVal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#c2a077]">Total General:</span>
                <span className="text-2xl font-extrabold text-white">S/ {total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="border-t border-white/5 pt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2.5 bg-[#c2a077] hover:bg-[#b08f65] text-[#1a120b] text-xs font-bold rounded-xl transition-all shadow-md shadow-[#c2a077]/10 disabled:opacity-50"
            >
              {isPending ? '⏳ Creando...' : '📝 Crear Proforma'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
