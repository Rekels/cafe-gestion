'use client'

import { useState, useTransition, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
    import { 
      addOrdenTueste, addBatchToOrden, deleteBatch, 
      saveBatchData, completarBatch, revertirBatch,
      finalizarSesion, toggleReferencia, deleteOrdenTueste,
      reorderOrdenesRecomendado, moveOrden, updateOrdenField, updateSesionEquipo,
      createServicioFromOrdenTueste
    } from '@/app/actions'
import AddOrderModal from './AddOrderModal'
import ProcessBadge from '@/components/ProcessBadge'
import { formatDateLatino } from '@/lib/dateUtils'

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface SessionViewProps {
  sesion: any
  ordenes: any[]
  batchesByOrden: Record<number, any[]>
  referenciasByOrden: Record<number, any>
  lotes: any[]
  referencias: any[]
  clientes: any[]
  equipos: any[]
  initialActiveOrdenId?: number
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

const timeToSeconds = (timeStr: string) => {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const parts = timeStr.split(':');
  return (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
};

const secondsToTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const getDeltaValue = (curr: number | null, target: number | null, precision = 2) => {
  if (curr == null || target == null) return null;
  const diff = curr - target;
  if (diff === 0) return '0';
  return `${diff > 0 ? '+' : ''}${diff.toFixed(precision)}`;
};

const getDeltaTime = (curr: string | null, target: string | null) => {
  if (!curr || !target) return null;
  const diff = timeToSeconds(curr) - timeToSeconds(target);
  if (diff === 0) return '0s';
  return `${diff > 0 ? '+' : ''}${diff}s`;
};

const autoFormatTime = (val: string) => {
  if (!val) return val;
  if (val.includes(':')) return val;
  const numeric = val.replace(/\D/g, '');
  if (!numeric) return val;
  if (numeric.length <= 2) return `0:${numeric.padStart(2, '0')}`;
  const secs = numeric.slice(-2);
  const mins = numeric.slice(0, -2);
  return `${mins}:${secs}`;
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function SessionView({ 
  sesion, ordenes: initialOrdenes, batchesByOrden: initialBatchesByOrden, 
  referenciasByOrden, lotes, referencias, clientes, equipos, initialActiveOrdenId 
}: SessionViewProps) {
  const router = useRouter();
  const [ordenes, setOrdenes] = useState(initialOrdenes);
  const [activeOrdenId, setActiveOrdenId] = useState<number | null>(
    initialActiveOrdenId && initialOrdenes.some(o => o.id === initialActiveOrdenId)
      ? initialActiveOrdenId
      : (initialOrdenes.length > 0 ? initialOrdenes[0].id : null)
  );
  const [batchesMap, setBatchesMap] = useState<Record<number, any[]>>(initialBatchesByOrden);

  useEffect(() => {
    setOrdenes(initialOrdenes);
    setBatchesMap(initialBatchesByOrden);
    
    const targetId = initialActiveOrdenId && initialOrdenes.some(o => o.id === initialActiveOrdenId)
      ? initialActiveOrdenId
      : (activeOrdenId && initialOrdenes.some(o => o.id === activeOrdenId)
          ? activeOrdenId
          : (initialOrdenes.length > 0 ? initialOrdenes[0].id : null));
          
    setActiveOrdenId(targetId);
  }, [initialOrdenes, initialBatchesByOrden, initialActiveOrdenId]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [isEditingEquipo, setIsEditingEquipo] = useState(false);
  const [selectedEquipoId, setSelectedEquipoId] = useState(sesion.equipo_id || '');
  const [isFinishing, startFinishTransition] = useTransition();
  const [savingBatchId, setSavingBatchId] = useState<number | null>(null);
  const [creatingServiceId, setCreatingServiceId] = useState<number | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<Record<number, 'saved' | 'saving' | 'error'>>({});
  
  // Timer state
  const [timerBatchId, setTimerBatchId] = useState<number | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Autosave debounce refs
  const autosaveTimers = useRef<Record<number, NodeJS.Timeout>>({});

  // Timer effect
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  // Format timer
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ── Active orden data ──
  const activeOrden = ordenes.find(o => o.id === activeOrdenId);
  const activeBatches = activeOrdenId ? (batchesMap[activeOrdenId] || []) : [];
  const activeRef = activeOrdenId ? referenciasByOrden[activeOrdenId] : null;
  const selectedBatch = activeBatches.find(b => b.id === selectedBatchId);

  // ── Cell edit handler with auto-calculations ──
  const handleCellChange = useCallback((batchId: number, field: string, value: any) => {
    setBatchesMap(prev => {
      const ordenId = Object.keys(prev).find(k => prev[Number(k)]?.some(b => b.id === batchId));
      if (!ordenId) return prev;
      
      const updatedBatches = prev[Number(ordenId)].map(b => {
        if (b.id !== batchId) return b;
        const updated = { ...b, [field]: value };

        // Auto-calculate phases
        if (['t_ts', 't_fc', 't_t'].includes(field)) {
          const secTs = timeToSeconds(updated.t_ts);
          const secFc = timeToSeconds(updated.t_fc);
          const secTotal = timeToSeconds(updated.t_t);
          const secDry = secTs;
          const secMai = secFc > secTs ? secFc - secTs : 0;
          const secDev = secTotal > secFc ? secTotal - secFc : 0;
          const sum = secDry + secMai + secDev;
          if (sum > 0) {
            updated.dry_percent = (secDry / sum) * 100;
            updated.mai_percent = (secMai / sum) * 100;
            updated.dev_percent = (secDev / sum) * 100;
            updated.m_dry = secondsToTime(secDry);
            updated.m_mai = secondsToTime(secMai);
            updated.m_dev = secondsToTime(secDev);
            updated.t_dev = secondsToTime(secDev);
            if (updated.temp_end && updated.temp_fc) {
              updated.temp_dev = updated.temp_end - updated.temp_fc;
            }
          }
        } else if (['temp_end', 'temp_fc'].includes(field)) {
          if (updated.temp_end && updated.temp_fc) {
            updated.temp_dev = Number(updated.temp_end) - Number(updated.temp_fc);
          }
        }
        
        // Live merma
        if (field === 'gc' || field === 'rc') {
          const gcNum = Number(updated.gc || 0);
          const rcNum = Number(updated.rc || 0);
          updated.lw_percent = gcNum > 0 ? ((gcNum - rcNum) / gcNum) * 100 : 0;
        }
        return updated;
      });

      // Trigger autosave
      if (autosaveTimers.current[batchId]) clearTimeout(autosaveTimers.current[batchId]);
      setAutoSaveStatus(prev => ({ ...prev, [batchId]: 'saving' }));
      autosaveTimers.current[batchId] = setTimeout(async () => {
        const batch = updatedBatches.find(b => b.id === batchId);
        if (batch) {
          const res = await saveBatchData(batchId, batch);
          setAutoSaveStatus(prev => ({ ...prev, [batchId]: res.success ? 'saved' : 'error' }));
          // Clear status after 3s
          setTimeout(() => setAutoSaveStatus(prev => ({ ...prev, [batchId]: 'saved' })), 3000);
        }
      }, 2000);

      return { ...prev, [Number(ordenId)]: updatedBatches };
    });
  }, []);

  // ── Complete batch (explicit stock movement) ──
  const handleCompletarBatch = async (batchId: number) => {
    if (!confirm('¿Confirmar? Esto descontará el café verde y sumará el tostado al stock.')) return;
    setSavingBatchId(batchId);
    
    // First save the latest data
    const ordenId = Object.keys(batchesMap).find(k => batchesMap[Number(k)]?.some(b => b.id === batchId));
    if (ordenId) {
      const batch = batchesMap[Number(ordenId)].find(b => b.id === batchId);
      if (batch) await saveBatchData(batchId, batch);
    }
    
    const res = await completarBatch(batchId);
    if (res.success) {
      setBatchesMap(prev => {
        const newMap = { ...prev };
        for (const key of Object.keys(newMap)) {
          newMap[Number(key)] = newMap[Number(key)].map(b => 
            b.id === batchId ? { ...b, estado: 'completado' } : b
          );
        }
        return newMap;
      });
    } else {
      alert('Error: ' + res.error);
    }
    setSavingBatchId(null);
  };

  // ── Revert batch ──
  const handleRevertBatch = async (batchId: number) => {
    if (!confirm('¿Revertir batch? El stock se devolverá.')) return;
    const res = await revertirBatch(batchId);
    if (res.success) {
      setBatchesMap(prev => {
        const newMap = { ...prev };
        for (const key of Object.keys(newMap)) {
          newMap[Number(key)] = newMap[Number(key)].map(b => 
            b.id === batchId ? { ...b, estado: 'planificado' } : b
          );
        }
        return newMap;
      });
    } else {
      alert('Error: ' + res.error);
    }
  };

  // ── Add batch to current orden ──
  const handleAddBatch = async () => {
    if (!activeOrdenId) return;
    const res = await addBatchToOrden(activeOrdenId);
    if (res.success) router.refresh();
    else alert('Error: ' + res.error);
  };

  // ── Delete batch ──
  const handleDeleteBatch = async (batchId: number) => {
    if (!confirm('¿Eliminar este batch planificado?')) return;
    const res = await deleteBatch(batchId);
    if (res.success) router.refresh();
    else alert('Error: ' + res.error);
  };

  // ── Delete orden ──
  const handleDeleteOrden = async (ordenId: number) => {
    if (!confirm('¿Eliminar esta Orden de Tueste y todos sus batches planificados?')) return;
    const res = await deleteOrdenTueste(ordenId);
    if (res.success) router.refresh();
    else alert('Error: ' + res.error);
  };

  // ── Reorder ──
  const handleAutoReorder = async () => {
    if (!confirm('¿Reordenar sugerido por máquina? (Naturales y Lotes pequeños primero)')) return;
    const res = await reorderOrdenesRecomendado(sesion.id);
    if (res.success) router.refresh();
    else alert('Error: ' + res.error);
  };

  const handleMoveOrden = async (ordenId: number, direction: 'up' | 'down') => {
    const res = await moveOrden(ordenId, direction);
    if (res.success) router.refresh();
    else alert('No se puede mover más.');
  };

  const handleOrdenFieldChange = async (ordenId: number, field: string, value: string) => {
    const num = value === '' ? null : Number(value);
    await updateOrdenField(ordenId, field, num);
    router.refresh();
  };

  // ── Save as reference ──
  const handleSaveAsReference = async (batchId: number) => {
    const nombre = prompt('Nombre para esta referencia:');
    if (nombre === null) return;
    const res = await toggleReferencia(batchId, true, nombre);
    if (res.success) {
      setBatchesMap(prev => {
        const newMap = { ...prev };
        for (const key of Object.keys(newMap)) {
          newMap[Number(key)] = newMap[Number(key)].map(b => 
            b.id === batchId ? { ...b, es_referencia: 1, nombre_referencia: nombre } : b
          );
        }
        return newMap;
      });
    }
  };

  // ── Timer controls ──
  const startTimer = (batchId: number) => {
    setTimerBatchId(batchId);
    setTimerSeconds(0);
    setTimerRunning(true);
  };

  const stopTimer = () => {
    setTimerRunning(false);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setTimerSeconds(0);
    setTimerBatchId(null);
  };

  const handleCaptureTime = (batchId: number, phase: 'ts' | 'fc' | 'end') => {
    if (timerBatchId !== batchId) return;
    const timeStr = formatTimer(timerSeconds);
    
    // Auto-fill temp if available
    const defaultTemp = sesion[`default_temp_${phase}`];
    
    if (phase === 'ts') {
      handleCellChange(batchId, 't_ts', timeStr);
      if (defaultTemp) handleCellChange(batchId, 'temp_ts', defaultTemp);
    } else if (phase === 'fc') {
      handleCellChange(batchId, 't_fc', timeStr);
      if (defaultTemp) handleCellChange(batchId, 'temp_fc', defaultTemp);
    } else if (phase === 'end') {
      handleCellChange(batchId, 't_t', timeStr);
      if (defaultTemp) handleCellChange(batchId, 'temp_end', defaultTemp);
      stopTimer();
    }
  };

  // ── Finalize session ──
  const handleFinalize = () => {
    if (!confirm('¿Finalizar la sesión? No podrás registrar más datos.')) return;
    startFinishTransition(async () => {
      const res = await finalizarSesion(sesion.id);
      if (res.success) router.push('/tuestes');
      else alert('Error al finalizar.');
    });
  };

  // ── Create Service from Roast ──
  const handleCreateService = async (ordenId: number) => {
    setCreatingServiceId(ordenId);
    const res = await createServicioFromOrdenTueste(ordenId);
    if (res.success && res.id) {
      router.push(`/servicios/${res.id}`);
    } else {
      alert('Error: ' + res.error);
      setCreatingServiceId(null);
    }
  };

  // ── Order added callback ──
  const handleOrderAdded = (newOrdenId?: number) => {
    setShowAddOrder(false);
    if (newOrdenId) setActiveOrdenId(newOrdenId);
    router.refresh();
  };

  // ── Compute totals for active orden ──
  const totals = activeBatches.reduce((acc, b) => ({
    gcTotal: acc.gcTotal + Number(b.gc || 0),
    rcTotal: acc.rcTotal + Number(b.rc || 0),
    lwSum: acc.lwSum + Number(b.lw_percent || 0),
    completedCount: acc.completedCount + (b.estado === 'completado' ? 1 : 0),
  }), { gcTotal: 0, rcTotal: 0, lwSum: 0, completedCount: 0 });

  const avgMerma = activeBatches.length > 0 ? totals.lwSum / activeBatches.length : 0;

  // ── Capacity warning ──
  const showCapacityWarning = (gc: number) => {
    return sesion.equipo_capacidad && gc > sesion.equipo_capacidad;
  };

  return (
    <>
      {/* ════ SESSION HEADER ════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/tuestes" className="group text-[#c2a077]/70 hover:text-[#c2a077] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-extrabold text-white">
                Sesión #{sesion.id}
              </h1>
              <span className="text-sm text-gray-400">—</span>
              {isEditingEquipo ? (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedEquipoId}
                    onChange={(e) => setSelectedEquipoId(e.target.value)}
                    className="bg-black/40 border border-[#c2a077] rounded px-2 py-1 text-sm text-white focus:outline-none"
                  >
                    <option value="">-- Sin tostadora --</option>
                    {equipos.map((eq) => (
                      <option key={eq.id} value={eq.id}>{eq.nombre}</option>
                    ))}
                  </select>
                  <button 
                    onClick={async () => {
                      const res = await updateSesionEquipo(sesion.id, selectedEquipoId ? Number(selectedEquipoId) : null);
                      if (res.success) setIsEditingEquipo(false);
                      else alert('Error: ' + res.error);
                    }}
                    className="px-2 py-1 bg-[#c2a077] hover:bg-[#b08e65] text-black text-xs font-bold rounded"
                  >
                    Guardar
                  </button>
                  <button onClick={() => setIsEditingEquipo(false)} className="text-xs text-gray-400 hover:text-white">Cancelar</button>
                </div>
              ) : (
                <span 
                  className="text-sm font-semibold text-[#c2a077] cursor-pointer hover:underline decoration-dashed decoration-white/30"
                  onClick={() => {
                    if (sesion.estado === 'activa') setIsEditingEquipo(true);
                  }}
                  title={sesion.estado === 'activa' ? "Click para editar equipo" : ""}
                >
                  {sesion.equipo_nombre || 'Sin tostadora'}
                  {sesion.estado === 'activa' && <span className="ml-1 text-xs opacity-50">✎</span>}
                </span>
              )}
              <span className="text-sm text-gray-400">—</span>
              <span className="text-sm text-gray-300">{formatDateLatino(sesion.fecha)}</span>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                sesion.estado === 'activa'
                  ? 'bg-amber-950/40 text-amber-300 border-amber-800/40 animate-pulse'
                  : 'bg-white/5 text-gray-400 border-white/10'
              }`}>
                {sesion.estado === 'activa' ? 'Activa' : 'Finalizada'}
              </span>
            </div>
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-3">
          <div className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-3">
            <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">⏱</span>
            <span className="font-mono text-xl font-bold text-white">{formatTimer(timerSeconds)}</span>
            {timerBatchId && (
              <span className="text-xs text-[#c2a077] font-semibold">B#{
                activeBatches.find(b => b.id === timerBatchId)?.batch_n || '?'
              }</span>
            )}
          </div>
          <div className="flex gap-1">
            {!timerRunning ? (
              <button
                onClick={() => selectedBatchId ? startTimer(selectedBatchId) : alert('Selecciona un batch primero')}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors"
              >
                ▶
              </button>
            ) : (
              <button onClick={stopTimer} className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors">
                ⏸
              </button>
            )}
            <button onClick={resetTimer} className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-bold border border-white/10 transition-colors">
              ↺
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-thin scrollbar-thumb-white/10">
        {ordenes.map(o => {
          const oBatches = batchesMap[o.id] || [];
          const isCompleted = oBatches.length > 0 && oBatches.every(b => b.estado === 'completado');
          
          return (
          <div
            key={o.id}
            onClick={() => { setActiveOrdenId(o.id); setSelectedBatchId(null); }}
            className={`flex-shrink-0 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border cursor-pointer select-none ${
              activeOrdenId === o.id
                ? 'bg-[#c2a077] text-[#1a120b] border-[#c2a077] shadow-lg shadow-[#c2a077]/20'
                : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex flex-col items-start text-left min-w-[140px] max-w-[200px] gap-1">
              <div className="flex items-center w-full justify-between gap-1.5">
                <div className="flex items-center truncate">
                  <span className="mr-1.5 flex-shrink-0">{isCompleted ? '✅' : '🔥'}</span>
                  <span className="truncate font-bold">{o.variedad || o.codigo_lote || `Orden ${o.orden_visual}`}</span>
                </div>
                <span className="text-xs opacity-70 flex-shrink-0">({o.batch_count || oBatches.length || 0})</span>
              </div>
              <div className={`text-[10px] font-normal tracking-wide truncate w-full ${activeOrdenId === o.id ? 'text-[#1a120b]/90' : 'text-gray-400'}`}>
                Cliente: <span className="font-semibold">{o.cliente || 'N/A'}</span>
              </div>
              <div className={`text-[10px] font-normal tracking-wide truncate w-full ${activeOrdenId === o.id ? 'text-[#1a120b]/70' : 'text-gray-500'}`}>
                Prod: <span className="font-medium">{o.productor || 'N/A'}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                {o.proceso && (
                  <ProcessBadge proceso={o.proceso} active={activeOrdenId === o.id} className="text-[9px] px-1.5 py-0" />
                )}
                {o.servicio_id && (
                  <Link
                    href={`/servicios/${o.servicio_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                      activeOrdenId === o.id
                        ? 'bg-black/10 text-[#1a120b] border-[#1a120b]/20 hover:bg-black/20 font-bold'
                        : 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40 hover:bg-emerald-900/40 hover:text-emerald-300 font-bold'
                    }`}
                  >
                    OS #{o.servicio_id}
                  </Link>
                )}
              </div>
            </div>
          </div>
        )})}
        
        {sesion.estado === 'activa' && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setShowAddOrder(true)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border border-dashed border-[#c2a077]/40 text-[#c2a077] hover:bg-[#c2a077]/10"
            >
              + Agregar Orden
            </button>
            {ordenes.length > 1 && (
              <button
                onClick={handleAutoReorder}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                title="Ordenar: Naturales y Menor Peso primero"
              >
                🌟 Recomendar Orden
              </button>
            )}
          </div>
        )}
      </div>

      {/* ════ CONTENT: GRID + SIDEBAR ════ */}
      {activeOrden ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* ── Main Grid (75%) ── */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Orden Header */}
            <div className="bg-[#1a120b]/60 backdrop-blur-xl rounded-2xl border border-white/10 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div>
                  <div className="font-bold text-white text-sm flex items-center gap-2">
                    {activeOrden.variedad} <ProcessBadge proceso={activeOrden.proceso} />
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    Lote: <span className="font-mono text-[#c2a077]">{activeOrden.codigo_lote}</span> • 
                    Productor: {activeOrden.productor} • 
                    Cliente: <span className="text-white">{activeOrden.cliente || 'No asignado'}</span>
                  </div>
                </div>
                {activeOrden.estado === 'finalizada' && (
                  <div className="ml-4">
                    {activeOrden.servicio_id ? (
                      <Link 
                        href={`/servicios/${activeOrden.servicio_id}`}
                        className="px-3 py-1.5 bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 rounded-lg text-xs font-bold hover:bg-emerald-900/40 transition-colors"
                      >
                        Ver Orden de Servicio #{activeOrden.servicio_id}
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleCreateService(activeOrden.id)}
                        disabled={creatingServiceId === activeOrden.id}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-blue-900/20"
                      >
                        {creatingServiceId === activeOrden.id ? 'Creando...' : 'Crear Orden de Servicio'}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg flex items-center gap-1" title="Humedad">
                  <span className="text-gray-400 font-bold">H:</span>
                  <input type="number" step="0.01" value={activeOrden.moisture ?? ''}
                    onChange={e => setOrdenes(prev => prev.map(o => o.id === activeOrden.id ? { ...o, moisture: e.target.value } : o))}
                    onBlur={e => handleOrdenFieldChange(activeOrden.id, 'moisture', e.target.value)}
                    className="w-12 bg-transparent text-white font-semibold focus:outline-none focus:border-b focus:border-[#c2a077]" placeholder="-" />
                  <span className="text-gray-400">%</span>
                </div>
                <div className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg flex items-center gap-1" title="Densidad">
                  <span className="text-gray-400 font-bold">D:</span>
                  <input type="number" step="0.1" value={activeOrden.density ?? ''}
                    onChange={e => setOrdenes(prev => prev.map(o => o.id === activeOrden.id ? { ...o, density: e.target.value } : o))}
                    onBlur={e => handleOrdenFieldChange(activeOrden.id, 'density', e.target.value)}
                    className="w-12 bg-transparent text-white font-semibold focus:outline-none focus:border-b focus:border-[#c2a077]" placeholder="-" />
                  <span className="text-gray-400">g/l</span>
                </div>
                <div className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg flex items-center gap-1" title="Actividad de Agua (Aw)">
                  <span className="text-gray-400 font-bold">Aw:</span>
                  <input type="number" step="0.001" value={activeOrden.aw ?? ''}
                    onChange={e => setOrdenes(prev => prev.map(o => o.id === activeOrden.id ? { ...o, aw: e.target.value } : o))}
                    onBlur={e => handleOrdenFieldChange(activeOrden.id, 'aw', e.target.value)}
                    className="w-12 bg-transparent text-white font-semibold focus:outline-none focus:border-b focus:border-[#c2a077]" placeholder="-" />
                </div>
                {sesion.estado === 'activa' && (
                  <div className="flex gap-1 ml-2 pl-2 border-l border-white/10">
                    <button
                      onClick={() => handleMoveOrden(activeOrden.id, 'up')}
                      disabled={ordenes.findIndex(o => o.id === activeOrden.id) === 0}
                      className="px-2 py-1 text-gray-400 hover:text-white disabled:opacity-20 transition-colors"
                      title="Mover Izquierda"
                    >
                      ⬅️
                    </button>
                    <button
                      onClick={() => handleMoveOrden(activeOrden.id, 'down')}
                      disabled={ordenes.findIndex(o => o.id === activeOrden.id) === ordenes.length - 1}
                      className="px-2 py-1 text-gray-400 hover:text-white disabled:opacity-20 transition-colors"
                      title="Mover Derecha"
                    >
                      ➡️
                    </button>
                    <button
                      onClick={() => handleDeleteOrden(activeOrden.id)}
                      className="px-2 py-1 text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg border border-transparent hover:border-red-900/30 transition-colors ml-1"
                      title="Eliminar Orden"
                    >
                      🗑
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Batch Grid */}
            <div className="bg-[#1a120b]/60 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-4 md:p-6 overflow-hidden">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-[#c2a077] uppercase tracking-wider">Hoja de Registro</h3>
                <div className="flex items-center gap-2">
                  {selectedBatchId && autoSaveStatus[selectedBatchId] && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      autoSaveStatus[selectedBatchId] === 'saved' ? 'bg-emerald-950/30 text-emerald-400' :
                      autoSaveStatus[selectedBatchId] === 'saving' ? 'bg-amber-950/30 text-amber-400' :
                      'bg-red-950/30 text-red-400'
                    }`}>
                      {autoSaveStatus[selectedBatchId] === 'saved' ? '● Guardado' :
                       autoSaveStatus[selectedBatchId] === 'saving' ? '● Guardando...' : '● Error'}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-500">Click en celdas para editar</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[1000px]">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-gray-400 uppercase tracking-wider text-[10px]">
                      <th className="p-2.5 font-semibold text-center w-10">B#</th>
                      <th className="p-2.5 font-semibold text-center w-10">G#</th>
                      <th className="p-2.5 font-semibold w-20">Verde (kg)</th>
                      <th className="p-2.5 font-semibold w-20">Tostado (kg)</th>
                      <th className="p-2.5 font-semibold text-center w-14">Merma</th>
                      <th className="p-2.5 font-semibold w-16">TS</th>
                      <th className="p-2.5 font-semibold w-16">FC</th>
                      <th className="p-2.5 font-semibold w-16">Total</th>
                      <th className="p-2.5 font-semibold w-16">T End</th>
                      <th className="p-2.5 font-semibold w-16">Agtron</th>
                      <th className="p-2.5 font-semibold w-24">Notas</th>
                      <th className="p-2.5 font-semibold text-center w-20">Estado</th>
                      <th className="p-2.5 font-semibold text-right w-28">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {activeBatches.map(b => {
                      const isSelected = b.id === selectedBatchId;
                      const isCompleted = b.estado === 'completado';
                      const overCapacity = showCapacityWarning(Number(b.gc || 0));
                      
                      return (
                        <tr
                          key={b.id}
                          onClick={() => setSelectedBatchId(b.id)}
                          className={`transition-colors cursor-pointer duration-150 ${
                            isSelected 
                              ? 'bg-[#c2a077]/10 border-l-4 border-l-[#c2a077]' 
                              : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          <td className="p-2.5 font-mono font-bold text-center text-[#c2a077] text-sm">#{b.batch_n}</td>
                          <td className="p-2.5 font-mono text-center text-gray-500 text-[10px]">
                            {b.orden_ejecucion ? `G${b.orden_ejecucion}` : '-'}
                          </td>
                          <td className="p-1.5">
                            <div className="relative">
                              <input type="number" step="0.001" value={b.gc || ''} 
                                onChange={e => handleCellChange(b.id, 'gc', e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="Verde"
                                className={`w-full text-center font-semibold font-mono py-1 bg-black/40 border rounded text-white focus:outline-none focus:border-[#c2a077] ${
                                  overCapacity ? 'border-amber-500/50' : 'border-white/5'
                                }`}
                              />
                              {overCapacity && (
                                <span className="absolute -top-1 -right-1 text-[8px] bg-amber-600 text-white px-1 rounded" title={`Capacidad máx: ${sesion.equipo_capacidad}kg`}>
                                  ⚠️
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-1.5">
                            <input type="number" step="0.001" value={b.rc || ''}
                              onChange={e => handleCellChange(b.id, 'rc', e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="Tostado"
                              className="w-full text-center font-semibold font-mono py-1 bg-black/40 border border-white/5 rounded text-amber-200 focus:outline-none focus:border-[#c2a077]"
                            />
                          </td>
                          <td className="p-2.5 text-center font-bold font-mono">
                            <span className={Number(b.lw_percent) > 15 ? 'text-red-400' : 'text-emerald-400'}>
                              {b.lw_percent ? `${Number(b.lw_percent).toFixed(1)}%` : '0.0%'}
                            </span>
                          </td>
                          <td className="p-1.5 relative group">
                            <div className="flex items-center gap-1">
                              <input type="text" value={b.t_ts || ''}
                                onChange={e => handleCellChange(b.id, 't_ts', e.target.value)}
                                onBlur={e => handleCellChange(b.id, 't_ts', autoFormatTime(e.target.value))}
                                placeholder="m:ss" className="w-full text-center py-1 bg-black/40 border border-white/5 rounded text-white focus:outline-none focus:border-[#c2a077]"
                              />
                              {timerBatchId === b.id && timerRunning && (
                                <button onClick={() => handleCaptureTime(b.id, 'ts')} className="shrink-0 p-1 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 rounded transition-colors" title="Capturar TS">
                                  ⏱
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-1.5 relative group">
                            <div className="flex items-center gap-1">
                              <input type="text" value={b.t_fc || ''}
                                onChange={e => handleCellChange(b.id, 't_fc', e.target.value)}
                                onBlur={e => handleCellChange(b.id, 't_fc', autoFormatTime(e.target.value))}
                                placeholder="m:ss" className="w-full text-center py-1 bg-black/40 border border-white/5 rounded text-white focus:outline-none focus:border-[#c2a077]"
                              />
                              {timerBatchId === b.id && timerRunning && (
                                <button onClick={() => handleCaptureTime(b.id, 'fc')} className="shrink-0 p-1 bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 rounded transition-colors" title="Capturar FC">
                                  ⏱
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-1.5 relative group">
                            <div className="flex items-center gap-1">
                              <input type="text" value={b.t_t || ''}
                                onChange={e => handleCellChange(b.id, 't_t', e.target.value)}
                                onBlur={e => handleCellChange(b.id, 't_t', autoFormatTime(e.target.value))}
                                placeholder="m:ss" className="w-full text-center py-1 bg-black/40 border border-white/5 rounded text-white focus:outline-none focus:border-[#c2a077]"
                              />
                              {timerBatchId === b.id && timerRunning && (
                                <button onClick={() => handleCaptureTime(b.id, 'end')} className="shrink-0 p-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded transition-colors" title="Capturar Fin y Detener">
                                  🛑
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-1.5">
                            <input type="number" step="0.1" value={b.temp_end || ''}
                              onChange={e => handleCellChange(b.id, 'temp_end', e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="°C" className="w-full text-center py-1 bg-black/40 border border-white/5 rounded text-white focus:outline-none focus:border-[#c2a077]"
                            />
                          </td>
                          <td className="p-1.5">
                            <input type="number" step="0.1" value={b.agtron || ''}
                              onChange={e => handleCellChange(b.id, 'agtron', e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="Color" className="w-full text-center py-1 bg-black/40 border border-white/5 rounded text-white focus:outline-none focus:border-[#c2a077]"
                            />
                          </td>
                          <td className="p-1.5">
                            <input type="text" value={b.notas || ''}
                              onChange={e => handleCellChange(b.id, 'notas', e.target.value)}
                              placeholder="Notas..."
                              className="w-full py-1 px-1.5 bg-black/40 border border-white/5 rounded text-white text-[10px] focus:outline-none focus:border-[#c2a077]"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider border ${
                              isCompleted
                                ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/30'
                                : 'bg-white/5 text-gray-400 border-white/10'
                            }`}>
                              {isCompleted ? '✅' : '📋'}
                            </span>
                          </td>
                          <td className="p-1.5 text-right">
                            <div className="flex justify-end gap-1 items-center">
                              {!isCompleted && sesion.estado === 'activa' && (
                                <>
                                  <button
                                    onClick={e => { e.stopPropagation(); handleCompletarBatch(b.id); }}
                                    disabled={savingBatchId === b.id}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded transition-colors text-[10px]"
                                    title="Completar y mover stock"
                                  >
                                    {savingBatchId === b.id ? '...' : '✓ Stock'}
                                  </button>
                                  <button
                                    onClick={e => { e.stopPropagation(); handleDeleteBatch(b.id); }}
                                    className="px-1.5 py-1 text-red-400/60 hover:text-red-400 hover:bg-red-950/30 rounded border border-transparent hover:border-red-900/30 transition-colors text-[10px]"
                                    title="Eliminar batch"
                                  >
                                    ✕
                                  </button>
                                </>
                              )}
                              {isCompleted && (
                                <>
                                  <button
                                    onClick={e => { e.stopPropagation(); handleRevertBatch(b.id); }}
                                    className="px-2 py-1 text-amber-400 hover:bg-amber-950/30 rounded border border-amber-900/30 transition-colors text-[10px]"
                                    title="Revertir a planificado"
                                  >
                                    ↩
                                  </button>
                                  <button
                                    onClick={e => { e.stopPropagation(); handleSaveAsReference(b.id); }}
                                    className={`p-1 rounded border transition-colors ${
                                      b.es_referencia
                                        ? 'bg-amber-600/20 text-amber-300 border-amber-500/30'
                                        : 'hover:bg-white/5 text-gray-400 border-white/10'
                                    }`}
                                    title={b.es_referencia ? 'Referencia Guardada' : 'Guardar como Referencia'}
                                  >
                                    ⭐
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals Footer */}
              <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex gap-4">
                  <span className="text-gray-400">
                    Σ Verde: <span className="font-bold text-white font-mono">{totals.gcTotal.toFixed(2)} kg</span>
                  </span>
                  <span className="text-gray-400">
                    Σ Tostado: <span className="font-bold text-amber-200 font-mono">{totals.rcTotal.toFixed(2)} kg</span>
                  </span>
                  <span className="text-gray-400">
                    ∅ Merma: <span className={`font-bold font-mono ${avgMerma > 15 ? 'text-red-400' : 'text-emerald-400'}`}>{avgMerma.toFixed(1)}%</span>
                  </span>
                  <span className="text-gray-400">
                    Completados: <span className="font-bold text-white">{totals.completedCount}/{activeBatches.length}</span>
                  </span>
                </div>
                {sesion.estado === 'activa' && (
                  <button
                    onClick={handleAddBatch}
                    className="px-3 py-1.5 border border-dashed border-[#c2a077]/40 text-[#c2a077] rounded-lg hover:bg-[#c2a077]/10 transition-colors text-xs font-semibold"
                  >
                    + Agregar Batch
                  </button>
                )}
              </div>
            </div>

            {/* Finalize */}
            {sesion.estado === 'activa' && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleFinalize}
                  disabled={isFinishing}
                  className="px-6 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-extrabold rounded-xl transition-all shadow-lg shadow-red-950/20"
                >
                  {isFinishing ? 'Finalizando...' : 'Finalizar Sesión'}
                </button>
              </div>
            )}
          </div>

          {/* ── Reference Sidebar (25%) ── */}
          <div className="space-y-4">
            
            {/* Reference Info */}
            <div className="bg-[#1a120b]/60 backdrop-blur-xl rounded-3xl border border-white/10 p-5 shadow-2xl space-y-3">
              <h3 className="text-sm font-bold text-[#c2a077] uppercase tracking-wider border-b border-white/5 pb-2">
                🎯 Perfil Objetivo
              </h3>
              {activeRef ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="font-bold text-white text-sm">{activeRef.nombre_referencia || 'Referencia'}</div>
                    <div className="text-gray-500 text-[10px] mt-0.5">{formatDateLatino(activeRef.fecha)} • {activeRef.codigo_lote}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                      <div className="text-gray-400 text-[10px]">Merma</div>
                      <div className="font-bold text-[#c2a077] text-sm">{activeRef.lw_percent?.toFixed(1)}%</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                      <div className="text-gray-400 text-[10px]">Agtron</div>
                      <div className="font-bold text-[#c2a077] text-sm">{activeRef.agtron || 'N/A'}</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                      <div className="text-gray-400 text-[10px]">TS</div>
                      <div className="font-bold text-white text-sm">{activeRef.t_ts || '-'}</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                      <div className="text-gray-400 text-[10px]">FC</div>
                      <div className="font-bold text-white text-sm">{activeRef.t_fc || '-'}</div>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 border border-white/5 text-center">
                    <div className="text-gray-400 text-[10px]">Total</div>
                    <div className="font-bold text-white text-base">{activeRef.t_t || '-'}</div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-xs py-3 text-center">
                  Sin referencia para esta orden.
                </div>
              )}
            </div>

            {/* Live Comparison */}
            {selectedBatch && activeRef && (
              <div className="bg-[#1a120b]/60 backdrop-blur-xl rounded-3xl border border-white/10 p-5 shadow-2xl space-y-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">
                  ⚖️ Δ Batch #{selectedBatch.batch_n}
                </h3>
                <div className="space-y-2.5 text-xs">
                  {[
                    { label: 'Merma %', val: getDeltaValue(selectedBatch.lw_percent, activeRef.lw_percent, 1), suffix: '%', warn: Number(getDeltaValue(selectedBatch.lw_percent, activeRef.lw_percent, 1)) > 1.0 },
                    { label: 'Secado', val: getDeltaTime(selectedBatch.t_ts, activeRef.t_ts) },
                    { label: 'Crack', val: getDeltaTime(selectedBatch.t_fc, activeRef.t_fc) },
                    { label: 'Total', val: getDeltaTime(selectedBatch.t_t, activeRef.t_t) },
                    { label: 'Agtron', val: getDeltaValue(selectedBatch.agtron, activeRef.agtron, 1) },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-white/5 pb-2 last:border-0">
                      <span className="text-gray-400">{item.label}</span>
                      {item.val !== null ? (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          item.warn ? 'bg-red-950/40 text-red-400' : 'bg-white/5 text-[#c2a077]'
                        }`}>
                          {item.val}{item.suffix || ''}
                        </span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* No orders yet */
        <div className="bg-[#1a120b]/60 backdrop-blur-xl rounded-3xl border border-white/10 p-12 text-center shadow-2xl">
          <div className="text-4xl mb-4">☕</div>
          <h3 className="text-xl font-bold text-white mb-2">Sesión vacía</h3>
          <p className="text-gray-400 mb-6">Agrega tu primera Orden de Tueste para comenzar.</p>
          {sesion.estado === 'activa' && (
            <button
              onClick={() => setShowAddOrder(true)}
              className="px-6 py-3 bg-[#c2a077] hover:bg-[#b08f65] text-[#1a120b] font-extrabold rounded-xl transition-all shadow-lg shadow-[#c2a077]/10"
            >
              + Agregar Orden de Tueste
            </button>
          )}
        </div>
      )}

      {/* ════ ADD ORDER MODAL ════ */}
      {showAddOrder && (
        <AddOrderModal
          sesionId={sesion.id}
          lotes={lotes}
          referencias={referencias}
          clientes={clientes}
          equipoCapacidad={sesion.equipo_capacidad}
          onClose={() => setShowAddOrder(false)}
          onCreated={handleOrderAdded}
        />
      )}
    </>
  );
}
