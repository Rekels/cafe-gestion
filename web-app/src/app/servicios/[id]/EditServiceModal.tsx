'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateServicio, getClienteDefaults } from '@/app/actions'
import CrearLoteModal from '../CrearLoteModal'

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

export default function EditServiceModal({ 
  onClose, 
  servicio,
  lotes,
  activeSessions,
  linkedRoastOrder,
  clientes,
  globalAjustes
}: { 
  onClose: () => void; 
  servicio: any;
  lotes: LoteInfo[];
  activeSessions: any[];
  linkedRoastOrder: any;
  clientes: ClientInfo[];
  globalAjustes: Record<string, string>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Client selection state
  const initialClientName = servicio.cliente || '';
  const [clientSearchQuery, setClientSearchQuery] = useState(initialClientName);
  const [selectedClient, setSelectedClient] = useState<string>(initialClientName);
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [updatePrices, setUpdatePrices] = useState(false);
  const [showUpdatePricesCheckbox, setShowUpdatePricesCheckbox] = useState(false);

  const filteredClients = clientes?.filter(c => 
    c.nombre.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    (c.empresa && c.empresa.toLowerCase().includes(clientSearchQuery.toLowerCase()))
  ) || [];

  const handleClientSelect = (clientName: string) => {
    setSelectedClient(clientName);
    setClientSearchQuery(clientName);
    setIsClientDropdownOpen(false);
    if (clientName.toUpperCase() !== (servicio.cliente || '').toUpperCase()) {
      setShowUpdatePricesCheckbox(true);
      setUpdatePrices(false);
    } else {
      setShowUpdatePricesCheckbox(false);
      setUpdatePrices(false);
    }
  };

  const handleCreateNewClient = () => {
    const newName = clientSearchQuery.toUpperCase().trim();
    if (!newName) return;
    handleClientSelect(newName);
  };


  // Coffee details & selection
  const initialLote = lotes.find(l => l.codigo_lote === servicio.codigo_cafe);

  const [localLotes, setLocalLotes] = useState<LoteInfo[]>(lotes || []);
  const [loteSearchQuery, setLoteSearchQuery] = useState(servicio.codigo_cafe || '');
  const [isLoteDropdownOpen, setIsLoteDropdownOpen] = useState(false);
  const [showCreateLoteModal, setShowCreateLoteModal] = useState(false);
  const [isLoteLocked, setIsLoteLocked] = useState(!!initialLote);

  const [variedad, setVariedad] = useState(servicio.variedad || '');
  const [proceso, setProceso] = useState(servicio.proceso || '');
  const [productor, setProductor] = useState(servicio.productor || '');
  const [codigoCafe, setCodigoCafe] = useState(servicio.codigo_cafe || '');

  // Ingreso / Salida fisicos explicitos
  const [ingresoFisico, setIngresoFisico] = useState(false);
  const [ingresoCantidad, setIngresoCantidad] = useState<string>('');
  const [ingresoTipo, setIngresoTipo] = useState<string>('PERGAMINO');

  const [salidaFisico, setSalidaFisico] = useState(false);
  const [salidaCantidad, setSalidaCantidad] = useState<string>('');
  const [salidaTipo, setSalidaTipo] = useState<string>('TOSTADO');

  // Tueste Programming state
  const [programacionTuesteOpcion, setProgramacionTuesteOpcion] = useState('crear_nueva');
  const [programacionTuesteSesionId, setProgramacionTuesteSesionId] = useState('');

  // Physical specs
  const [mPercent, setMPercent] = useState<string>(servicio.m_percent ? String(servicio.m_percent) : '');
  const [aw, setAw] = useState<string>(servicio.aw ? String(servicio.aw) : '');
  const [d, setD] = useState<string>(servicio.d ? String(servicio.d) : '');

  // Active services
  const [hasTrillado, setHasTrillado] = useState(servicio.pc !== null || servicio.hc !== null);
  const [hasSeleccion, setHasSeleccion] = useState(servicio.seleccion_precio_kg !== null);
  const [hasTueste, setHasTueste] = useState(servicio.tueste_precio_kg !== null || servicio.gc !== null);
  const [hasMolienda, setHasMolienda] = useState(servicio.molienda_precio_kg !== null || servicio.total !== null);
  const [hasEnvasado, setHasEnvasado] = useState(servicio.envasado_precio_unidad !== null);

  // Service pricing & weights
  const [pc, setPc] = useState<string>(servicio.pc ? String(servicio.pc) : '');
  const [trilladoPrecio, setTrilladoPrecio] = useState<string>(servicio.trillado_precio_kg ? String(servicio.trillado_precio_kg) : '');
  const [hc, setHc] = useState<string>(servicio.hc ? String(servicio.hc) : '');
  
  const [seleccionPrecio, setSeleccionPrecio] = useState<string>(servicio.seleccion_precio_kg ? String(servicio.seleccion_precio_kg) : '');
  
  const [gc, setGc] = useState<string>(servicio.gc ? String(servicio.gc) : '');
  const [tuestePrecio, setTuestePrecio] = useState<string>(servicio.tueste_precio_kg ? String(servicio.tueste_precio_kg) : '');
  
  const [moliendaPrecio, setMoliendaPrecio] = useState<string>(servicio.molienda_precio_kg ? String(servicio.molienda_precio_kg) : '');
  const [moliendaTotalWeight, setMoliendaTotalWeight] = useState<string>(servicio.total ? String(servicio.total) : '');
  
  const [envasadoPrecio, setEnvasadoPrecio] = useState<string>(servicio.envasado_precio_unidad ? String(servicio.envasado_precio_unidad) : '');
  const [envasadoCantidad, setEnvasadoCantidad] = useState<string>(servicio.envasado_cantidad ? String(servicio.envasado_cantidad) : '');
  const [envasadoTipo, setEnvasadoTipo] = useState<string>(servicio.envasado_tipo || 'grano');

  useEffect(() => {
    if (updatePrices && selectedClient !== servicio.cliente) {
      getClienteDefaults(selectedClient).then(defaults => {
        if (hasTrillado) setTrilladoPrecio(String(defaults?.default_trillado_precio_kg ?? globalAjustes.global_trillado_precio_kg ?? '1.00'));
        if (hasTueste) setTuestePrecio(String(defaults?.default_tueste_precio_kg ?? globalAjustes.global_tueste_precio_kg ?? '6.00'));
        if (hasMolienda) setMoliendaPrecio(String(defaults?.default_molienda_precio_kg ?? globalAjustes.global_molienda_precio_kg ?? '1.00'));
        if (hasEnvasado) setEnvasadoPrecio(String(defaults?.default_envasado_precio_unidad ?? globalAjustes.global_envasado_precio_unidad ?? '0.50'));
      });
    } else if (!updatePrices && selectedClient !== servicio.cliente) {
      if (hasTrillado) setTrilladoPrecio(servicio.trillado_precio_kg ? String(servicio.trillado_precio_kg) : '');
      if (hasTueste) setTuestePrecio(servicio.tueste_precio_kg ? String(servicio.tueste_precio_kg) : '');
      if (hasMolienda) setMoliendaPrecio(servicio.molienda_precio_kg ? String(servicio.molienda_precio_kg) : '');
      if (hasEnvasado) setEnvasadoPrecio(servicio.envasado_precio_unidad ? String(servicio.envasado_precio_unidad) : '');
    }
  }, [updatePrices, selectedClient, servicio, globalAjustes, hasTrillado, hasTueste, hasMolienda, hasEnvasado]);

  const [estado, setEstado] = useState(servicio.estado || 'Pendiente');
  const [detalle, setDetalle] = useState(servicio.detalle || '');

  const filteredActiveSessions = (activeSessions || []).filter(s => {
    if (!servicio.cliente) return true;
    const clientUpper = servicio.cliente.toUpperCase().trim();
    if (!s.clientes) return true; // Empty sessions
    const sessionClients = s.clientes.split(',').map((c: any) => c.trim().toUpperCase());
    return sessionClients.includes(clientUpper);
  });

  useEffect(() => {
    if (programacionTuesteOpcion === 'asignar_existente') {
      const exists = filteredActiveSessions.some(s => String(s.id) === programacionTuesteSesionId);
      if (!exists) {
        setProgramacionTuesteSesionId('');
      }
    }
  }, [servicio.cliente, programacionTuesteOpcion, filteredActiveSessions, programacionTuesteSesionId]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const finalCodigoCafe = (codigoCafe || loteSearchQuery).toUpperCase().trim();

    const formData = new FormData();
    if (!selectedClient) {
      alert('Debes seleccionar o crear un cliente.');
      return;
    }
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

    formData.append('ingreso_fisico', String(ingresoFisico));
    if (ingresoFisico) {
      formData.append('ingreso_cantidad', ingresoCantidad);
      formData.append('ingreso_tipo', ingresoTipo);
    }

    formData.append('salida_fisico', String(salidaFisico));
    if (salidaFisico) {
      formData.append('salida_cantidad', salidaCantidad);
      formData.append('salida_tipo', salidaTipo);
    }

    if (hasTrillado) {
      formData.append('pc', pc);
      formData.append('trillado_precio_kg', trilladoPrecio);
      formData.append('hc', hc);
    }
    if (hasSeleccion) {
      formData.append('seleccion_precio_kg', seleccionPrecio);
    }
    if (hasTueste) {
      formData.append('gc', gc);
      formData.append('tueste_precio_kg', tuestePrecio);
      formData.append('rc', String(servicio.rc || 0)); // keep existing roasted weight if editing
      if (!linkedRoastOrder) {
        formData.append('programacion_tueste_opcion', programacionTuesteOpcion);
        if (programacionTuesteOpcion === 'asignar_existente') {
          formData.append('programacion_tueste_sesion_id', programacionTuesteSesionId);
        }
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

    formData.append('estado', estado);
    formData.append('detalle', detalle);

    startTransition(async () => {
      const res = await updateServicio(servicio.id, formData);
      if (res.success) {
        onClose();
        router.refresh();
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
              <span>✏️</span> Editar Orden de Servicio #{servicio.n_orden}
            </h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-xl transition-colors">✕</button>
          </div>

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
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#c2a077] transition-all uppercase"
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

            {showUpdatePricesCheckbox && (
              <label className="flex items-center gap-2 mt-3 cursor-pointer text-sm bg-[#c2a077]/10 border border-[#c2a077]/30 p-3 rounded-xl">
                <input 
                  type="checkbox" 
                  checked={updatePrices} 
                  onChange={e => setUpdatePrices(e.target.checked)} 
                  className="rounded text-[#c2a077] focus:ring-0" 
                />
                <span className="text-[#c2a077] font-semibold">Actualizar los precios de los servicios a las tarifas predeterminadas de este cliente</span>
              </label>
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
                            <div className="text-[10px] text-gray-400 mt-0.5 uppercase">
                              {l.variedad || 'Sin Variedad'} • {l.proceso || 'Sin Proceso'} • {l.productor || 'Sin Productor'}
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

          {/* Ingreso / Salida Físicos */}
          <div className="space-y-4 bg-black/20 p-4 rounded-2xl border border-white/5">
            <h3 className="text-xs font-semibold text-[#c2a077] uppercase tracking-wider">Movimientos Físicos Adicionales (Opcional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ingreso */}
              <div className="bg-[#c2a077]/5 border border-[#c2a077]/20 p-4 rounded-xl space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-white">
                  <input type="checkbox" checked={ingresoFisico} onChange={e => setIngresoFisico(e.target.checked)} className="rounded text-[#c2a077] focus:ring-0" />
                  <span>📥 Registrar Ingreso Físico</span>
                </label>
                {ingresoFisico && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Cantidad (KG)</label>
                      <input type="number" step="0.01" value={ingresoCantidad} onChange={e => setIngresoCantidad(e.target.value)} required className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077]" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Tipo de Café</label>
                      <select value={ingresoTipo} onChange={e => setIngresoTipo(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077]">
                        <option value="PERGAMINO">Pergamino</option>
                        <option value="ORO_VERDE_BRUTO">Oro Verde Bruto</option>
                        <option value="ORO_VERDE_SELECCIONADO">Oro Verde Sel.</option>
                        <option value="TOSTADO">Tostado</option>
                        <option value="DESCARTE">Descarte</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Salida */}
              <div className="bg-[#c2a077]/5 border border-[#c2a077]/20 p-4 rounded-xl space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-white">
                  <input type="checkbox" checked={salidaFisico} onChange={e => setSalidaFisico(e.target.checked)} className="rounded text-[#c2a077] focus:ring-0" />
                  <span>📤 Registrar Salida/Despacho</span>
                </label>
                {salidaFisico && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Cantidad (KG)</label>
                      <input type="number" step="0.01" value={salidaCantidad} onChange={e => setSalidaCantidad(e.target.value)} required className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077]" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Tipo de Café</label>
                      <select value={salidaTipo} onChange={e => setSalidaTipo(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077]">
                        <option value="TOSTADO">Tostado</option>
                        <option value="PERGAMINO">Pergamino</option>
                        <option value="ORO_VERDE_BRUTO">Oro Verde Bruto</option>
                        <option value="ORO_VERDE_SELECCIONADO">Oro Verde Sel.</option>
                        <option value="DESCARTE">Descarte</option>
                      </select>
                    </div>
                  </div>
                )}
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
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Peso Pergamino In (KG)</label>
                      <input type="number" step="0.01" value={pc} onChange={e => setPc(e.target.value)} required className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077]" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Precio x KG Trillado</label>
                      <input type="number" step="0.01" value={trilladoPrecio} onChange={e => setTrilladoPrecio(e.target.value)} required className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077]" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Peso Oro Out (KG)</label>
                      <input type="number" step="0.01" value={hc} onChange={e => setHc(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077]" />
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
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Precio x KG Selección</label>
                      <input type="number" step="0.01" value={seleccionPrecio} onChange={e => setSeleccionPrecio(e.target.value)} required className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077]" />
                    </div>
                    <div className="flex items-center text-xs text-gray-400 leading-relaxed pt-5">
                      💡 Se cobrará por el peso ingresado para tostar o el peso obtenido del trillado (Oro verde).
                    </div>
                  </div>
                </div>
              )}

              {/* Tueste Block */}
              {hasTueste && (
                <div className="bg-[#c2a077]/5 border border-[#c2a077]/20 rounded-2xl p-4 space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>🔥</span> Servicio de Tueste
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Peso Verde Estimado In (KG)</label>
                      <input type="number" step="0.01" value={gc} onChange={e => setGc(e.target.value)} placeholder={hc || 'Ingresar peso para tostar'} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077]" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Precio x KG Tueste</label>
                      <input type="number" step="0.01" value={tuestePrecio} onChange={e => setTuestePrecio(e.target.value)} required className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#c2a077]" />
                    </div>

                    {linkedRoastOrder ? (
                      <div className="col-span-2 border-t border-white/5 pt-4 mt-2">
                        <div className="p-3 bg-[#c2a077]/10 border border-[#c2a077]/30 rounded-xl text-center text-xs text-gray-300 font-semibold uppercase">
                          🔥 Esta orden ya está programada en la Sesión de Tueste #{linkedRoastOrder.sesion_id}
                        </div>
                      </div>
                    ) : (
                      /* Tueste Programming */
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
                    )}
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
                      <label className="block text-xs text-gray-400 mb-1">Peso Molido Real/Estimado (KG)</label>
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

          {/* Status & details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Estado de Orden</label>
              <select value={estado} onChange={e => setEstado(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#c2a077]">
                <option value="Pendiente">Pendiente</option>
                <option value="En Proceso">En Proceso</option>
                <option value="Completado">Completado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Detalles / Notas</label>
              <textarea value={detalle} onChange={e => setDetalle(e.target.value)} rows={2} placeholder="Instrucciones adicionales..." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#c2a077] text-sm" />
            </div>
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
              {isPending ? 'Guardando...' : 'Guardar Cambios ✓'}
            </button>
          </div>

        </form>
      </div>

      {showCreateLoteModal && (
        <CrearLoteModal
          onClose={() => setShowCreateLoteModal(false)}
          defaultClienteName={servicio.cliente}
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
