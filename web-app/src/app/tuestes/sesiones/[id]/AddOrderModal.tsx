'use client'

import { useState, useTransition } from 'react'
import { addOrdenTueste } from '@/app/actions'

interface AddOrderModalProps {
  sesionId: number
  lotes: any[]
  referencias: any[]
  clientes: any[]
  onClose: () => void
  onCreated: (ordenId?: number) => void
  equipoCapacidad?: number
}

export default function AddOrderModal({ sesionId, lotes, referencias, clientes, onClose, onCreated, equipoCapacidad }: AddOrderModalProps) {
  const [isPending, startTransition] = useTransition();
  
  const [loteSearchQuery, setLoteSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedLoteCode, setSelectedLoteCode] = useState('');
  const [selectedLote, setSelectedLote] = useState<any>(null);
  
  const [isNewLote, setIsNewLote] = useState(false);
  
  const [targetWeight, setTargetWeight] = useState<number | ''>('');
  const [partitions, setPartitions] = useState<number | ''>(1);
  const [isPartitionsModified, setIsPartitionsModified] = useState(false);
  const [refSearch, setRefSearch] = useState('');

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? '' : Number(e.target.value);
    setTargetWeight(val);
    if (val !== '' && equipoCapacidad && equipoCapacidad > 0 && !isPartitionsModified) {
      const suggested = Math.ceil(Number(val) / equipoCapacidad);
      setPartitions(suggested);
    }
  };

  const handlePartitionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPartitions(e.target.value === '' ? '' : Number(e.target.value));
    setIsPartitionsModified(true);
  };

  const handleLoteSelect = (l: any) => {
    setSelectedLoteCode(l.codigo_lote);
    setSelectedLote(l);
    setLoteSearchQuery(`${l.codigo_lote} (${l.variedad} - ${l.productor})`);
    setIsDropdownOpen(false);
  };

  const filteredLotes = lotes.filter(l => {
    const q = loteSearchQuery.toLowerCase();
    if (selectedLote && loteSearchQuery === `${selectedLote.codigo_lote} (${selectedLote.variedad} - ${selectedLote.productor})`) {
      return true;
    }
    return (
      l.codigo_lote?.toLowerCase().includes(q) ||
      l.variedad?.toLowerCase().includes(q) ||
      l.productor?.toLowerCase().includes(q) ||
      l.proceso?.toLowerCase().includes(q)
    );
  });

  const filteredReferences = referencias.filter(r => {
    const term = refSearch.toLowerCase();
    return (
      r.nombre_referencia?.toLowerCase().includes(term) ||
      r.codigo_lote?.toLowerCase().includes(term) ||
      r.variedad?.toLowerCase().includes(term)
    );
  });

  const weightPerBatch = targetWeight && partitions ? (Number(targetWeight) / Number(partitions)) : 0;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const res = await addOrdenTueste(sesionId, formData);
      if (res.success) {
        onCreated(res.orden_id);
      } else {
        alert('Error al crear la orden: ' + (res.error || ''));
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-[#1a120b] border border-white/10 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-[#c2a077] flex items-center gap-2">
              <span>🔥</span> Nueva Orden de Tueste
            </h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-xl transition-colors">✕</button>
          </div>

          {/* Lote Selector */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-400">Lote de Café Verde *</label>
              <button
                type="button"
                onClick={() => { setIsNewLote(!isNewLote); setSelectedLoteCode(''); setSelectedLote(null); setLoteSearchQuery(''); }}
                className="text-xs text-[#c2a077] hover:text-white transition-colors"
              >
                {isNewLote ? '← Cancelar Nuevo Lote' : '+ Crear Nuevo Lote'}
              </button>
            </div>
            
            {isNewLote ? (
              <div className="space-y-4 bg-black/20 p-4 rounded-xl border border-[#c2a077]/30">
                <input type="hidden" name="is_new_lote" value="true" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Código Lote *</label>
                    <input type="text" name="new_codigo" required placeholder="Ej: PTY-23-01" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#c2a077]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Proceso</label>
                    <input type="text" name="new_proceso" placeholder="Ej: Lavado" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#c2a077]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Variedad</label>
                    <input type="text" name="new_variedad" placeholder="Ej: Caturra" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#c2a077]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Productor / Finca</label>
                    <input type="text" name="new_productor" placeholder="Ej: Juan Perez" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#c2a077]" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={loteSearchQuery}
                  onChange={(e) => { setLoteSearchQuery(e.target.value); if (e.target.value === '') { setSelectedLoteCode(''); setSelectedLote(null); } setIsDropdownOpen(true); }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="Buscar por código, variedad, productor..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#c2a077] transition-all"
                />
                <input type="hidden" name="codigo_lote" value={selectedLoteCode} required />

              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-[#1a120b] border border-white/10 rounded-xl shadow-2xl z-20 divide-y divide-white/5">
                    {filteredLotes.map(l => (
                      <div
                        key={l.id}
                        onClick={() => handleLoteSelect(l)}
                        className="p-3 hover:bg-[#c2a077]/10 cursor-pointer flex justify-between items-center text-xs text-gray-300 transition-colors"
                      >
                        <div>
                          <span className="font-mono font-bold text-white text-sm block">{l.codigo_lote}</span>
                          <span className="block mt-0.5 text-[10px] text-gray-400">{l.variedad} • {l.productor} • {l.proceso}</span>
                        </div>
                        <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-400 font-mono">
                          Stock: {(Number(l.stock_real) || 0).toFixed(1)} kg
                        </span>
                      </div>
                    ))}
                    {filteredLotes.length === 0 && (
                      <div className="p-3 text-gray-500 text-center text-xs">No encontrado.</div>
                    )}
                  </div>
                </>
              )}
            </div>
            )}
          </div>

          {/* Selected Lote Info */}
          {selectedLote && (
            <div className="bg-[#c2a077]/10 border border-[#c2a077]/30 rounded-2xl p-3 flex justify-between items-center">
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Stock Verde Disponible</div>
                <div className="text-lg font-extrabold text-white mt-0.5">{(Number(selectedLote.stock_real) || 0).toFixed(2)} kg</div>
              </div>
              <span className="px-2.5 py-1 bg-[#c2a077]/20 text-[#c2a077] text-xs font-semibold rounded-full border border-[#c2a077]/30">
                {(selectedLote.proceso || '').toUpperCase()}
              </span>
            </div>
          )}

          {/* Weight & Partitions */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Masa Verde (KG) *</label>
              <input type="number" step="0.01" name="target_weight" required
                value={targetWeight}
                onChange={handleWeightChange}
                placeholder="50.00"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#c2a077]"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-400">Batches *</label>
                {equipoCapacidad && equipoCapacidad > 0 && targetWeight !== '' && (
                  <button
                    type="button"
                    onClick={() => {
                      const suggested = Math.ceil(Number(targetWeight) / equipoCapacidad);
                      setPartitions(suggested);
                      setIsPartitionsModified(false);
                    }}
                    className="text-[10px] text-[#c2a077] hover:underline"
                    title="Restablecer sugerencia según capacidad"
                  >
                    Sugerido: {Math.ceil(Number(targetWeight) / equipoCapacidad)}
                  </button>
                )}
              </div>
              <input type="number" name="partitions" required
                value={partitions}
                onChange={handlePartitionsChange}
                placeholder="1"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#c2a077]"
              />
            </div>
            <div className="flex items-end">
              <div className="bg-black/20 border border-white/5 rounded-xl p-2.5 w-full text-center">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest block">Peso/Batch</span>
                <span className="font-bold text-[#c2a077] font-mono text-sm">
                  {weightPerBatch > 0 ? `${weightPerBatch.toFixed(2)} kg` : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Physical params */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Humedad (%)</label>
              <input type="number" step="0.01" name="moisture" placeholder="11.40"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#c2a077]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Densidad (g/l)</label>
              <input type="number" step="0.1" name="density" placeholder="670"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#c2a077]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">AW</label>
              <input type="number" step="0.001" name="aw" placeholder="0.530"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#c2a077]"
              />
            </div>
          </div>

          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Cliente / Destino</label>
            <input type="text" name="cliente" list="clientes-list" defaultValue="PANTIWAYTA" placeholder="PANTIWAYTA"
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#c2a077]"
            />
            <datalist id="clientes-list">
              {clientes.map(c => (
                <option key={`${c.id}-nombre`} value={c.nombre} />
              ))}
              {clientes.filter(c => c.empresa).map(c => (
                <option key={`${c.id}-empresa`} value={c.empresa} />
              ))}
            </datalist>
          </div>

          {/* Reference Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Curva de Referencia</label>
            <input type="text" placeholder="Buscar referencia..." value={refSearch}
              onChange={e => setRefSearch(e.target.value)}
              className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077] mb-2"
            />
            <select name="referencia_tueste_id"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#c2a077] text-sm"
            >
              <option value="">-- Sin Referencia --</option>
              {filteredReferences.map(ref => {
                const isRecommended = selectedLote && ref.variedad?.toLowerCase() === selectedLote.variedad?.toLowerCase();
                return (
                  <option key={ref.id} value={ref.id}>
                    {isRecommended ? '⭐ ' : ''}{ref.nombre_referencia} ({ref.variedad} - {ref.codigo_lote})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 border border-white/10 hover:bg-white/5 text-gray-300 rounded-xl font-bold transition-all"
            >
              Cancelar
            </button>
            <button type="submit" disabled={isPending || (!selectedLoteCode && !isNewLote)}
              className="px-6 py-2.5 bg-[#c2a077] hover:bg-[#b08f65] text-[#1a120b] font-extrabold rounded-xl transition-all shadow-lg shadow-[#c2a077]/10 disabled:opacity-50"
            >
              {isPending ? 'Creando...' : 'Crear Orden'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
