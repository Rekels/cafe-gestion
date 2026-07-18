'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createServicio, getClienteDefaults, createServicioFromOrdenTueste } from '@/app/actions'
import CrearLoteModal from './CrearLoteModal'
import ProcessBadge from '@/components/ProcessBadge'

interface ClientInfo {
  id: number;
  nombre: string;
  empresa?: string;
  default_trillado_precio_kg?: number;
  default_seleccion_precio_kg?: number;
  default_tueste_precio_kg?: number;
  default_molienda_precio_kg?: number;
  default_envasado_precio_unidad?: number;
}

interface LoteInfo {
  id: number;
  codigo_lote: string;
  variedad?: string;
  proceso?: string;
  productor?: string;
  stock_real?: number;
  stock_tostado?: number;
}

export default function AddServiceModal({ 
  onClose, 
  clientes, 
  lotes,
  activeSessions,
  globalAjustes,
  initialType,
  equipos,
  unlinkedTuestes
}: { 
  onClose: () => void; 
  clientes: ClientInfo[]; 
  lotes: LoteInfo[];
  activeSessions: any[];
  globalAjustes: Record<string, string>; 
  initialType?: 'trillado' | 'seleccion' | 'tueste' | 'molienda' | 'envasado' | 'all';
  equipos?: any[];
  unlinkedTuestes?: any[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isQuickCreating, startQuickCreateTransition] = useTransition();

  const [selectedUnlinkedTueste, setSelectedUnlinkedTueste] = useState<string>('');

  // Client Selection State
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);

  // Lote Selection State
  const [localLotes, setLocalLotes] = useState<LoteInfo[]>(lotes || []);
  const [loteSearchQuery, setLoteSearchQuery] = useState('');
  const [isLoteDropdownOpen, setIsLoteDropdownOpen] = useState(false);
  const [showCreateLoteModal, setShowCreateLoteModal] = useState(false);
  const [isLoteLocked, setIsLoteLocked] = useState(false);

  // Coffee details
  const [variedad, setVariedad] = useState('');
  const [proceso, setProceso] = useState('');
  const [productor, setProductor] = useState('');
  const [codigoCafe, setCodigoCafe] = useState('');

  // Tueste Programming state
  const [programacionTuesteOpcion, setProgramacionTuesteOpcion] = useState('crear_nueva');
  const [programacionTuesteSesionId, setProgramacionTuesteSesionId] = useState('');
  const [tostadoraId, setTostadoraId] = useState('');

  // Physical specs
  const [mPercent, setMPercent] = useState<string>('');
  const [aw, setAw] = useState<string>('');
  const [d, setD] = useState<string>('');

  // Active services
  const [hasTrillado, setHasTrillado] = useState(initialType === 'trillado' || initialType === 'all');
  const [hasSeleccion, setHasSeleccion] = useState(initialType === 'seleccion' || initialType === 'all');
  const [hasTueste, setHasTueste] = useState(initialType === 'tueste' || initialType === 'all');
  const [hasMolienda, setHasMolienda] = useState(initialType === 'molienda' || initialType === 'all');
  const [hasEnvasado, setHasEnvasado] = useState(initialType === 'envasado' || initialType === 'all');

  // Service pricing & weights
  const [pc, setPc] = useState<string>('');
  const [trilladoPrecio, setTrilladoPrecio] = useState<string>('');
  const [trilladoraId, setTrilladoraId] = useState<string>('');
  
  const [seleccionPrecio, setSeleccionPrecio] = useState<string>('0.00');
  const [gc, setGc] = useState<string>('');
  const [tuestePrecio, setTuestePrecio] = useState<string>('');
  const [nBatches, setNBatches] = useState<number>(1);
  
  const [moliendaPrecio, setMoliendaPrecio] = useState<string>('');
  const [moliendaTotalWeight, setMoliendaTotalWeight] = useState<string>('');
  
  const [envasadoPrecio, setEnvasadoPrecio] = useState<string>('');
  const [envasadoCantidad, setEnvasadoCantidad] = useState<string>('');
  const [envasadoTipo, setEnvasadoTipo] = useState<string>('grano');

  const filteredClients = clientes.filter(c => 
    c.nombre.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    (c.empresa && c.empresa.toLowerCase().includes(clientSearchQuery.toLowerCase()))
  );

  const filteredActiveSessions = activeSessions || [];

  useEffect(() => {
    if (programacionTuesteOpcion === 'asignar_existente') {
      const exists = filteredActiveSessions.some(s => String(s.id) === programacionTuesteSesionId);
      if (!exists) {
        setProgramacionTuesteSesionId('');
      }
    }
  }, [selectedClient, programacionTuesteOpcion, filteredActiveSessions, programacionTuesteSesionId]);

  // Load client defaults or global defaults when a client is selected
  const handleClientSelect = async (clientName: string) => {
    setSelectedClient(clientName);
    setClientSearchQuery(clientName);
    setIsClientDropdownOpen(false);

    // Fetch defaults
    const defaults = await getClienteDefaults(clientName);
    
    // Set prices: use client default or global default
    setTrilladoPrecio(String(defaults?.default_trillado_precio_kg ?? globalAjustes.global_trillado_precio_kg ?? '1.00'));
    setSeleccionPrecio('0.00'); // Fixed to 0 by default for selection
    setTuestePrecio(String(defaults?.default_tueste_precio_kg ?? globalAjustes.global_tueste_precio_kg ?? '6.00'));
    setMoliendaPrecio(String(defaults?.default_molienda_precio_kg ?? globalAjustes.global_molienda_precio_kg ?? '1.00'));
    setEnvasadoPrecio(String(defaults?.default_envasado_precio_unidad ?? globalAjustes.global_envasado_precio_unidad ?? '0.50'));
  };

  const handleCreateNewClient = () => {
    const newName = clientSearchQuery.toUpperCase().trim();
    if (!newName) return;
    handleClientSelect(newName);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClient) {
      alert('Debes seleccionar o crear un cliente.');
      return;
    }

    const finalCodigoCafe = (codigoCafe || loteSearchQuery).toUpperCase().trim();

    const formData = new FormData();
    formData.append('cliente', selectedClient);
    formData.append('variedad', variedad);
    formData.append('proceso', proceso);
    formData.append('productor', productor);
    formData.append('codigo_cafe', finalCodigoCafe);
    if (mPercent) formData.append('m_percent', mPercent);
    if (aw) formData.append('aw', aw);
    if (d) formData.append('d', d);

    formData.append('has_trillado', String(hasTrillado));
    formData.append('has_seleccion', String(hasSeleccion));
    formData.append('has_tueste', String(hasTueste));
    formData.append('has_molienda', String(hasMolienda));
    formData.append('has_envasado', String(hasEnvasado));

    if (hasTrillado) {
      formData.append('pc', pc);
      formData.append('trillado_precio_kg', trilladoPrecio);
      formData.append('trilladora_id', trilladoraId);
    }
    if (hasSeleccion) {
      formData.append('has_seleccion', 'true');
      formData.append('seleccion_precio_kg', seleccionPrecio);
    }
    if (hasTueste) {
      formData.append('has_tueste', 'true');
      if (gc) formData.append('gc', gc);
      formData.append('n_batches', String(nBatches));
      formData.append('tueste_precio_kg', tuestePrecio);
      formData.append('tostadora_id', tostadoraId);
      formData.append('programacion_tueste_opcion', programacionTuesteOpcion);
      if (programacionTuesteOpcion === 'asignar_existente') {
        formData.append('programacion_tueste_sesion_id', programacionTuesteSesionId);
      }
    }
    if (hasMolienda) {
      formData.append('molienda_precio_kg', moliendaPrecio);
      formData.append('total', moliendaTotalWeight);
    }
    if (hasEnvasado) {
      formData.append('envasado_precio_unidad', envasadoPrecio);
      formData.append('envasado_cantidad', envasadoCantidad);
      formData.append('envasado_tipo', envasadoTipo);
    }

    // Auto-deduce incoming state and dispatch it to backend
    let deducedTipoCafe = 'stock_tostado';
    let deducedCantidad = '';

    if (hasTrillado) {
      deducedTipoCafe = 'stock_pergamino';
      deducedCantidad = pc;
    } else if (hasSeleccion) {
      deducedTipoCafe = 'stock_oro_verde_bruto';
      deducedCantidad = gc || pc || '0'; // They might not have inputted a specific field for seleccion incoming yet. We should use a general incoming weight or gc.
    } else if (hasTueste) {
      deducedTipoCafe = 'stock_oro_verde_seleccionado';
      deducedCantidad = gc;
    } else if (hasMolienda || hasEnvasado) {
      deducedTipoCafe = 'stock_tostado';
      deducedCantidad = moliendaTotalWeight || envasadoCantidad; 
    }

    if (deducedCantidad) {
      formData.append('ingreso_cantidad', deducedCantidad);
      formData.append('ingreso_tipo_cafe', deducedTipoCafe);
      formData.append('ingreso_motivo', 'Ingreso automático por creación de servicio');
    }

    startTransition(async () => {
      const res = await createServicio(formData);
      if (res.success && res.id) {
        onClose();
        router.push(`/servicios/${res.id}`);
      } else {
        alert('Error: ' + res.error);
      }
    });
  };

  const handleQuickCreate = async () => {
    if (!selectedUnlinkedTueste) return;
    startQuickCreateTransition(async () => {
      const res = await createServicioFromOrdenTueste(Number(selectedUnlinkedTueste));
      if (res.success && res.id) {
        onClose();
        router.push(`/servicios/${res.id}`);
      } else {
        alert('Error: ' + res.error);
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="relative bg-[#1a120b] border border-white/10 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-[#c2a077] flex items-center gap-2">
              <span>📋</span> Nueva Orden de Servicio
            </h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-xl transition-colors">✕</button>
          </div>

          {unlinkedTuestes && unlinkedTuestes.length > 0 && (
            <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold text-blue-300 mb-1">💡 Crear rápido desde Orden de Tueste Finalizada</label>
                <select 
                  value={selectedUnlinkedTueste} 
                  onChange={e => setSelectedUnlinkedTueste(e.target.value)}
                  className="w-full bg-black/40 border border-blue-500/30 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="">-- Seleccionar Orden de Tueste --</option>
                  {unlinkedTuestes.map(t => (
                    <option key={t.id} value={t.id}>
                      Orden #{t.id} - Lote: {t.codigo_lote} ({t.cliente || 'Sin cliente'}) - Sesión: {t.fecha}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleQuickCreate}
                disabled={!selectedUnlinkedTueste || isQuickCreating}
                className="px-4 py-2 mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all whitespace-nowrap"
              >
                {isQuickCreating ? 'Creando...' : 'Crear Rápido'}
              </button>
            </div>
          )}

          {/* Client Selection */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-400 mb-2">Cliente *</label>
            <input
              type="text"
              value={clientSearchQuery}
              onChange={(e) => {
                setClientSearchQuery(e.target.value);
                setSelectedClient('');
                setIsClientDropdownOpen(true);
              }}
              onFocus={() => setIsClientDropdownOpen(true)}
              placeholder="Buscar o escribir nombre de cliente..."
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#c2a077] transition-all"
            />
            {isClientDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsClientDropdownOpen(false)} />
                <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-[#1a120b] border border-white/10 rounded-xl shadow-2xl z-20 divide-y divide-white/5">
                  {filteredClients.map(c => (
                    <div
                      key={c.id}
                      onClick={() => handleClientSelect(c.nombre)}
                      className="p-3 hover:bg-[#c2a077]/10 cursor-pointer text-xs text-gray-300 transition-colors font-bold uppercase flex flex-col gap-0.5"
                    >
                      <span>{c.nombre}</span>
                      {c.empresa && (
                        <span className="text-[10px] text-gray-500 font-normal">Empresa: {c.empresa}</span>
                      )}
                    </div>
                  ))}
                  {filteredClients.length === 0 && clientSearchQuery.trim() && (
                    <div
                      onClick={handleCreateNewClient}
                      className="p-3 hover:bg-emerald-500/10 text-emerald-400 cursor-pointer text-xs transition-colors font-bold"
                    >
                      ➕ Crear nuevo cliente: "{clientSearchQuery.toUpperCase().trim()}"
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Coffee specs / Lote selector */}
          <div className="space-y-4 bg-black/20 p-4 rounded-2xl border border-white/5">
            <h3 className="text-xs font-semibold text-[#c2a077] uppercase tracking-wider">Especificación de Lote</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="relative md:col-span-5">
                <label className="block text-xs font-semibold text-gray-400 mb-1">Buscar / Seleccionar Lote</label>
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={loteSearchQuery}
                      onChange={(e) => {
                        setLoteSearchQuery(e.target.value);
                        if (!e.target.value) {
                          setCodigoCafe('');
                          setVariedad('');
                          setProceso('');
                          setProductor('');
                          setIsLoteLocked(false);
                        }
                        setIsLoteDropdownOpen(true);
                      }}
                      onFocus={() => setIsLoteDropdownOpen(true)}
                      placeholder="Código, variedad, proceso..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077] transition-all"
                    />
                    {loteSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setLoteSearchQuery('');
                          setCodigoCafe('');
                          setVariedad('');
                          setProceso('');
                          setProductor('');
                          setIsLoteLocked(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateLoteModal(true)}
                    className="px-3 py-2 bg-[#c2a077]/20 hover:bg-[#c2a077]/40 border border-[#c2a077]/30 text-[#c2a077] hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0"
                  >
                    ➕ Nuevo Lote
                  </button>
                </div>
                
                {isLoteDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsLoteDropdownOpen(false)} />
                    <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-[#1a120b] border border-white/10 rounded-xl shadow-2xl z-20 divide-y divide-white/5">
                      {localLotes
                        .filter(l =>
                          (l.codigo_lote || '').toLowerCase().includes(loteSearchQuery.toLowerCase()) ||
                          (l.variedad || '').toLowerCase().includes(loteSearchQuery.toLowerCase()) ||
                          (l.proceso || '').toLowerCase().includes(loteSearchQuery.toLowerCase()) ||
                          (l.productor || '').toLowerCase().includes(loteSearchQuery.toLowerCase())
                        )
                        .map(l => (
                          <div
                            key={l.id}
                            onClick={() => {
                              setLoteSearchQuery(l.codigo_lote);
                              setCodigoCafe(l.codigo_lote);
                              setVariedad(l.variedad || '');
                              setProceso(l.proceso || '');
                              setProductor(l.productor || '');
                              setIsLoteLocked(true);
                              setIsLoteDropdownOpen(false);
                            }}
                            className="p-3 hover:bg-[#c2a077]/10 cursor-pointer text-left transition-colors"
                          >
                            <div className="font-bold text-[#c2a077] font-mono uppercase">{l.codigo_lote}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5 uppercase flex items-center gap-1.5 flex-wrap">
                              {l.variedad || 'Sin Variedad'} • <ProcessBadge proceso={l.proceso} /> • {l.productor || 'Sin Productor'}
                            </div>
                          </div>
                        ))}
                      {localLotes.filter(l =>
                        (l.codigo_lote || '').toLowerCase().includes(loteSearchQuery.toLowerCase()) ||
                        (l.variedad || '').toLowerCase().includes(loteSearchQuery.toLowerCase()) ||
                        (l.proceso || '').toLowerCase().includes(loteSearchQuery.toLowerCase()) ||
                        (l.productor || '').toLowerCase().includes(loteSearchQuery.toLowerCase())
                      ).length === 0 && (
                        <div className="p-3 text-gray-500 text-xs italic">
                          No se encontraron lotes. Puedes crear uno nuevo.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-400 mb-1">Variedad</label>
                <input
                  type="text"
                  value={variedad}
                  onChange={e => setVariedad(e.target.value)}
                  disabled={isLoteLocked}
                  placeholder="Ej: GEISHA"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077] disabled:opacity-50 disabled:bg-black/60 uppercase"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-400 mb-1">Proceso</label>
                <input
                  type="text"
                  value={proceso}
                  onChange={e => setProceso(e.target.value)}
                  disabled={isLoteLocked}
                  placeholder="Ej: NATURAL"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077] disabled:opacity-50 disabled:bg-black/60 uppercase"
                />
              </div>
              
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-400 mb-1">Productor / Finca</label>
                <input
                  type="text"
                  value={productor}
                  onChange={e => setProductor(e.target.value)}
                  disabled={isLoteLocked}
                  placeholder="Ej: JUAN PEREZ"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077] disabled:opacity-50 disabled:bg-black/60 uppercase"
                />
              </div>
            </div>
          </div>

          {/* Physical specs */}
          <div className="grid grid-cols-3 gap-4 bg-black/20 p-4 rounded-2xl border border-white/5">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Humedad (%)</label>
              <input type="number" step="0.01" value={mPercent} onChange={e => setMPercent(e.target.value)} placeholder="11.5" className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Actividad de Agua (Aw)</label>
              <input type="number" step="0.001" value={aw} onChange={e => setAw(e.target.value)} placeholder="0.580" className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Densidad (g/l)</label>
              <input type="number" step="0.1" value={d} onChange={e => setD(e.target.value)} placeholder="720.0" className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077]" />
            </div>
          </div>

          {/* Services Selector & Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#c2a077] uppercase tracking-wider">Servicios Contratados</h3>
            
            {/* Service Checkboxes */}
            <div className="flex flex-wrap gap-4 bg-black/30 p-4 rounded-2xl border border-white/10">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={hasTrillado} onChange={e => setHasTrillado(e.target.checked)} className="rounded text-[#c2a077] focus:ring-0" />
                <span>Trillado</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={hasSeleccion} onChange={e => setHasSeleccion(e.target.checked)} className="rounded text-[#c2a077] focus:ring-0" />
                <span>Selección Verde</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={hasTueste} onChange={e => setHasTueste(e.target.checked)} className="rounded text-[#c2a077] focus:ring-0" />
                <span>Tueste</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={hasMolienda} onChange={e => setHasMolienda(e.target.checked)} className="rounded text-[#c2a077] focus:ring-0" />
                <span>Molienda</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={hasEnvasado} onChange={e => setHasEnvasado(e.target.checked)} className="rounded text-[#c2a077] focus:ring-0" />
                <span>Envasado</span>
              </label>
            </div>

            {/* Service-specific Input Blocks */}
            <div className="space-y-4">
              
              {/* Trillado Block */}
              {hasTrillado && (
                <div className="bg-[#c2a077]/5 border border-[#c2a077]/20 rounded-2xl p-4 space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>🌾</span> Servicio de Trillado
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                      <label className="block text-xs text-gray-400 mb-1">Peso Pergamino In (KG)</label>
                      <input type="number" step="0.01" value={pc} onChange={e => setPc(e.target.value)} required className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077]" />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs text-gray-400 mb-1">Equipo</label>
                      <select value={trilladoraId} onChange={e => setTrilladoraId(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077]">
                        <option value="">-- Seleccionar Equipo --</option>
                        {equipos?.filter(e => e.tipo === 'trilladora').map(e => (
                          <option key={e.id} value={e.id}>{e.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs text-gray-400 mb-1">Precio x KG</label>
                      <input type="number" step="0.01" value={trilladoPrecio} onChange={e => setTrilladoPrecio(e.target.value)} required className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077]" />
                    </div>
                  </div>
                </div>
              )}

              {/* Selección Block */}
              {hasSeleccion && (
                <div className="bg-[#c2a077]/5 border border-[#c2a077]/20 rounded-2xl p-4 space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>✨</span> Selección de Verde
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-400 mb-1">Precio x KG Selección</label>
                      <input type="number" step="0.01" value={seleccionPrecio} onChange={e => setSeleccionPrecio(e.target.value)} required className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077]" />
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    💡 La merma será enviada a "Descartes". Se cobrará por el peso In.
                  </div>
                </div>
              )}

              {/* Tueste Block */}
              {hasTueste && (
                <div className="bg-[#c2a077]/5 border border-[#c2a077]/20 rounded-2xl p-4 space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>🔥</span> Servicio de Tueste
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Peso Verde a Tostar (KG)</label>
                      <input type="number" step="0.01" value={gc} onChange={e => setGc(e.target.value)} placeholder={'Ingresar peso a tostar'} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077]" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Cant. de Lotes (Batches)</label>
                      <input type="number" min="1" step="1" value={nBatches} onChange={e => setNBatches(Number(e.target.value))} required className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077]" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Precio x KG Tueste</label>
                      <input type="number" step="0.01" value={tuestePrecio} onChange={e => setTuestePrecio(e.target.value)} required className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077]" />
                    </div>
                  </div>
                    
                    {/* Tueste Programming */}
                    <div className="col-span-2 border-t border-white/5 pt-4 mt-2">
                      <label className="block text-xs font-semibold text-gray-400 mb-2">Programación de Sesión de Tueste</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <select
                            value={programacionTuesteOpcion}
                            onChange={e => setProgramacionTuesteOpcion(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c2a077]"
                          >
                            <option value="crear_nueva">🔥 Crear nueva sesión activa (Hoy)</option>
                            {filteredActiveSessions && filteredActiveSessions.length > 0 && (
                              <option value="asignar_existente">📅 Asignar a sesión activa existente</option>
                            )}
                            <option value="ninguna">⏳ No programar tueste por ahora</option>
                          </select>
                        </div>
                        {programacionTuesteOpcion === 'crear_nueva' && (
                          <div>
                            <select
                              value={tostadoraId}
                              onChange={e => setTostadoraId(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c2a077]"
                            >
                              <option value="">-- Seleccionar Tostadora (Opcional) --</option>
                              {equipos?.filter(e => e.tipo === 'tostadora').map(e => (
                                <option key={e.id} value={e.id}>{e.nombre}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        {programacionTuesteOpcion === 'asignar_existente' && (
                          <div>
                            <select
                              value={programacionTuesteSesionId}
                              onChange={e => setProgramacionTuesteSesionId(e.target.value)}
                              required={programacionTuesteOpcion === 'asignar_existente'}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c2a077]"
                            >
                              <option value="">-- Seleccionar Sesión Activa --</option>
                              {filteredActiveSessions.map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.fecha} • {s.equipo_nombre || 'Sin tostadora'} (ID #{s.id})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                </div>
              )}

              {/* Molienda Block */}
              {hasMolienda && (
                <div className="bg-[#c2a077]/5 border border-[#c2a077]/20 rounded-2xl p-4 space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>☕</span> Servicio de Molienda
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Peso Molido Estimado (KG)</label>
                      <input type="number" step="0.01" value={moliendaTotalWeight} onChange={e => setMoliendaTotalWeight(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077]" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Precio x KG Molienda</label>
                      <input type="number" step="0.01" value={moliendaPrecio} onChange={e => setMoliendaPrecio(e.target.value)} required className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077]" />
                    </div>
                  </div>
                </div>
              )}

              {/* Envasado Block */}
              {hasEnvasado && (
                <div className="bg-[#c2a077]/5 border border-[#c2a077]/20 rounded-2xl p-4 space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>📦</span> Servicio de Envasado
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Tipo de Envasado</label>
                      <select value={envasadoTipo} onChange={e => setEnvasadoTipo(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077]">
                        <option value="grano">Tostado en Grano</option>
                        <option value="molido">Molido y Envasado</option>
                        <option value="escogido">Escogido y Envasado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Cantidad de Bolsas</label>
                      <input type="number" value={envasadoCantidad} onChange={e => setEnvasadoCantidad(e.target.value)} required className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077]" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Precio x Bolsa (Unidad)</label>
                      <input type="number" step="0.01" value={envasadoPrecio} onChange={e => setEnvasadoPrecio(e.target.value)} required className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077]" />
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Auto Deduced Incoming State */}
          <div className="bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-2xl">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>🧠</span> Ingreso Automático de Grano
            </h4>
            <p className="text-sm text-emerald-200/70 leading-relaxed">
              Basado en los servicios seleccionados, el sistema asumirá que el grano está ingresando al almacén en estado: 
              <span className="font-bold text-emerald-300 ml-1">
                {hasTrillado ? 'PERGAMINO' : hasSeleccion ? 'ORO VERDE BRUTO' : hasTueste ? 'ORO VERDE SELECCIONADO' : 'TOSTADO'}
              </span>.
              El peso de ingreso se tomará del primer servicio de la cadena.
            </p>
          </div>

          {/* Details / Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Detalles / Notas</label>
            <textarea name="detalle" rows={3} placeholder="Instrucciones adicionales o condiciones del café..." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#c2a077] text-sm" />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4 border-t border-white/10 pt-6">
            <button type="button" onClick={onClose} className="px-6 py-3 border border-white/10 hover:bg-white/5 text-gray-300 rounded-xl font-bold transition-all">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-8 py-3 bg-[#c2a077] hover:bg-[#b08f65] text-[#1a120b] font-extrabold rounded-xl transition-all shadow-lg shadow-[#c2a077]/10 disabled:opacity-50"
            >
              {isPending ? 'Creando...' : 'Crear Orden →'}
            </button>
          </div>

        </form>
      </div>

      {showCreateLoteModal && (
        <CrearLoteModal
          onClose={() => setShowCreateLoteModal(false)}
          defaultClienteName={selectedClient}
          onSave={(newLote) => {
            setLocalLotes((prev) => [...prev, newLote]);
            setLoteSearchQuery(newLote.codigo_lote);
            setCodigoCafe(newLote.codigo_lote);
            setVariedad(newLote.variedad || '');
            setProceso(newLote.proceso || '');
            setProductor(newLote.productor || '');
            setIsLoteLocked(true);
            setShowCreateLoteModal(false);
          }}
        />
      )}
    </div>
  )
}
