'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import AddServiceModal from './AddServiceModal'
import { formatDateLatino } from '@/lib/dateUtils'
import ProcessBadge from '@/components/ProcessBadge'
import { updateServicioEstado } from '@/app/actions'

const PROCESS_TAGS = ['Trillado', 'Selección', 'Tueste', 'Molienda', 'Envasado'];

const formatMoney = (amount: number | null | undefined) => {
  if (amount == null || isNaN(amount)) return 'S/ 0.00';
  return `S/ ${Number(amount).toFixed(2)}`;
};

const getTotalService = (s: any) => {
  return (Number(s.total_trillado) || 0) +
         (Number(s.total_seleccion) || 0) +
         (Number(s.total_tueste) || 0) +
         (Number(s.total) || 0) + // Molienda
         (Number(s.total_envasado) || 0);
};

const getTagCost = (s: any, tag: string) => {
  switch (tag) {
    case 'Trillado': return s.total_trillado;
    case 'Selección': return s.total_seleccion;
    case 'Tueste': return s.total_tueste;
    case 'Molienda': return s.total; // total refers to molienda
    case 'Envasado': return s.total_envasado;
    default: return 0;
  }
};

const isTagActive = (s: any, tag: string) => {
  switch (tag) {
    case 'Trillado':
      return s.pc !== null || s.hc !== null || s.trillado_precio_kg !== null;
    case 'Selección':
      return s.seleccion_precio_kg !== null || s.total_seleccion !== null;
    case 'Tueste':
      return s.tueste_precio_kg !== null || s.gc !== null;
    case 'Molienda':
      return s.molienda_precio_kg !== null || s.total !== null;
    case 'Envasado':
      return s.envasado_precio_unidad !== null;
    default:
      return false;
  }
};

const getTagColorClass = (tag: string) => {
  switch (tag) {
    case 'Trillado':
      return 'bg-sky-500/10 border-sky-500/30 text-sky-400'
    case 'Selección':
      return 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
    case 'Tueste':
      return 'bg-amber-500/10 border-amber-500/30 text-amber-400'
    case 'Molienda':
      return 'bg-yellow-600/10 border-yellow-600/30 text-yellow-400'
    case 'Envasado':
      return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
    default:
      return 'bg-gray-500/10 border-gray-500/30 text-gray-400'
  }
};

