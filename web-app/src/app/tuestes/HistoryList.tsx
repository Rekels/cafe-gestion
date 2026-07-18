'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDateLatino } from '@/lib/dateUtils'
import ProcessBadge from '@/components/ProcessBadge'

interface Batch {
  id: number
  batch_n: number
  estado: string
  gc: number
  rc: number
  lw_percent: number
  t_t: string
  agtron: number
}

interface Orden {
  id: number
  codigo_lote: string
  variedad: string
  productor: string
  target_weight: number
  cliente?: string
  proceso?: string
  servicio_id?: number
  batches: Batch[]
}

interface Sesion {
  id: number
  fecha: string
  estado: string
  equipo_nombre: string
  ordenes: Orden[]
}

export default function HistoryList({ sesiones }: { sesiones: Sesion[] }) {
  const [expandedSessions, setExpandedSessions] = useState<Record<number, boolean>>({});

  const toggleSession = (id: number) => {
    setExpandedSessions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (sesiones.length === 0) {
    return (
      <div className="bg-[#1a120b]/60 backdrop-blur-xl rounded-3xl border border-white/10 p-12 text-center text-gray-400">
        No se encontraron sesiones de tueste.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sesiones.map(sesion => {
        const isExpanded = expandedSessions[sesion.id];
        
        // Sum totals for session
        let totalBatches = 0;
        let totalGc = 0;
        let totalRc = 0;
        let completedBatches = 0;

        sesion.ordenes.forEach(o => {
          totalBatches += o.batches.length;
          o.batches.forEach(b => {
            totalGc += Number(b.gc || 0);
            totalRc += Number(b.rc || 0);
            if (b.estado === 'completado') completedBatches++;
          });
        });

        return (
          <div key={sesion.id} className="bg-[#1a120b]/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg overflow-hidden transition-all duration-300">
            {/* Header (Clickable) */}
            <div 
              className="p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
              onClick={() => toggleSession(sesion.id)}
            >
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  isExpanded ? 'bg-[#c2a077] text-[#1a120b]' : 'bg-white/10 text-gray-400'
                }`}>
                  {isExpanded ? '−' : '+'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-lg">Sesión #{sesion.id}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                      sesion.estado === 'activa' 
                        ? 'bg-amber-950/40 text-amber-300 border-amber-800/40 animate-pulse' 
                        : 'bg-white/5 text-gray-400 border-white/10'
                    }`}>
                      {sesion.estado === 'activa' ? 'Activa' : 'Finalizada'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    <span className="text-[#c2a077] font-semibold">{sesion.equipo_nombre || 'Sin tostadora'}</span> • {formatDateLatino(sesion.fecha)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div className="text-right hidden sm:block">
                  <div className="text-gray-500 text-[10px] uppercase tracking-wider">Órdenes</div>
                  <div className="font-bold text-white">{sesion.ordenes.length}</div>
                </div>
                <div className="text-right hidden md:block">
                  <div className="text-gray-500 text-[10px] uppercase tracking-wider">Batches</div>
                  <div className="font-bold text-white">{completedBatches} <span className="text-gray-600">/ {totalBatches}</span></div>
                </div>
                <div className="text-right">
                  <div className="text-gray-500 text-[10px] uppercase tracking-wider">Masa Tostada</div>
                  <div className="font-bold text-amber-200 font-mono">{totalRc.toFixed(1)} kg</div>
                </div>
                <Link
                  href={`/tuestes/sesiones/${sesion.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-colors border border-white/10 shadow-sm text-xs"
                >
                  {sesion.estado === 'activa' ? 'Continuar' : 'Ver Detalles'}
                </Link>
              </div>
            </div>

            {/* Expanded Content: Orders and Batches */}
            {isExpanded && (
              <div className="border-t border-white/5 bg-black/20 p-5 space-y-4">
                {sesion.ordenes.length === 0 ? (
                  <div className="text-center text-sm text-gray-500 py-4">No hay órdenes registradas en esta sesión.</div>
                ) : (
                  sesion.ordenes.map(orden => (
                    <div key={orden.id} className="bg-[#1a120b] border border-white/5 rounded-xl overflow-hidden">
                      {/* Order Header */}
                      <div className="bg-white/[0.02] p-3 border-b border-white/5 flex flex-wrap justify-between items-center gap-4">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="text-xs font-bold text-[#c2a077]">🔥 {orden.variedad}</span>
                          {orden.proceso && <ProcessBadge proceso={orden.proceso} className="text-[9px] px-1.5 py-0" />}
                          <span className="text-[10px] text-gray-400">
                            Lote: <span className="font-mono text-white">{orden.codigo_lote}</span>
                            {orden.productor && ` • ${orden.productor}`}
                            {orden.cliente && (
                              <>
                                {' • '}Cliente: <span className="text-white font-medium">{orden.cliente}</span>
                              </>
                            )}
                            {orden.servicio_id && (
                              <>
                                {' • '}OS: <Link href={`/servicios/${orden.servicio_id}`} className="text-[#c2a077] hover:underline font-semibold" onClick={(e) => e.stopPropagation()}>#{orden.servicio_id}</Link>
                              </>
                            )}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          Obj: <span className="font-mono text-white">{orden.target_weight}kg</span>
                        </div>
                      </div>
                      
                      {/* Batch Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[11px] min-w-[500px]">
                          <thead>
                            <tr className="bg-black/40 text-gray-500 uppercase tracking-wider">
                              <th className="p-2 font-medium text-center w-12">Batch</th>
                              <th className="p-2 font-medium text-center">Verde</th>
                              <th className="p-2 font-medium text-center">Tostado</th>
                              <th className="p-2 font-medium text-center">Merma</th>
                              <th className="p-2 font-medium text-center">Tiempo</th>
                              <th className="p-2 font-medium text-center">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {orden.batches.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-3 text-center text-gray-600">Sin batches planificados.</td>
                              </tr>
                            ) : (
                              orden.batches.map(batch => (
                                <tr key={batch.id} className="hover:bg-white/[0.02]">
                                  <td className="p-2 text-center font-mono font-bold text-gray-300">#{batch.batch_n}</td>
                                  <td className="p-2 text-center font-mono text-gray-400">{Number(batch.gc || 0).toFixed(2)} kg</td>
                                  <td className="p-2 text-center font-mono text-amber-200/70">{Number(batch.rc || 0).toFixed(2)} kg</td>
                                  <td className="p-2 text-center font-mono font-bold">
                                    <span className={Number(batch.lw_percent) > 15 ? 'text-red-400/80' : 'text-emerald-400/80'}>
                                      {Number(batch.lw_percent || 0).toFixed(1)}%
                                    </span>
                                  </td>
                                  <td className="p-2 text-center text-gray-400">{batch.t_t || '-'}</td>
                                  <td className="p-2 text-center">
                                    <span className={`inline-block w-2 h-2 rounded-full ${
                                      batch.estado === 'completado' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-600'
                                    }`} title={batch.estado}></span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
