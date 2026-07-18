'use client'

import { useState, useTransition } from 'react'
import { completarFaseTrillado, actualizarDetallesAnalisis } from '@/app/actions'

export default function FaseTrilladoModal({
  servicioId,
  loteId,
  pesoPergaminoIn,
  equipos,
  onClose,
  onSuccess
}: {
  servicioId: number;
  loteId: number;
  pesoPergaminoIn: number;
  equipos: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const [pc, setPc] = useState<string>(pesoPergaminoIn ? String(pesoPergaminoIn) : '');
  const [hc, setHc] = useState<string>(''); // Peso Oro Out
  const [trilladoraId, setTrilladoraId] = useState<string>('');

  // Tipo de Registro
  const [tipoRegistro, setTipoRegistro] = useState<'conglomerado' | 'mallas'>('conglomerado');
  const [mallas, setMallas] = useState({
    m18: '', m17: '', m16: '', m15: '', m14: '', caracol: '', broca: '', defectos: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hc || Number(hc) <= 0) {
      alert("Debes ingresar el Peso Oro de salida");
      return;
    }

    startTransition(async () => {
      if (tipoRegistro === 'mallas' && loteId) {
        await actualizarDetallesAnalisis(loteId, 'mallas_trillado', mallas);
      }
      
      const res = await completarFaseTrillado(servicioId, Number(pc), Number(hc), trilladoraId ? Number(trilladoraId) : undefined);
      if (res.success) {
        onSuccess();
      } else {
        alert(res.error || "Error al completar trillado");
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#1a120b] border border-[#c2a077]/20 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-[#c2a077] flex items-center gap-2">
              🌾 Cierre de Fase: Trillado
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">✕</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-black/20 p-4 rounded-2xl border border-white/5">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Peso Pergamino (In)</label>
                <input type="number" step="0.01" value={pc} onChange={e => setPc(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077]" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Peso Oro Total (Out)</label>
                <input type="number" step="0.01" value={hc} onChange={e => setHc(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-emerald-400 font-bold focus:outline-none focus:border-emerald-400" />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs text-gray-400 mb-1">Equipo (Trilladora)</label>
                <select value={trilladoraId} onChange={e => setTrilladoraId(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077]">
                  <option value="">-- Opcional --</option>
                  {equipos.filter(e => e.tipo === 'trilladora').map(e => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-semibold text-[#c2a077]">Análisis Físico y Rendimiento</label>
              
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input type="radio" name="tipoRegistro" checked={tipoRegistro === 'conglomerado'} onChange={() => setTipoRegistro('conglomerado')} className="text-[#c2a077] focus:ring-[#c2a077]" />
                  <span>Resultado Conglomerado (Exportable vs Descarte)</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input type="radio" name="tipoRegistro" checked={tipoRegistro === 'mallas'} onChange={() => setTipoRegistro('mallas')} className="text-[#c2a077] focus:ring-[#c2a077]" />
                  <span>Análisis por Mallas (#14 - #18)</span>
                </label>
              </div>

              {tipoRegistro === 'mallas' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
                  {['m18', 'm17', 'm16', 'm15', 'm14', 'caracol', 'broca', 'defectos'].map((k) => (
                    <div key={k}>
                      <label className="block text-[10px] text-gray-400 mb-1 uppercase">{k}</label>
                      <input 
                        type="number" step="0.01" placeholder="0.00 kg"
                        value={mallas[k as keyof typeof mallas]}
                        onChange={(e) => setMallas({...mallas, [k]: e.target.value})}
                        className="w-full bg-black/30 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-white" 
                      />
                    </div>
                  ))}
                  <div className="col-span-2 md:col-span-4 mt-2">
                    <p className="text-xs text-gray-500 italic">Nota: La suma de mallas debería coincidir con el Peso Oro Total.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button type="button" onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={isPending} className="px-5 py-2 rounded-xl text-sm font-bold bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/40 hover:text-white transition-all disabled:opacity-50">
                {isPending ? 'Guardando...' : 'Completar Trillado →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