export default function ServiciosClient({ 
  servicios, 
  clientes,
  lotes,
  activeSessions,
  globalAjustes,
  equipos,
  unlinkedTuestes
}: { 
  servicios: any[]; 
  clientes: any[];
  lotes: any[];
  activeSessions: any[];
  globalAjustes: Record<string, string>; 
  equipos: any[];
  unlinkedTuestes: any[];
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [initialModalType, setInitialModalType] = useState<'trillado' | 'seleccion' | 'tueste' | 'molienda' | 'envasado' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const searchParams = useSearchParams();
  const router = useRouter();

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleEstadoChange = async (id: number, nuevoEstado: string) => {
    startTransition(async () => {
      const res = await updateServicioEstado(id, nuevoEstado);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Error al actualizar el estado del servicio.');
        router.refresh();
      }
    });
  };

  useEffect(() => {
    const action = searchParams.get('action');
    if (action) {
      if (['trillado', 'seleccion', 'tueste', 'molienda', 'envasado'].includes(action)) {
        setInitialModalType(action as any);
        setShowAddModal(true);
      }
      // Remove query param to avoid re-opening on reload
      router.replace('/servicios', { scroll: false });
    }
  }, [searchParams, router]);

  const handleOpenModal = (type: 'trillado' | 'seleccion' | 'tueste' | 'molienda' | 'envasado' | 'all') => {
    setInitialModalType(type);
    setShowAddModal(true);
  };

  const filteredServicios = servicios.filter(s => {
    const matchesSearch = 
      (s.cliente || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.variedad || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.n_orden || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesTags = selectedTags.every(tag => isTagActive(s, tag));
    
    return matchesSearch && matchesTags;
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1a120b] via-[#2a1d13] to-[#1a120b] text-gray-100 p-4 md:p-8 font-sans selection:bg-[#c2a077]/30">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Dashboard */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#c2a077] to-yellow-200">
              Órdenes de Trabajo
            </h1>
            <p className="text-[#c2a077]/60 text-sm mt-1">
              Panel de control para gestionar los servicios y lotes en custodia.
            </p>
          </div>
          <button
            onClick={() => handleOpenModal('all')}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-[#c2a077] hover:bg-[#b08f65] text-[#1a120b] font-bold rounded-2xl transition-all shadow-lg shadow-[#c2a077]/10"
          >
            <span>➕</span> Crear OT Completa
          </button>
        </div>

        {/* Filters Panel */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Tag filter badges */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-[#c2a077]/60 uppercase tracking-wider font-semibold mr-1">Filtrar por Proceso:</span>
            {PROCESS_TAGS.map(tag => {
              const active = selectedTags.includes(tag);
              const colorClass = getTagColorClass(tag);
              return (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    active 
                      ? colorClass + ' ring-1 ring-[#c2a077]/50 shadow-md' 
                      : 'bg-[#1a120b]/60 border-white/10 text-gray-400 hover:bg-white/5 hover:text-gray-300'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-xs text-[#c2a077] hover:underline font-semibold ml-2 px-1 py-1"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative md:w-80">
            <span className="absolute left-4 top-3 text-gray-400 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Buscar cliente, variedad o N°..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#1a120b]/60 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#c2a077] placeholder-gray-500"
            />
          </div>
        </div>

        {/* Table Container - Glassmorphism */}
        <div className="bg-[#1a120b]/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-[#1a120b]/60 text-[#c2a077] text-xs uppercase tracking-wider">
                  <th className="px-4 py-4 font-semibold">N° Orden</th>
                  <th className="px-4 py-4 font-semibold">Cliente</th>
                  <th className="px-4 py-4 font-semibold">Café</th>
                  <th className="px-4 py-4 font-semibold">Servicios</th>
                  <th className="px-4 py-4 font-semibold">Total</th>
                  <th className="px-4 py-4 font-semibold">Fechas</th>
                  <th className="px-4 py-4 font-semibold">Estado</th>
                  <th className="px-4 py-4 font-semibold text-right sticky right-0 bg-[#1a120b] z-10 border-l border-white/5">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredServicios.map((s: any) => (
                  <tr key={s.id} className="hover:bg-white/5 transition-colors duration-150 group">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-mono font-bold text-[#c2a077]/80">
                      #{s.n_orden}
                    </td>
                    <td className="px-4 py-4 whitespace-normal text-sm font-bold text-white uppercase min-w-[120px]">
                      {s.cliente}
                    </td>
                    <td className="px-4 py-4 whitespace-normal text-sm text-gray-300 min-w-[140px]">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-white">{s.variedad}</span>
                        {s.proceso && <div><ProcessBadge proceso={s.proceso} /></div>}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-normal min-w-[160px]">
                      <div className="flex flex-wrap gap-1.5">
                        {PROCESS_TAGS.map(tag => {
                          if (isTagActive(s, tag)) {
                            const cost = getTagCost(s, tag);
                            return (
                              <span
                                key={tag}
                                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${getTagColorClass(tag)}`}
                              >
                                <span>{tag}</span>
                                {cost ? <span className="opacity-80">({formatMoney(cost)})</span> : null}
                              </span>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-[#c2a077]">
                      {formatMoney(getTotalService(s))}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-400">
                      <div className="flex flex-col gap-0.5 font-mono">
                        {s.fecha_trillado && (
                          <div>
                            <span className="font-semibold text-[#c2a077]/70">Trillado:</span> {formatDateLatino(s.fecha_trillado)}
                          </div>
                        )}
                        {s.fecha_tueste && (
                          <div>
                            <span className="font-semibold text-[#c2a077]/70">Tueste:</span> {formatDateLatino(s.fecha_tueste)}
                          </div>
                        )}
                        {!s.fecha_trillado && !s.fecha_tueste && (
                          <span className="text-gray-500">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <select
                        value={s.estado || 'Pendiente'}
                        onChange={(e) => handleEstadoChange(s.id, e.target.value)}
                        disabled={isPending}
                        className={`text-xs font-bold px-3 py-1.5 border rounded-xl uppercase tracking-wider bg-[#1a120b] cursor-pointer focus:outline-none focus:border-[#c2a077] ${
                          s.estado === 'Completado'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-white/5 border-white/10 text-amber-400'
                        }`}
                      >
                        <option value="Pendiente" className="bg-[#1a120b] text-amber-400">Pendiente</option>
                        <option value="Completado" className="bg-[#1a120b] text-emerald-400">Completado</option>
                      </select>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right sticky right-0 bg-[#140e08] group-hover:bg-[#1a120b] transition-colors border-l border-white/5">
                      <Link 
                        href={`/servicios/${s.n_orden}`}
                        className="inline-flex items-center justify-center p-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white rounded-xl text-xs font-semibold transition-all"
                        title="Ver Resumen"
                      >
                        👁️
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredServicios.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                No hay servicios registrados aún.
              </div>
            )}
          </div>
        </div>

      </div>

      {showAddModal && (
        <AddServiceModal
          onClose={() => setShowAddModal(false)}
          clientes={clientes}
          lotes={lotes}
          activeSessions={activeSessions}
          globalAjustes={globalAjustes}
          initialType={initialModalType}
          equipos={equipos}
          unlinkedTuestes={unlinkedTuestes}
        />
      )}
    </div>
  )
}
