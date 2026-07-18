'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ExportActions from './ExportActions'
import EditServiceModal from './EditServiceModal'
import { crearSesionYProgramarTueste } from '@/app/actions'
import { createProforma } from '@/app/proformas/actions'
import { formatDateLatino } from '@/lib/dateUtils'
import FaseTrilladoModal from '../FaseTrilladoModal'
import FaseSeleccionModal from '../FaseSeleccionModal'
import ProcessBadge from '@/components/ProcessBadge'

export default function ServicioDetailClient({
  servicio,
  clienteInfo,
  linkedRoastOrder,
  lotes,
  activeSessions,
  clientes,
  globalAjustes,
  movimientos,
  bolsas,
  initialOrdenEnvasado,
  initialPaquetesEnvasado,
  initialDetallesEnvasado,
  linkedProforma
}: {
  servicio: any;
  clienteInfo: any;
  linkedRoastOrder: any;
  lotes: any[];
  activeSessions: any[];
  clientes: any[];
  globalAjustes: Record<string, string>;
  movimientos: any[];
  bolsas: any[];
  initialOrdenEnvasado: any;
  initialPaquetesEnvasado: any[];
  initialDetallesEnvasado: any[];
  linkedProforma?: any;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTrilladoModal, setShowTrilladoModal] = useState(false);
  const [showSeleccionModal, setShowSeleccionModal] = useState(false);

  const handleProgramarTueste = () => {
    startTransition(async () => {
      const res = await crearSesionYProgramarTueste(servicio.id);
      if (res.success && res.sesionId) {
        router.push(`/tuestes/sesiones/${res.sesionId}`);
      } else {
        alert('Error: ' + res.error);
      }
    });
  };

  const handleCrearProforma = () => {
    if (!confirm('¿Deseas crear una proforma de pago para esta Orden de Servicio?')) return;
    startTransition(async () => {
      try {
        if (typeof createProforma !== 'function') {
          alert('Error: createProforma no está disponible o no es una función.');
          return;
        }
        const res = await createProforma(
          servicio.cliente || '',
          new Date().toISOString().split('T')[0], // fechaEmision
          null, // fechaVencimiento
          0, // descuento
          `PROFORMA GENERADA PARA ORDEN DE SERVICIO #${servicio.n_orden}`, // notas
          [], // conceptos
          [servicio.id] // serviciosIds
        );
        if (res.success && res.id) {
          alert('Proforma creada exitosamente.');
          router.refresh();
        } else {
          alert('Error al crear proforma: ' + res.error);
        }
      } catch (err: any) {
        console.error('Error al crear proforma:', err);
        alert('Excepción capturada: ' + (err.message || err));
      }
    });
  };

  function formatMoney(amount: number | null | undefined) {
    if (amount === null || amount === undefined) return '-';
    return `S/ ${amount.toFixed(2)}`;
  }

  function calcMerma(initial: number | null, final: number | null) {
    if (!initial || !final || initial === 0) return '-';
    const merma = ((initial - final) / initial) * 100;
    return `${merma.toFixed(1)}%`;
  }

  // Active / Included services flags
  const hasTrillado = servicio.pc !== null || servicio.hc !== null;
  const hasSeleccion = servicio.seleccion_precio_kg !== null;
  const hasTueste = servicio.tueste_precio_kg !== null || servicio.gc !== null;
  const hasMolienda = servicio.molienda_precio_kg !== null || servicio.total !== null;
  const hasEnvasado = servicio.envasado_precio_unidad !== null;

  // Check if completed
  const isTrilladoCompleted = !!servicio.hc;

  // Real calculations
  const pc = servicio.pc || 0;
  const hc = servicio.hc || 0;
  const gc = servicio.gc || 0;
  const rc = servicio.rc || 0;
  const totalMoliendaWeight = servicio.total || 0;
  
  const totalTrillado = hasTrillado ? pc * (servicio.trillado_precio_kg || 0) : 0;
  
  // Selection acts on the green gold coffee (hc) or pergamino input (pc)
  const selectionInput = hc || pc || 0;
  const totalSeleccion = hasSeleccion ? selectionInput * (servicio.seleccion_precio_kg || 0) : 0;
  
  const totalTueste = hasTueste ? gc * (servicio.tueste_precio_kg || 0) : 0;
  const totalMolienda = hasMolienda ? totalMoliendaWeight * (servicio.molienda_precio_kg || 0) : 0;
  const totalEnvasado = hasEnvasado ? (servicio.envasado_cantidad || 0) * (servicio.envasado_precio_unidad || 0) : 0;

  const totalGeneral = totalTrillado + totalSeleccion + totalTueste + totalMolienda + totalEnvasado;

  const mermaTrilla = calcMerma(servicio.pc, servicio.hc);
  const mermaTueste = calcMerma(servicio.gc, servicio.rc);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1a120b] via-[#2a1d13] to-[#1a120b] text-slate-900 font-sans print:bg-white print:p-0 selection:bg-[#c2a077]/30 overflow-x-hidden flex flex-col items-center">
      
      {/* Background decoration elements visible only on screen */}
      <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-[#c2a077]/10 rounded-full blur-3xl print:hidden"></div>

      <div className="w-full max-w-5xl p-4 md:p-12 print:max-w-full print:p-4 space-y-6">
        
        {/* Screen Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end print:hidden gap-4 w-full border-b border-white/10 pb-6">
          <div className="space-y-2">
            <Link href="/servicios" className="group flex items-center gap-2 text-[#c2a077]/70 hover:text-[#c2a077] transition-colors text-sm font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver a Servicios
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Detalle de la Orden</h1>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-medium transition-colors text-sm shadow-sm"
            >
              ✏️ Editar Orden
            </button>
            {linkedProforma ? (
              <Link
                href={`/proformas/${linkedProforma.id}`}
                className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 font-semibold rounded-lg transition-colors text-sm shadow-sm flex items-center gap-1.5"
              >
                📄 Ver Proforma ({linkedProforma.n_proforma})
              </Link>
            ) : (
              <button
                onClick={handleCrearProforma}
                disabled={isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors text-sm shadow-sm flex items-center gap-2"
              >
                {isPending ? '⏳ Creando...' : '📝 Crear Proforma'}
              </button>
            )}
            {hasTrillado && (
              <button
                onClick={() => setShowTrilladoModal(true)}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors shadow-sm ${isTrilladoCompleted ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/40' : 'bg-[#c2a077]/20 text-[#c2a077] border border-[#c2a077]/30 hover:bg-[#c2a077]/40'}`}
              >
                🌾 {isTrilladoCompleted ? 'Editar Trillado' : 'Completar Trillado'}
              </button>
            )}
            {hasSeleccion && (
              <button
                onClick={() => setShowSeleccionModal(true)}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors shadow-sm bg-[#c2a077]/20 text-[#c2a077] border border-[#c2a077]/30 hover:bg-[#c2a077]/40`}
              >
                ✨ Completar Selección
              </button>
            )}
            {hasTueste && !linkedRoastOrder && (
              <button
                onClick={handleProgramarTueste}
                disabled={isPending}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors text-sm shadow-sm flex items-center gap-2"
              >
                {isPending ? '⏳ Creando Sesión...' : '🔥 Programar Tueste'}
              </button>
            )}
            {linkedRoastOrder && (
              <Link
                href={`/tuestes/sesiones/${linkedRoastOrder.sesion_id}?ordenId=${linkedRoastOrder.id}`}
                className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 font-semibold rounded-lg transition-colors text-sm shadow-sm"
              >
                🔥 Ver Sesión de Tueste (#{linkedRoastOrder.sesion_id})
              </Link>
            )}
          </div>
        </div>

        {/* Share buttons */}
        <div className="print:hidden">
          <ExportActions 
            servicio={servicio} 
            cliente={clienteInfo} 
            totales={{ 
              totalTrillado, 
              totalSeleccion, 
              totalTueste, 
              totalMolido: totalMolienda, 
              totalEnvasado, 
              totalGeneral 
            }} 
          />
        </div>

        {/* Printable Card Area */}
        <div id="resumen-card" className="bg-white rounded-3xl shadow-2xl shadow-black/40 overflow-hidden print:shadow-none print:rounded-none w-full" style={{maxWidth: '1000px'}}>
          
          {/* Card Header styling */}
          <div className="bg-[#1a120b] px-8 py-6 flex justify-between items-center print:bg-none print:border-b-2 print:border-slate-800 print:text-black">
            <div>
              <h1 className="text-3xl font-bold text-[#c2a077] print:text-black tracking-tight">Resumen de Servicio</h1>
              <p className="text-white/60 print:text-slate-500 text-sm mt-1">Reporte detallado de procesamiento de café</p>
            </div>
            <div className="text-right">
              <div className="text-white/60 print:text-slate-500 text-sm uppercase tracking-wider font-semibold">Orden N°</div>
              <div className="text-4xl font-extrabold text-white print:text-black">#{servicio.n_orden}</div>
            </div>
          </div>

          <div className="p-8 print:p-4">
            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              {/* Left Column */}
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium text-sm">Cliente</span>
                  <span className="text-lg font-bold text-slate-800 uppercase">{servicio.cliente || '-'}</span>
                </div>
                <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium text-sm">Variedad</span>
                  <span className="text-slate-800 font-semibold uppercase">{servicio.variedad || '-'}</span>
                </div>
                <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium text-sm">Proceso</span>
                  <span className="text-slate-800 font-semibold uppercase">
                    {servicio.proceso ? <ProcessBadge proceso={servicio.proceso} className="border-slate-300 text-slate-700 bg-slate-100" /> : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium text-sm">Productor</span>
                  <span className="text-slate-800 font-semibold uppercase">{servicio.productor || '-'}</span>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium text-sm">Código Café</span>
                  <span className="text-slate-800 font-mono font-bold tracking-tight bg-[#c2a077]/10 px-2 py-0.5 rounded text-[#1a120b]">{servicio.codigo_cafe || '-'}</span>
                </div>
                <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium text-sm">Humedad / AW / D</span>
                  <span className="text-slate-800 font-semibold">
                    {servicio.m_percent ? `${servicio.m_percent}%` : (linkedRoastOrder?.moisture ? `${linkedRoastOrder.moisture}%` : '-')} <span className="text-slate-300 mx-1">|</span> 
                    {servicio.aw || linkedRoastOrder?.aw || '-'} <span className="text-slate-300 mx-1">|</span> 
                    {servicio.d || linkedRoastOrder?.density || '-'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-gray-500 text-xs uppercase font-medium">Fecha de Trilla</span>
                  <span className="text-slate-800 font-semibold">{formatDateLatino(servicio.fecha_trillado)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-gray-500 text-xs uppercase font-medium">Fecha de Tueste</span>
                  <span className="text-slate-800 font-semibold">{formatDateLatino(servicio.fecha_tueste)}</span>
                </div>
                {linkedProforma && (
                  <div className="flex flex-col gap-1 border-t border-slate-100 pt-2 print:border-none print:pt-0">
                    <span className="text-gray-500 text-xs uppercase font-medium">Proforma de Pago</span>
                    <Link href={`/proformas/${linkedProforma.id}`} className="text-blue-600 hover:underline font-bold text-sm block print:text-black">
                      {linkedProforma.n_proforma} ({linkedProforma.estado.toUpperCase()})
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Main Data Table */}
            <div className="overflow-x-auto rounded-xl border border-[#c2a077]/30 shadow-sm print:border-2 print:border-black print:rounded-none">
              <table className="w-full text-left text-sm min-w-[700px]">
                <thead>
                  <tr className="bg-[#1a120b] text-[#c2a077] font-bold uppercase tracking-wider text-xs print:bg-gray-200 print:text-black">
                    <th className="p-4 border-b border-[#c2a077]/20 print:border-black">Detalle</th>
                    <th className="p-4 border-b border-[#c2a077]/20 print:border-black text-center">Trillado (🌾)</th>
                    <th className="p-4 border-b border-[#c2a077]/20 print:border-black text-center">Selección (✨)</th>
                    <th className="p-4 border-b border-[#c2a077]/20 print:border-black text-center">Tueste (🔥)</th>
                    <th className="p-4 border-b border-[#c2a077]/20 print:border-black text-center">Molienda (☕)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-black">
                  
                  {/* Row: PESO IN */}
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-700 print:text-black border-r border-slate-200 print:border-black">PESO IN (KG)</td>
                    <td className="p-4 text-center font-medium bg-slate-50/50 print:bg-transparent">{hasTrillado ? `${pc} kg` : '-'}</td>
                    <td className="p-4 text-center font-medium bg-slate-50/50 print:bg-transparent">{hasSeleccion ? `${selectionInput} kg` : '-'}</td>
                    <td className="p-4 text-center font-medium bg-slate-50/50 print:bg-transparent">{hasTueste ? `${gc} kg` : '-'}</td>
                    <td className="p-4 text-center font-medium bg-slate-50/50 print:bg-transparent">{hasMolienda ? `${totalMoliendaWeight} kg` : '-'}</td>
                  </tr>

                  {/* Row: PESO OUT */}
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-700 print:text-black border-r border-slate-200 print:border-black">PESO OUT (KG)</td>
                    <td className="p-4 text-center font-medium">{hasTrillado ? `${hc} kg` : '-'}</td>
                    <td className="p-4 text-center font-medium">-</td>
                    <td className="p-4 text-center font-medium">{hasTueste && rc > 0 ? `${rc} kg` : '-'}</td>
                    <td className="p-4 text-center font-medium">-</td>
                  </tr>

                  {/* Row: MERMA */}
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-700 print:text-black border-r border-slate-200 print:border-black">MERMA %</td>
                    <td className="p-4 text-center font-bold text-rose-600 print:text-black">{hasTrillado ? mermaTrilla : '-'}</td>
                    <td className="p-4 text-center font-medium">-</td>
                    <td className="p-4 text-center font-bold text-rose-600 print:text-black">{hasTueste ? mermaTueste : '-'}</td>
                    <td className="p-4 text-center font-medium">-</td>
                  </tr>

                  {/* Row: PRECIO */}
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-700 print:text-black border-r border-slate-200 print:border-black">PRECIO X KG</td>
                    <td className="p-4 text-center text-slate-600">{hasTrillado ? formatMoney(servicio.trillado_precio_kg) : '-'}</td>
                    <td className="p-4 text-center text-slate-600">{hasSeleccion ? formatMoney(servicio.seleccion_precio_kg) : '-'}</td>
                    <td className="p-4 text-center text-slate-600">{hasTueste ? formatMoney(servicio.tueste_precio_kg) : '-'}</td>
                    <td className="p-4 text-center text-slate-600">{hasMolienda ? formatMoney(servicio.molienda_precio_kg) : '-'}</td>
                  </tr>

                  {/* Row: TOTAL */}
                  <tr>
                    <td className="p-4 font-bold text-slate-700 print:text-black border-r border-slate-200 print:border-black">TOTAL SERVICIO</td>
                    <td className="p-4 text-center font-bold text-[#1a120b] print:text-black bg-[#c2a077]/10 print:bg-transparent">{hasTrillado ? formatMoney(totalTrillado) : '-'}</td>
                    <td className="p-4 text-center font-bold text-[#1a120b] print:text-black bg-[#c2a077]/10 print:bg-transparent">{hasSeleccion ? formatMoney(totalSeleccion) : '-'}</td>
                    <td className="p-4 text-center font-bold text-[#1a120b] print:text-black bg-[#c2a077]/10 print:bg-transparent">{hasTueste ? formatMoney(totalTueste) : '-'}</td>
                    <td className="p-4 text-center font-bold text-[#1a120b] print:text-black bg-[#c2a077]/10 print:bg-transparent">{hasMolienda ? formatMoney(totalMolienda) : '-'}</td>
                  </tr>
                </tbody>
              </table>

              {/* Envasado & Gran Total Footer */}
              <div className="border-t border-slate-200 print:border-black bg-slate-50 print:bg-transparent flex flex-col sm:flex-row justify-end items-stretch">
                
                {/* Envasado Info */}
                {hasEnvasado && (
                  <div className="p-6 flex-1 border-b sm:border-b-0 sm:border-r border-slate-200 print:border-black">
                    <h3 className="text-xs font-bold text-slate-400 print:text-black uppercase tracking-widest mb-3">📦 Servicio de Envasado</h3>
                    <div className="flex gap-8">
                      <div>
                        <div className="text-sm text-slate-500 mb-1">Tipo de Envasado</div>
                        <div className="font-bold text-slate-800 uppercase text-xs">
                          {servicio.envasado_tipo === 'grano' && 'Tostado en Grano'}
                          {servicio.envasado_tipo === 'molido' && 'Molido y Envasado'}
                          {servicio.envasado_tipo === 'escogido' && 'Escogido y Envasado'}
                          {!servicio.envasado_tipo && '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-500 mb-1">Cantidad</div>
                        <div className="font-semibold text-slate-800">{servicio.envasado_cantidad || 0} bolsas</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-500 mb-1">Precio x Bolsa</div>
                        <div className="font-semibold text-slate-800">{formatMoney(servicio.envasado_precio_unidad)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-500 mb-1">Total Envasado</div>
                        <div className="font-bold text-[#1a120b] print:text-black">{formatMoney(totalEnvasado)}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Gran Total Box */}
                <div className="p-6 bg-[#1a120b] print:bg-white flex flex-col justify-center min-w-[250px] print:border-l print:border-black">
                  <div className="text-[#c2a077] print:text-black text-sm font-medium mb-1 uppercase tracking-wider">Monto Final a Pagar</div>
                  <div className="text-4xl font-extrabold text-white print:text-black tracking-tight">{formatMoney(totalGeneral)}</div>
                </div>
              </div>

            </div>

            {servicio.detalle && (
              <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100 print:border-slate-300 print:rounded-none">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Detalles / Notas Adicionales</span>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{servicio.detalle}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historial de Movimientos de Stock del Lote */}
      {servicio.lote_id && (
        <div className="w-full max-w-5xl px-4 md:px-0 print:hidden mt-6">
          <div className="bg-[#1a120b]/60 backdrop-blur-xl rounded-3xl border border-white/10 p-6 md:p-8 space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold text-[#c2a077] flex items-center gap-2">
              <span>📊</span> Historial de Movimientos de Stock del Lote
            </h2>
            <p className="text-gray-400 text-xs">
              Registro histórico de entradas, salidas y mermas del lote actual ({servicio.codigo_cafe}).
            </p>
            
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead>
                  <tr className="bg-white/5 text-[#c2a077] font-bold uppercase tracking-wider">
                    <th className="p-3">Fecha</th>
                    <th className="p-3 text-center">Tipo</th>
                    <th className="p-3 text-center">Tipo Café</th>
                    <th className="p-3 text-right">Cantidad (KG)</th>
                    <th className="p-3">Motivo / Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {movimientos && movimientos.length > 0 ? (
                    movimientos.map((m: any) => {
                      const isIngreso = m.tipo_movimiento === 'ingreso' || m.tipo === 'INGRESO';
                      const cleanTipoCafe = (m.tipo_cafe || '').replace('stock_', '').replace('_', ' ').toUpperCase();
                      return (
                        <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3 font-medium">{formatDateLatino(m.fecha)}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${isIngreso ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                              {isIngreso ? '📥 INGRESO' : '📤 SALIDA'}
                            </span>
                          </td>
                          <td className="p-3 text-center font-bold">{cleanTipoCafe}</td>
                          <td className={`p-3 text-right font-mono font-bold ${isIngreso ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isIngreso ? '+' : '-'}{Number(m.cantidad).toFixed(2)} kg
                          </td>
                          <td className="p-3 max-w-[250px] truncate" title={m.motivo || m.notas}>
                            {m.motivo || m.notas || '-'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500 italic">
                        No se han registrado movimientos de stock físicos para este lote.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Fase Envasado Manager */}
      {hasEnvasado && (
        <div className="w-full max-w-5xl px-4 md:px-0 mb-8 bg-black/30 border border-[#c2a077]/20 rounded-3xl p-6">
          <h3 className="text-xl font-bold text-[#c2a077] flex items-center gap-2 mb-2">
            <span>📦</span> Envasado Facturado
          </h3>
          <p className="text-sm text-gray-400">
            Este servicio incluye una tarifa de envasado cobrada al cliente. 
            El envasado operativo se maneja desde el módulo independiente de <strong>Envasado</strong>.
          </p>
        </div>
      )}

      {showEditModal && (
        <EditServiceModal
          onClose={() => setShowEditModal(false)}
          servicio={servicio}
          lotes={lotes}
          activeSessions={activeSessions}
          clientes={clientes}
          globalAjustes={globalAjustes}
          linkedRoastOrder={linkedRoastOrder}
        />
      )}

      {showTrilladoModal && (
        <FaseTrilladoModal
          servicioId={servicio.id}
          loteId={servicio.lote_id}
          pesoPergaminoIn={servicio.pc}
          equipos={[]} // TODO: Pass real equipos if needed
          onClose={() => setShowTrilladoModal(false)}
          onSuccess={() => {
            setShowTrilladoModal(false);
          }}
        />
      )}

      {showSeleccionModal && (
        <FaseSeleccionModal
          servicioId={servicio.id}
          loteId={servicio.lote_id}
          pesoOroIn={servicio.hc || servicio.pc}
          onClose={() => setShowSeleccionModal(false)}
          onSuccess={() => {
            setShowSeleccionModal(false);
          }}
        />
      )}
    </div>
  )
}
