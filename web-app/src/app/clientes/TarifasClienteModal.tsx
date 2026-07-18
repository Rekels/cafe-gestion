'use client'

import { useState, useTransition } from 'react'
import { updateClienteTarifas } from './actions'

export default function TarifasClienteModal({
  onClose,
  cliente
}: {
  onClose: () => void;
  cliente: any;
}) {
  const [isPending, startTransition] = useTransition();

  const [trillado, setTrillado] = useState(cliente.default_trillado_precio_kg !== null ? String(cliente.default_trillado_precio_kg) : '');
  const [seleccion, setSeleccion] = useState(cliente.default_seleccion_precio_kg !== null ? String(cliente.default_seleccion_precio_kg) : '');
  const [tueste, setTueste] = useState(cliente.default_tueste_precio_kg !== null ? String(cliente.default_tueste_precio_kg) : '');
  const [molienda, setMolienda] = useState(cliente.default_molienda_precio_kg !== null ? String(cliente.default_molienda_precio_kg) : '');
  const [envasado, setEnvasado] = useState(cliente.default_envasado_precio_unidad !== null ? String(cliente.default_envasado_precio_unidad) : '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const tarifas = {
      default_trillado_precio_kg: trillado === '' ? null : Number(trillado),
      default_seleccion_precio_kg: seleccion === '' ? null : Number(seleccion),
      default_tueste_precio_kg: tueste === '' ? null : Number(tueste),
      default_molienda_precio_kg: molienda === '' ? null : Number(molienda),
      default_envasado_precio_unidad: envasado === '' ? null : Number(envasado)
    };

    startTransition(async () => {
      const res = await updateClienteTarifas(cliente.id, tarifas);
      if (res.success) {
        onClose();
      } else {
        alert('Error: ' + res.error);
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="relative bg-[#1a120b] border border-white/10 rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="text-xl font-bold text-[#c2a077] flex items-center gap-2">
              <span>💰</span> Tarifas Personalizadas
            </h2>
            <p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-wider">{cliente.nombre}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-xl transition-colors">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl p-3 text-xs leading-relaxed">
            ⚠️ <strong>Nota:</strong> Estos valores sobreescriben las tarifas globales del sistema solo para este cliente. Déjalos en blanco para usar la tarifa estándar.
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Trillado (por KG)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500 text-xs">S/</span>
                <input
                  type="number"
                  step="0.01"
                  value={trillado}
                  onChange={e => setTrillado(e.target.value)}
                  placeholder="Global"
                  className="w-full bg-black/30 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Selección Verde (por KG)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500 text-xs">S/</span>
                <input
                  type="number"
                  step="0.01"
                  value={seleccion}
                  onChange={e => setSeleccion(e.target.value)}
                  placeholder="Global"
                  className="w-full bg-black/30 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Tueste (por KG verde)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500 text-xs">S/</span>
                <input
                  type="number"
                  step="0.01"
                  value={tueste}
                  onChange={e => setTueste(e.target.value)}
                  placeholder="Global"
                  className="w-full bg-black/30 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Molienda (por KG)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500 text-xs">S/</span>
                <input
                  type="number"
                  step="0.01"
                  value={molienda}
                  onChange={e => setMolienda(e.target.value)}
                  placeholder="Global"
                  className="w-full bg-black/30 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Envasado (por Bolsa/Empaque)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500 text-xs">S/</span>
                <input
                  type="number"
                  step="0.01"
                  value={envasado}
                  onChange={e => setEnvasado(e.target.value)}
                  placeholder="Global"
                  className="w-full bg-black/30 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-white/10 hover:bg-white/5 text-gray-300 rounded-xl text-xs font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2 bg-[#c2a077] hover:bg-[#b08f65] text-[#1a120b] font-bold rounded-xl text-xs transition-all disabled:opacity-50"
            >
              {isPending ? 'Guardando...' : 'Guardar Tarifas ✓'}
            </button>
          </div>

        </form>

      </div>
    </div>
  )
}
