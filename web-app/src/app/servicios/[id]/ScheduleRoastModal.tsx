'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { programarTuesteDesdeServicio } from '@/app/actions'

interface SessionInfo {
  id: number;
  fecha: string;
  equipo_nombre: string;
}

export default function ScheduleRoastModal({
  onClose,
  servicioId,
  activeSessions,
}: {
  onClose: () => void;
  servicioId: number;
  activeSessions: SessionInfo[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId) {
      alert('Debes seleccionar una sesión activa.');
      return;
    }

    startTransition(async () => {
      const res = await programarTuesteDesdeServicio(servicioId, Number(selectedSessionId));
      if (res.success) {
        onClose();
        // Redirect directly to the roasting session control view!
        router.push(`/tuestes/sesiones/${selectedSessionId}`);
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
          <h2 className="text-xl font-bold text-[#c2a077] flex items-center gap-2">
            <span>🔥</span> Programar Tueste
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-xl transition-colors">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-400">
              Seleccionar Sesión de Tueste Activa
            </label>
            {activeSessions.length > 0 ? (
              <select
                value={selectedSessionId}
                onChange={e => setSelectedSessionId(e.target.value)}
                required
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#c2a077] text-sm"
              >
                <option value="">-- Elegir sesión activa --</option>
                {activeSessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.fecha} • {s.equipo_nombre || 'Sin máquina'} (ID #{s.id})
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-4 bg-white/5 border border-dashed border-white/10 rounded-xl text-center text-xs text-gray-400">
                No hay sesiones de tueste activas/abiertas correspondientes a este cliente en este momento.
              </div>
            )}
          </div>

          <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-xs text-gray-400 leading-relaxed">
            <strong className="text-[#c2a077]">💡 Nota:</strong> Si no hay sesiones abiertas o prefieres crear una nueva, puedes planificar una nueva sesión desde el panel principal de tuestes.
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-white/10 hover:bg-white/5 text-gray-300 rounded-xl text-sm font-bold transition-all">
              Cancelar
            </button>
            
            {activeSessions.length > 0 && (
              <button
                type="submit"
                disabled={isPending}
                className="px-6 py-2.5 bg-[#c2a077] hover:bg-[#b08f65] text-[#1a120b] font-bold rounded-xl text-sm transition-all shadow-lg shadow-[#c2a077]/10 disabled:opacity-50"
              >
                {isPending ? 'Programando...' : 'Asignar a Sesión ✓'}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                router.push('/tuestes/nuevo');
              }}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-bold transition-all"
            >
              Nueva Sesión →
            </button>
          </div>

        </form>

      </div>
    </div>
  )
}
