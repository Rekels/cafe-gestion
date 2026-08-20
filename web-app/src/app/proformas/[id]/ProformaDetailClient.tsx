'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { formatDateLatino } from '@/lib/dateUtils'
import { useRouter } from 'next/navigation'
import { updateProforma, updateProformaEstado, getPendingServiciosByCliente } from '../actions'
import ProcessBadge from '@/components/ProcessBadge'
import DatePicker from 'react-datepicker'
import { format } from 'date-fns'

interface ProformaConcept {
  id: number
  descripcion: string
  cantidad: number
  precio_unitario: number
  total: number
}

interface LinkedService {
  id: number
  n_orden: string
  variedad: string
  proceso: string
  productor: string | null
  codigo_cafe: string
  m_percent: number | null
  aw: number | null
  d: number | null
  tueste_moisture?: number | null
  tueste_density?: number | null
  tueste_aw?: number | null
  pc: number | null
  hc: number | null
  trillado_precio_kg: number | null
  seleccion_precio_kg: number | null
  gc: number | null
  rc: number | null
  tueste_precio_kg: number | null
  molienda_precio_kg: number | null
  total: number | null
  envasado_precio_unidad: number | null
  envasado_cantidad: number | null
  envasado_tipo: string | null
  total_envasado: number | null
  total_costo: number | null
  fecha_trillado?: string | null
  fecha_tueste?: string | null
}

interface PredefinedConcept {
  id: number
  nombre: string
  precio_defecto: number
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
  productor: string | null
  codigo_cafe: string
  m_percent: number | null
  aw: number | null
  d: number | null
  pc: number | null
  hc: number | null
  trillado_precio_kg: number | null
  seleccion_precio_kg: number | null
  gc: number | null
  rc: number | null
  tueste_precio_kg: number | null
  molienda_precio_kg: number | null
  total: number | null
  envasado_precio_unidad: number | null
  envasado_cantidad: number | null
  envasado_tipo: string | null
  total_envasado: number | null
  total_costo: number | null
}

interface ProformaDetails {
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
  conceptos: ProformaConcept[]
  servicios: LinkedService[]
}

interface ProformaDetailClientProps {
  proforma: ProformaDetails
  clienteInfo: any
  globalAjustes: Record<string, string>
  conceptosPredefinidos: PredefinedConcept[]
}

