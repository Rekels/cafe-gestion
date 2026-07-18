'use client'

import { useState, useTransition } from 'react'
import { completarFaseSeleccion } from '@/app/actions'

export default function FaseSeleccionModal({
  servicioId,
  loteId,
  pesoOroIn,
  onClose,
  onSuccess
}: {
  servicioId: number;
  loteId: number;
  pesoOroIn: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const [hcIn, setHcIn] = useState<string>(pesoOroIn ? String(pesoOroIn) : '');
  const [scOut, setScOut] = useState<string>(''); // Peso Seleccionado Out

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scOut || Number(scOut) <= 0) {
      alert("Debes ingresar el Peso Seleccionado Out");
      return;
    }
    if (!hcIn || Number(hcIn) <= 0) {
      alert("El Peso Oro In es requerido");
      return;
    }

    startTransition(async () => {
      const res = await completarFaseSeleccion(servicioId, Number(hcIn), Number(scOut));
      if (res.success) {
        onSuccess();
      } else {
        alert(res.error || "Error al completar selección");
      }
    });
  }

  const merma = Number(hcIn || 0) - Number(scOut || 0);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#1a120b] border border-[#c2a077]/20 rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-[#c2a077] flex items-center gap-2">
              ✨ Cierre de Fase: Selección
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">✕</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4 bg-black/20 p-4 rounded-2xl border border-white/5">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Peso Oro Bruto (In)</label>
                <input type="number" step="0.01" value={hcIn} onChange={e => setHcIn(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077]" />
                <p className="text-[10px] text-gray-500 mt-1">Suele ser el Peso Oro Total resultante del Trillado.</p>
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">Peso Oro Seleccionado (Out)</label>
                <input type="number" step="0.01" value={scOut} onChange={e => setScOut(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-teal-400 font-bold focus:outline-none focus:border-teal-400" />
              </div>

              {Number(scOut) > 0 && (
                <div className={`p-3 rounded-lg border text-xs text-center font-mono ${merma >= 0 ? 'bg-red-900/20 border-red-500/30 text-red-400' : 'bg-yellow-900/20 border-yellow-500/30 text-yellow-400'}`}>
                  {merma >= 0 ? `Merma / Descarte: ${merma.toFixed(2)} kg` : `Diferencia Negativa: ${merma.toFixed(2)} kg (Revisar)`}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button type="button" onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={isPending || merma < 0} className="px-5 py-2 rounded-xl text-sm font-bold bg-teal-600/20 text-teal-400 border border-teal-500/30 hover:bg-teal-600/40 hover:text-white transition-all disabled:opacity-50">
                {isPending ? 'Guardando...' : 'Completar Selección →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
