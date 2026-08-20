'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createSesionTueste } from '../../actions'

import DatePicker from 'react-datepicker'
import { format } from 'date-fns'

export default function CreateSessionForm({ equipos }: { equipos: any[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedEquipo, setSelectedEquipo] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Add the correctly formatted date (YYYY-MM-DD) for SQLite
    formData.set('fecha', format(selectedDate, 'yyyy-MM-dd'));
    
    startTransition(async () => {
      const res = await createSesionTueste(formData);
      if (res.success && res.sesion_id) {
        router.push(`/tuestes/sesiones/${res.sesion_id}`);
      } else {
        alert('Error al crear la sesión de tueste.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      <div className="bg-[#1a120b]/60 backdrop-blur-xl rounded-3xl border border-white/10 p-6 md:p-8 shadow-2xl space-y-6">
        
        <h2 className="text-xl font-bold text-[#c2a077] flex items-center gap-2 border-b border-white/5 pb-3">
          <span>🔥</span> Configuración de Sesión
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Date picker */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Fecha de Tueste *
            </label>
            <DatePicker
              selected={selectedDate}
              onChange={(date: Date | null) => date && setSelectedDate(date)}
              dateFormat="dd/MM/yy"
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#c2a077] transition-all text-base cursor-pointer"
            />
          </div>

          {/* Equipment selector */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Tostadora *
            </label>
            <select
              name="equipo_id"
              required
              onChange={(e) => {
                const eq = equipos.find(eq => eq.id === Number(e.target.value));
                setSelectedEquipo(eq || null);
              }}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#c2a077] transition-all"
            >
              <option value="">-- Seleccionar tostadora --</option>
              {equipos.map(eq => (
                <option key={eq.id} value={eq.id}>
                  {eq.nombre} ({eq.capacidad_kg} kg)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected equipment info */}
        {selectedEquipo && (
          <div className="bg-[#c2a077]/10 border border-[#c2a077]/30 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="font-bold text-white text-lg">{selectedEquipo.nombre}</div>
              <div className="text-xs text-gray-400 mt-0.5">Tipo: {selectedEquipo.tipo}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Capacidad Máx.</div>
              <div className="text-2xl font-extrabold text-[#c2a077] mt-0.5">{selectedEquipo.capacidad_kg} kg</div>
            </div>
          </div>
        )}

        <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-xs text-gray-400 leading-relaxed">
          <strong className="text-[#c2a077]">💡 Siguiente paso:</strong> Al crear la sesión, serás redirigido a la vista de control donde podrás agregar <strong className="text-white">Órdenes de Tueste</strong> — cada una con su café, peso objetivo, batches y perfil de referencia.
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => router.push('/tuestes')}
          className="px-6 py-3 border border-white/10 hover:bg-white/5 text-gray-300 rounded-xl font-bold transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-8 py-3 bg-[#c2a077] hover:bg-[#b08f65] text-[#1a120b] font-extrabold rounded-xl transition-all shadow-lg shadow-[#c2a077]/10 disabled:opacity-50"
        >
          {isPending ? 'Creando...' : 'Crear Sesión →'}
        </button>
      </div>
    </form>
  )
}