export default function ProformaDetailClient({
  proforma,
  clienteInfo,
  globalAjustes,
  conceptosPredefinidos
}: ProformaDetailClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showEditModal, setShowEditModal] = useState(false)

  // Transition state select handler
  const handleEstadoChange = async (newEstado: string) => {
    if (newEstado === proforma.estado) return
    if (newEstado === 'Pagada' && !confirm('¿Estás seguro de marcar esta proforma como PAGADA? Esto cambiará automáticamente todas las Órdenes de Servicio vinculadas a "Completado".')) return

    startTransition(async () => {
      const res = await updateProformaEstado(proforma.id, newEstado)
      if (res.success) {
        router.refresh()
      } else {
        alert(res.error || 'Error al cambiar el estado.')
      }
    })
  }

  // Handle printing
  const handlePrint = () => {
    const oldTitle = document.title
    document.title = `Proforma-${proforma.n_proforma}-${proforma.cliente.replace(/\s+/g, '_')}`
    window.print()
    setTimeout(() => {
      document.title = oldTitle
    }, 1000)
  }

  // Get status pill class
  const getStatusColorClass = (estado: string) => {
    switch (estado) {
      case 'Borrador':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      case 'Emitida':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
      case 'Pagada':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30'
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1a120b] via-[#2a1d13] to-[#1a120b] text-gray-100 p-4 md:p-8 font-sans selection:bg-[#c2a077]/30 print:bg-white print:text-black">
      
      {/* Inject print styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body, html {
            background: white !important;
            color: black !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:m-0 {
            margin: 0 !important;
          }
          .invoice-card {
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .invoice-card * {
            color: black !important;
            border-color: #e5e7eb !important;
          }
          .print-header-bg {
            background-color: #f3f4f6 !important;
          }
          .os-detail-card {
            padding: 0.75rem !important;
            margin-bottom: 1rem !important;
            border-radius: 0px !important;
            border-width: 1px !important;
          }
          .os-detail-card * {
            font-size: 10px !important;
            line-height: 1.25 !important;
          }
          .os-detail-card h3 {
            font-size: 11px !important;
          }
          .os-detail-card th, .os-detail-card td {
            padding: 0.375rem !important;
          }
          .os-detail-card .p-4 {
            padding: 0.5rem !important;
          }
          .os-detail-card .mb-6, .os-detail-card .mb-4 {
            margin-bottom: 0.5rem !important;
          }
          /* Custom print adjustments for Proforma */
          .print\\:text-\\[10px\\] {
            font-size: 10px !important;
          }
          .print\\:text-\\[9px\\] {
            font-size: 9px !important;
          }
          .print\\:py-1 {
            padding-top: 0.25rem !important;
            padding-bottom: 0.25rem !important;
          }
          .print\\:px-2 {
            padding-left: 0.5rem !important;
            padding-right: 0.5rem !important;
          }
          .print\\:p-3 {
            padding: 0.75rem !important;
          }
        }
      `}} />

      <div className="max-w-4xl mx-auto space-y-6 print:p-0 print:m-0">
        
        {/* Navigation & Controls header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6 print:hidden">
          <Link
            href="/proformas"
            className="flex items-center gap-1.5 text-xs font-semibold text-[#c2a077] hover:text-white transition-colors"
          >
            ← Volver a Proformas
          </Link>

          <div className="flex items-center gap-3">
            {/* Edit button */}
            <button
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              ✏️ Editar
            </button>

            {/* Print button */}
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-[#c2a077] hover:bg-[#b08f65] text-[#1a120b] rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>🖨️</span> Imprimir / PDF
            </button>

            {/* State selector */}
            <div className="flex items-center border border-white/10 rounded-xl bg-black/40 px-3 py-1.5">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider mr-2 font-semibold">Estado:</span>
              <select
                value={proforma.estado}
                disabled={isPending}
                onChange={(e) => handleEstadoChange(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#c2a077] focus:outline-none cursor-pointer"
              >
                <option value="Borrador">📝 Borrador</option>
                <option value="Emitida">📨 Emitida</option>
                <option value="Pagada">✅ Pagada</option>
              </select>
            </div>
          </div>
        </div>

        {/* Invoice Layout Card */}
        <div className="invoice-card bg-[#1a120b]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-12 shadow-2xl space-y-6 print:p-0 print:border-none print:shadow-none print:space-y-2">
          
          {/* Header row: Company logo/info & Invoice number/date */}
          <div className="flex flex-row justify-between items-start gap-6 border-b border-white/5 pb-8 print:flex-row print:items-start">
            
            {/* Company / Issuer Details */}
            <div className="space-y-2 max-w-[50%]">
              <div className="flex items-center gap-2">
                <span className="text-3xl">☕</span>
                <span className="text-xl md:text-2xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#c2a077] to-yellow-100 font-sans print:text-black print:bg-none">
                  {globalAjustes.empresa_nombre || 'PANTIWAYTA TOSTADURÍA'}
                </span>
              </div>
              <div className="text-xs text-gray-400 space-y-1 print:text-black">
                <div>RUC: {globalAjustes.empresa_ruc || '20610269886'}</div>
                <div>{globalAjustes.empresa_direccion || 'Calle Principal N° 123'}</div>
                <div>Telf: {globalAjustes.empresa_telefono || '+51 987 654 321'}</div>
                <div>Email: {globalAjustes.empresa_correo || 'hola@pantiwayta.com'}</div>
              </div>
            </div>

            {/* Proforma Number & dates */}
            <div className="text-right space-y-2 max-w-[50%]">
              <div className="text-sm font-mono font-bold tracking-widest text-[#c2a077] print:text-black">
                {proforma.n_proforma}
              </div>
              <h2 className="text-2xl font-extrabold text-white uppercase print:text-black">
                PROFORMA
              </h2>
              <div className="text-xs text-gray-400 space-y-1 print:text-black">
                <div>Fecha Emisión: <span className="font-bold text-white print:text-black">{formatDateLatino(proforma.fecha_emision)}</span></div>
                {proforma.fecha_vencimiento && (
                  <div>Fecha Vencimiento: <span className="font-bold text-white print:text-black">{formatDateLatino(proforma.fecha_vencimiento)}</span></div>
                )}

              </div>
              {/* Rotated status stamp */}
              <div className="pt-2 flex justify-end">
                <span className={`px-4 py-1.5 border-2 rounded-xl font-extrabold uppercase tracking-widest text-[10px] rotate-[-5deg] shadow-lg inline-block ${
                  proforma.estado === 'Pagada' 
                    ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' 
                    : proforma.estado === 'Emitida' 
                    ? 'border-blue-500 text-blue-500 bg-blue-500/10' 
                    : 'border-amber-500 text-amber-500 bg-amber-500/10'
                }`}>
                  {proforma.estado}
                </span>
              </div>
            </div>
          </div>

          {/* Customer info box */}
          <div className="bg-[#2a1d13]/20 border border-white/5 rounded-2xl p-6 print:p-3 grid grid-cols-1 sm:grid-cols-2 gap-4 print:bg-gray-50 print:border-gray-200">
            <div className="space-y-1">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider print:text-gray-500 print:text-[9px]">PROFORMA PARA</div>
              <div className="text-lg font-bold text-white uppercase print:text-black print:text-sm">{proforma.cliente}</div>
              {clienteInfo?.razon_social && (
                <div className="text-xs text-gray-300 print:text-gray-700 uppercase print:text-[10px]">
                  <span className="font-semibold text-gray-400 print:text-gray-500 text-[10px] print:text-[9px] mr-1">RAZÓN SOCIAL:</span>{clienteInfo.razon_social}
                </div>
              )}
            </div>
            <div className="text-left sm:text-right text-xs text-gray-400 space-y-1 print:text-gray-600 sm:self-center print:text-[10px]">
              {clienteInfo?.empresa && (
                <div className="uppercase">
                  <span className="font-semibold text-gray-500 mr-1">EMPRESA:</span>{clienteInfo.empresa}
                </div>
              )}
              {clienteInfo?.ruc && (
                <div className="uppercase">
                  <span className="font-semibold text-gray-500 mr-1">RUC:</span>{clienteInfo.ruc}
                </div>
              )}
              {clienteInfo?.telefono && <div><span className="font-semibold text-gray-500 mr-1">Telf:</span> {clienteInfo.telefono}</div>}
              {clienteInfo?.correo && <div><span className="font-semibold text-gray-500 mr-1">Correo:</span> {clienteInfo.correo}</div>}
            </div>
          </div>

          {/* Separated Line Items tables */}
          <div className="space-y-6">
            {/* 1. Services Block */}
            {proforma.servicios && proforma.servicios.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-[#c2a077] uppercase tracking-wider print:text-black">
                  ☕ Servicios de Procesamiento de Café
                </h3>
                <div className="border border-white/10 rounded-2xl overflow-hidden print:border-gray-200">
                  <table className="w-full text-left border-collapse text-sm print:text-[10px]">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-xs font-bold text-gray-400 uppercase tracking-wider print-header-bg print:border-gray-200 print:text-black print:text-[8px]">
                        <th className="px-6 py-3 print:px-2 print:py-1">Descripción de la Orden</th>
                        <th className="px-6 py-3 print:px-2 print:py-1 text-center">Cant</th>
                        <th className="px-6 py-3 print:px-2 print:py-1 text-right">P. Unitario</th>
                        <th className="px-6 py-3 print:px-2 print:py-1 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 print:divide-gray-200 text-gray-200 print:text-black">
                      {proforma.servicios.map((s) => (
                        <tr key={s.id} className="hover:bg-white/5 print:hover:bg-transparent">
                          <td className="px-6 py-3 print:px-2 print:py-1">
                            <div className="font-bold text-white print:text-black">
                              ORDEN DE SERVICIO #{s.n_orden}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono mt-0.5 uppercase print:text-[9px] flex items-center gap-1.5 flex-wrap">
                              CÓD: {s.codigo_cafe} • {s.variedad} <ProcessBadge proceso={s.proceso} className="print:border-gray-300 print:text-black print:bg-gray-100" />
                            </div>
                          </td>
                          <td className="px-6 py-3 print:px-2 print:py-1 text-center text-gray-400 print:text-black">1.0</td>
                          <td className="px-6 py-3 print:px-2 print:py-1 text-right text-gray-400 print:text-black">
                            S/ {s.total_costo ? s.total_costo.toFixed(2) : '0.00'}
                          </td>
                          <td className="px-6 py-3 print:px-2 print:py-1 text-right font-semibold text-white print:text-black">
                            S/ {s.total_costo ? s.total_costo.toFixed(2) : '0.00'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. Extra Concepts Block */}
            {proforma.conceptos && proforma.conceptos.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-[#c2a077] uppercase tracking-wider print:text-black">
                  📦 Adicionales y Venta de Suministros
                </h3>
                <div className="border border-white/10 rounded-2xl overflow-hidden print:border-gray-200">
                  <table className="w-full text-left border-collapse text-sm print:text-[10px]">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-xs font-bold text-gray-400 uppercase tracking-wider print-header-bg print:border-gray-200 print:text-black print:text-[9px]">
                        <th className="px-6 py-3 print:px-2 print:py-1">Concepto Adicional</th>
                        <th className="px-6 py-3 print:px-2 print:py-1 text-center">Cant</th>
                        <th className="px-6 py-3 print:px-2 print:py-1 text-right">P. Unitario</th>
                        <th className="px-6 py-3 print:px-2 print:py-1 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 print:divide-gray-200 text-gray-200 print:text-black">
                      {proforma.conceptos.map((c) => (
                        <tr key={c.id} className="hover:bg-white/5 print:hover:bg-transparent">
                          <td className="px-6 py-3 print:px-2 print:py-1">
                            <div className="font-bold text-white print:text-black uppercase">
                              {c.descripcion}
                            </div>
                          </td>
                          <td className="px-6 py-3 print:px-2 print:py-1 text-center text-gray-400 print:text-black">
                            {c.cantidad}
                          </td>
                          <td className="px-6 py-3 print:px-2 print:py-1 text-right text-gray-400 print:text-black">
                            S/ {c.precio_unitario.toFixed(2)}
                          </td>
                          <td className="px-6 py-3 print:px-2 print:py-1 text-right font-semibold text-white print:text-black">
                            S/ {c.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Totals Breakdown row */}
          <div className="flex justify-end pt-4">
            {/* Pricing breakdown */}
            <div className="w-full md:w-80 space-y-2 bg-[#2a1d13]/15 border border-white/5 rounded-2xl p-6 print:bg-transparent print:border-none print:p-0">
              <div className="flex items-center justify-between text-xs text-gray-400 print:text-black">
                <span>Subtotal:</span>
                <span className="font-semibold text-white print:text-black">S/ {proforma.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 border-b border-white/5 pb-2.5 print:border-gray-200 print:text-black">
                <span>Descuento:</span>
                <span className="font-semibold text-red-400">- S/ {proforma.descuento.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-bold text-[#c2a077] print:text-black">Total a Pagar:</span>
                <span className="text-2xl font-extrabold text-white print:text-black">S/ {proforma.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Bottom Layout Grid: Conditions & Payment/Notes */}
          <div className="border-t border-white/5 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 print:border-gray-200 print:grid-cols-2 print:pt-2">
            
            {/* Column 1: Condiciones del Servicio */}
            <div className="space-y-3">
              <h4 className="text-[11px] md:text-xs text-[#c2a077] uppercase tracking-wider font-extrabold print:text-black">
                📌 Condiciones del Servicio
              </h4>
              <ul className="text-xs md:text-sm text-gray-400 space-y-3 list-disc pl-4 leading-relaxed print:text-gray-700">
                <li>
                  <span className="font-bold text-gray-300 print:text-black">Empaques / Recipientes:</span> Por defecto, la bolsa elegida por Pantiwayta para entregar el café procesado cuesta <span className="font-bold text-white print:text-black">S/ 1.00</span>. En caso de que el cliente lo desee, puede cambiar a otra bolsa que se tenga en stock según disponibilidad del catálogo.
                </li>
                <li>
                  <span className="font-bold text-gray-300 print:text-black">Bienes en Custodia:</span> El cliente debe indicar las cosas adicionales que está dejando en el local (como Sacos, GrainPro, etc.) para asegurar su devolución posterior.
                </li>
                <li>
                  <span className="font-bold text-gray-300 print:text-black">Almacenamiento y Retiro:</span> El café procesado de un cliente será almacenado hasta 1 semana sin costo. El almacenaje de café en oro verde o tostado, excedido este plazo, será de <span className="font-bold text-white print:text-black">S/ 1.00 por kg por mes</span>.
                </li>
              </ul>
            </div>

            {/* Column 2: Payment Methods & Notes */}
            <div className="space-y-4">
              {(globalAjustes.empresa_yape || globalAjustes.empresa_banco_nombre || globalAjustes.empresa_titular) && (
                <div className="bg-[#2a1d13]/25 border border-white/5 rounded-2xl p-5 md:p-6 space-y-4 print:bg-transparent print:border-gray-200">
                  <div className="text-xs md:text-sm text-[#c2a077] uppercase tracking-wider font-extrabold print:text-black mb-2">Formas de Pago Autorizadas</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-base text-gray-300 print:text-black">
                    {globalAjustes.empresa_yape && (
                      <div className="col-span-1">
                        <span className="font-semibold text-gray-400 print:text-gray-600 block text-xs uppercase mb-0.5">YAPE / PLIN</span>
                        <span className="font-bold text-[#c2a077] print:text-black text-base">{globalAjustes.empresa_yape}</span>
                      </div>
                    )}
                    {globalAjustes.empresa_banco_nombre && (
                      <div className="col-span-1">
                        <span className="font-semibold text-gray-400 print:text-gray-600 block text-xs uppercase mb-0.5">BANCO</span>
                        <span className="font-bold text-white print:text-black text-base">{globalAjustes.empresa_banco_nombre}</span>
                      </div>
                    )}
                    {globalAjustes.empresa_banco_cuenta && (
                      <div className="col-span-1">
                        <span className="font-semibold text-gray-400 print:text-gray-600 block text-xs uppercase mb-0.5">N° CUENTA</span>
                        <span className="font-mono text-white print:text-black text-sm">{globalAjustes.empresa_banco_cuenta}</span>
                      </div>
                    )}
                    {globalAjustes.empresa_banco_cci && (
                      <div className="col-span-1 sm:col-span-2 print:col-span-2">
                        <span className="font-semibold text-gray-400 print:text-gray-600 block text-xs uppercase mb-0.5">CCI</span>
                        <span className="font-mono text-white print:text-black text-sm break-all">{globalAjustes.empresa_banco_cci}</span>
                      </div>
                    )}
                    <div className="col-span-1 sm:col-span-2 print:col-span-2 border-t border-white/5 pt-2 mt-1 print:border-gray-200">
                      <span className="font-semibold text-gray-400 print:text-gray-600 block text-xs uppercase mb-0.5">TITULAR DE LA CUENTA</span>
                      <span className="font-bold text-[#c2a077] print:text-black text-sm">{globalAjustes.empresa_titular || 'Wayta Café S.R.L.'}</span>
                    </div>
                  </div>
                </div>
              )}

              {proforma.notas && proforma.notas.trim() && (
                <div className="space-y-2">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider">Notas Adicionales</div>
                  <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap print:text-gray-700 bg-white/5 rounded-xl p-4 border border-white/5 print:bg-transparent print:border-none print:p-0">
                    {proforma.notas}
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* 6. Detailed Service Orders (Printed at the bottom / additional pages) */}
        {proforma.servicios && proforma.servicios.length > 0 && (
          <div className="mt-8 space-y-8 print:mt-8 print:space-y-0 print:break-before-page">
            <div className="border-b border-white/10 pb-2 mb-4 print:border-black print:pb-3">
              <h2 className="text-xl font-bold text-[#c2a077] print:text-black uppercase tracking-wider">
                Resumen de Procesamiento
              </h2>
              <p className="text-xs text-gray-400 print:text-gray-500 mt-1">
                Detalle técnico y financiero de las órdenes de servicio asociadas.
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-8 print:block print:space-y-0">
              {proforma.servicios.map((s, idx) => {
                const pc = s.pc || 0;
                const hc = s.hc || 0;
                const gc = s.gc || 0;
                const rc = s.rc || 0;

                const hasTrillado = s.trillado_precio_kg !== null || pc > 0;
                const hasSeleccion = s.seleccion_precio_kg !== null;
                const hasTueste = s.tueste_precio_kg !== null || gc > 0;
                const hasMolienda = s.molienda_precio_kg !== null || s.total !== null;
                const hasEnvasado = s.envasado_precio_unidad !== null || (s.envasado_cantidad || 0) > 0;

                const selectionInput = hc || pc || 0;
                const totalMoliendaWeight = s.total || 0;

                const totalTrillado = hasTrillado ? pc * (s.trillado_precio_kg || 0) : 0;
                const totalSeleccion = hasSeleccion ? selectionInput * (s.seleccion_precio_kg || 0) : 0;
                const totalTueste = hasTueste ? gc * (s.tueste_precio_kg || 0) : 0;
                const totalMolienda = hasMolienda ? totalMoliendaWeight * (s.molienda_precio_kg || 0) : 0;
                const totalEnvasado = hasEnvasado ? (s.envasado_cantidad || 0) * (s.envasado_precio_unidad || 0) : 0;

                const mermaTrilla = pc > 0 && hc > 0 ? `${((pc - hc) / pc * 100).toFixed(1)}%` : '-';
                const mermaTueste = gc > 0 && rc > 0 ? `${((gc - rc) / gc * 100).toFixed(1)}%` : '-';

                const formatMoney = (val: number | null) => {
                  if (val === null || val === undefined) return '-';
                  return `S/ ${val.toFixed(2)}`;
                };

                return (
                  <div 
                    key={s.id} 
                    className={`os-detail-card bg-[#1a120b]/40 border border-white/5 rounded-3xl p-6 print:bg-white print:border-2 print:border-black print:rounded-none print:p-6 print:shadow-none print:w-full print:mx-0 print:mb-8 ${
                      idx > 0 && idx % 2 === 0 ? 'print:break-before-page' : ''
                    }`}
                  >
                    {/* Header of detailed card */}
                    <div className="flex justify-between items-start border-b border-white/10 print:border-black pb-3 mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-white print:text-black uppercase">
                          Orden de Servicio #{s.n_orden}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[#c2a077] print:text-black font-mono font-bold tracking-wider bg-[#c2a077]/10 print:bg-transparent px-2 py-0.5 rounded uppercase">
                          {s.codigo_cafe || '-'}
                        </span>
                      </div>
                    </div>

                    {/* Metadata grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 text-xs print:text-black">
                      <div className="border-b border-white/5 print:border-gray-200 pb-2">
                        <span className="text-gray-500 block text-[10px] uppercase font-semibold">Cliente</span>
                        <span className="font-bold text-white print:text-black uppercase">{proforma.cliente}</span>
                      </div>
                      <div className="border-b border-white/5 print:border-gray-200 pb-2">
                        <span className="text-gray-500 block text-[10px] uppercase font-semibold">Variedad</span>
                        <span className="font-bold text-white print:text-black uppercase">{s.variedad || '-'}</span>
                      </div>
                      <div className="border-b border-white/5 print:border-gray-200 pb-2">
                        <span className="font-bold text-white print:text-black uppercase">
                          {s.proceso ? <ProcessBadge proceso={s.proceso} className="print:border-gray-300 print:text-black print:bg-gray-100" /> : '-'}
                        </span>
                      </div>
                      <div className="border-b border-white/5 print:border-gray-200 pb-2">
                        <span className="text-gray-500 block text-[10px] uppercase font-semibold">Humedad / AW / D</span>
                        <span className="font-bold text-white print:text-black">
                          {s.m_percent ? `${s.m_percent}%` : (s.tueste_moisture ? `${s.tueste_moisture}%` : '-')} | {s.aw || s.tueste_aw || '-'} | {s.d || s.tueste_density || '-'}
                        </span>
                      </div>
                    </div>

                    {/* Service detail table */}
                    <div className="overflow-x-auto rounded-xl border border-white/10 print:border-2 print:border-black print:rounded-none">
                      <table className="w-full text-left text-xs min-w-[500px]">
                        <thead>
                          <tr className="bg-[#1a120b] text-[#c2a077] font-bold uppercase tracking-wider text-[10px] print:bg-gray-100 print:text-black">
                            <th className="p-3 border-b border-white/5 print:border-black">Detalle</th>
                            <th className="p-3 border-b border-white/5 print:border-black text-center">Trillado (🌾)</th>
                            <th className="p-3 border-b border-white/5 print:border-black text-center">Selección (✨)</th>
                            <th className="p-3 border-b border-white/5 print:border-black text-center">Tueste (🔥)</th>
                            <th className="p-3 border-b border-white/5 print:border-black text-center">Molienda (☕)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 print:divide-black text-gray-300 print:text-black">
                          {/* FECHA DE PROCESO */}
                          <tr>
                            <td className="p-3 font-bold text-white print:text-black border-r border-white/5 print:border-black">FECHA DE PROCESO</td>
                            <td className="p-3 text-center bg-white/5 print:bg-transparent">{hasTrillado ? formatDateLatino(s.fecha_trillado) : '-'}</td>
                            <td className="p-3 text-center bg-white/5 print:bg-transparent">{hasSeleccion ? '-' : '-'}</td>
                            <td className="p-3 text-center bg-white/5 print:bg-transparent">{hasTueste ? formatDateLatino(s.fecha_tueste) : '-'}</td>
                            <td className="p-3 text-center bg-white/5 print:bg-transparent">{hasMolienda ? '-' : '-'}</td>
                          </tr>
                          {/* PESO IN */}
                          <tr>
                            <td className="p-3 font-bold text-white print:text-black border-r border-white/5 print:border-black">PESO IN (KG)</td>
                            <td className="p-3 text-center">{hasTrillado ? `${pc} kg` : '-'}</td>
                            <td className="p-3 text-center">{hasSeleccion ? `${selectionInput} kg` : '-'}</td>
                            <td className="p-3 text-center">{hasTueste ? `${gc} kg` : '-'}</td>
                            <td className="p-3 text-center">{hasMolienda ? `${totalMoliendaWeight} kg` : '-'}</td>
                          </tr>
                          {/* PESO OUT */}
                          <tr>
                            <td className="p-3 font-bold text-white print:text-black border-r border-white/5 print:border-black">PESO OUT (KG)</td>
                            <td className="p-3 text-center">{hasTrillado ? `${hc} kg` : '-'}</td>
                            <td className="p-3 text-center">-</td>
                            <td className="p-3 text-center">{hasTueste && rc > 0 ? `${rc} kg` : '-'}</td>
                            <td className="p-3 text-center">-</td>
                          </tr>
                          {/* MERMA */}
                          <tr>
                            <td className="p-3 font-bold text-white print:text-black border-r border-white/5 print:border-black">MERMA %</td>
                            <td className="p-3 text-center text-rose-400 print:text-black font-semibold">{hasTrillado ? mermaTrilla : '-'}</td>
                            <td className="p-3 text-center">-</td>
                            <td className="p-3 text-center text-rose-400 print:text-black font-semibold">{hasTueste ? mermaTueste : '-'}</td>
                            <td className="p-3 text-center">-</td>
                          </tr>
                          {/* PRECIO */}
                          <tr>
                            <td className="p-3 font-bold text-white print:text-black border-r border-white/5 print:border-black">PRECIO X KG</td>
                            <td className="p-3 text-center">{hasTrillado ? formatMoney(s.trillado_precio_kg) : '-'}</td>
                            <td className="p-3 text-center">{hasSeleccion ? formatMoney(s.seleccion_precio_kg) : '-'}</td>
                            <td className="p-3 text-center">{hasTueste ? formatMoney(s.tueste_precio_kg) : '-'}</td>
                            <td className="p-3 text-center">{hasMolienda ? formatMoney(s.molienda_precio_kg) : '-'}</td>
                          </tr>
                          {/* TOTAL SERVICIO */}
                          <tr className="bg-white/5 print:bg-transparent">
                            <td className="p-3 font-bold text-white print:text-black border-r border-white/5 print:border-black">TOTAL SERVICIO</td>
                            <td className="p-3 text-center font-bold text-[#c2a077] print:text-black">{hasTrillado ? formatMoney(totalTrillado) : '-'}</td>
                            <td className="p-3 text-center font-bold text-[#c2a077] print:text-black">{hasSeleccion ? formatMoney(totalSeleccion) : '-'}</td>
                            <td className="p-3 text-center font-bold text-[#c2a077] print:text-black">{hasTueste ? formatMoney(totalTueste) : '-'}</td>
                            <td className="p-3 text-center font-bold text-[#c2a077] print:text-black">{hasMolienda ? formatMoney(totalMolienda) : '-'}</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Envasado Info */}
                      {hasEnvasado && (
                        <div className="border-t border-white/10 print:border-black bg-white/5 print:bg-transparent p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase font-semibold block">Servicio de Envasado</span>
                            <span className="text-xs text-white print:text-black font-bold uppercase">
                              {s.envasado_tipo === 'grano' && 'Tostado en Grano'}
                              {s.envasado_tipo === 'molido' && 'Molido y Envasado'}
                              {s.envasado_tipo === 'escogido' && 'Escogido y Envasado'}
                              {!s.envasado_tipo && '-'}
                            </span>
                          </div>
                          <div className="flex gap-6 text-xs text-right">
                            <div>
                              <span className="text-[10px] text-gray-500 block">Cantidad</span>
                              <span className="font-bold text-white print:text-black">{s.envasado_cantidad || 0} und</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-500 block">Total Envasado</span>
                              <span className="font-bold text-[#c2a077] print:text-black">{formatMoney(totalEnvasado)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Costo Total de la Orden de Servicio */}
                      <div className="border-t border-[#c2a077]/30 print:border-black bg-[#c2a077]/5 print:bg-gray-100 p-4 flex justify-between items-center">
                        <span className="text-xs font-extrabold text-[#c2a077] print:text-black uppercase tracking-wider">
                          Total Orden de Servicio #{s.n_orden}
                        </span>
                        <span className="text-lg font-extrabold text-white print:text-black font-mono">
                          {formatMoney(s.total_costo)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Edit Proforma Modal component */}
      {showEditModal && (
        <EditProformaModal
          onClose={() => setShowEditModal(false)}
          proforma={proforma}
          conceptosPredefinidos={conceptosPredefinidos}
        />
      )}

    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// EDIT PROFORMA MODAL
// ═══════════════════════════════════════════════════════════

interface EditProformaModalProps {
  onClose: () => void
  proforma: ProformaDetails
  conceptosPredefinidos: PredefinedConcept[]
}

function EditProformaModal({
  onClose,
  proforma,
  conceptosPredefinidos
}: EditProformaModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Selected client is fixed during edit
  const [cliente] = useState(proforma.cliente)

  // Pending services + already linked ones
  const [pendingServices, setPendingServices] = useState<PendingService[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>(
    proforma.servicios.map((s) => s.id)
  )
  const [isLoadingServices, setIsLoadingServices] = useState(false)

  // Concepts
  const [conceptLines, setConceptLines] = useState<ConceptLine[]>(() =>
    proforma.conceptos.map((c) => ({
      id: Math.random().toString(36).substring(2, 9),
      descripcion: c.descripcion,
      cantidad: c.cantidad,
      precioUnitario: c.precio_unitario
    }))
  )

  // Metadata
  const [descuento, setDescuento] = useState<string>(String(proforma.descuento))
  const [fechaEmision, setFechaEmision] = useState<Date>(new Date(proforma.fecha_emision + 'T00:00:00'))
  const [fechaVencimiento, setFechaVencimiento] = useState<Date | null>(proforma.fecha_vencimiento ? new Date(proforma.fecha_vencimiento + 'T00:00:00') : null)
  const [notas, setNotas] = useState(proforma.notas || '')

  // Fetch candidate services
  useEffect(() => {
    const fetchServices = async () => {
      setIsLoadingServices(true)
      const services = await getPendingServiciosByCliente(cliente, proforma.id)
      setPendingServices(services)
      setIsLoadingServices(false)
    }

    fetchServices()
  }, [cliente, proforma.id])

  const toggleService = (id: number) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    )
  }

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
        if (field === 'descripcion') return { ...line, descripcion: String(value) }
        if (field === 'cantidad') return { ...line, cantidad: Math.max(0, Number(value)) }
        if (field === 'precioUnitario') return { ...line, precioUnitario: Math.max(0, Number(value)) }
        return line
      })
    )
  }

  const handleDeleteConceptLine = (id: string) => {
    setConceptLines((prev) => prev.filter((l) => l.id !== id))
  }

  // Reactive calculations
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

  // Submit edit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const cleanConceptos = conceptLines
      .filter((l) => l.descripcion.trim())
      .map((l) => ({
        descripcion: l.descripcion,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario
      }))

    startTransition(async () => {
      const res = await updateProforma(
        proforma.id,
        cliente,
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
            ✏️ Editar Proforma {proforma.n_proforma}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left Column */}
            <div className="space-y-4 md:col-span-1 border-r border-white/5 pr-0 md:pr-6">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Cliente de Facturación
                </label>
                <input
                  type="text"
                  value={cliente}
                  disabled
                  className="w-full bg-black/35 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-400 focus:outline-none uppercase font-bold"
                />
              </div>

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

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Comentarios / Datos Bancarios
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Detalles de cuentas, condiciones de pago..."
                  rows={4}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c2a077]"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="md:col-span-2 space-y-6">
              
              {/* Service Selection */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  1. Órdenes de Servicio a Incluir
                </h3>
                
                {isLoadingServices ? (
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
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                <span>Orden #{s.n_orden}</span>
                                <span className="text-[10px] text-gray-500 font-mono tracking-wider uppercase">
                                  {s.codigo_cafe}
                                </span>
                              </div>
                              <div className="text-[10px] text-gray-400 uppercase mt-0.5">
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

              {/* Concepts Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    2. Adicionales de Tostaduría
                  </h3>
                  
                  {conceptosPredefinidos.length > 0 && (
                    <div className="flex gap-1.5 max-w-[280px]">
                      <select
                        onChange={(e) => {
                          if (!e.target.value) return
                          const val = JSON.parse(e.target.value)
                          handleAddConceptLine(val.nombre, val.precio)
                          e.target.value = ''
                        }}
                        className="bg-black/80 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-[#c2a077] transition-colors"
                      >
                        <option value="" className="bg-[#1a120b] text-gray-400">➕ Catálogo Adicionales...</option>
                        {conceptosPredefinidos.map((cp) => (
                          <option
                            key={cp.id}
                            value={JSON.stringify({ nombre: cp.nombre, precio: cp.precio_defecto })}
                            className="bg-[#2a1d13] text-gray-100 font-medium"
                          >
                            {cp.nombre} (S/ {cp.precio_defecto.toFixed(2)})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAddConceptLine('', 0)}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-[11px] text-white font-semibold transition-colors border border-white/10"
                      >
                        ✍️ Concepto Libre
                      </button>
                    </div>
                  )}
                </div>

                {conceptLines.length === 0 ? (
                  <div className="py-6 text-center text-gray-500 border border-dashed border-white/5 rounded-2xl text-xs">
                    No se han agregado conceptos adicionales.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {conceptLines.map((line) => (
                      <div
                        key={line.id}
                        className="grid grid-cols-12 gap-2 bg-[#2a1d13]/20 border border-white/5 rounded-xl p-3 items-center group"
                      >
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

                        <div className="col-span-2">
                          <input
                            type="number"
                            placeholder="Cant"
                            value={line.cantidad || ''}
                            onChange={(e) =>
                              handleUpdateConceptLine(line.id, 'cantidad', e.target.value)
                            }
                            required
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077] text-center"
                          />
                        </div>

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

          {/* Summary calculations */}
          <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-end justify-between gap-6">
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

          {/* Form Actions */}
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
              {isPending ? '⏳ Guardando...' : '💾 Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
