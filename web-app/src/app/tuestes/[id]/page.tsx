import dbPromise from '@/lib/db'
import Link from 'next/link'
import ProcessBadge from '@/components/ProcessBadge'

export const dynamic = 'force-dynamic'

function formatMoney(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return '-';
  return `S/ ${amount.toFixed(2)}`;
}

export default async function TuesteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const db = await dbPromise;
  const resolvedParams = await params;
  const decodedId = decodeURIComponent(resolvedParams.id);
  const tueste = await db.get('SELECT * FROM Tuestes WHERE id = ? LIMIT 1', [decodedId]) as any;

  if (!tueste) {
    return (
      <div className="min-h-screen bg-[#1a120b] flex items-center justify-center p-8">
        <div className="bg-[#1a120b]/50 backdrop-blur-md p-8 rounded-2xl border border-white/10 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Registro de Tueste no encontrado</h2>
          <p className="text-[#c2a077] mb-6">No pudimos localizar el batch con ID: {decodedId}</p>
          <Link href="/tuestes" className="text-[#c2a077] hover:text-white font-medium">
            ← Volver a la lista
          </Link>
        </div>
      </div>
    );
  }

  // Phase times helper
  const secDry = tueste.m_dry ? tueste.m_dry : '-';
  const secMai = tueste.m_mai ? tueste.m_mai : '-';
  const secDev = tueste.m_dev ? tueste.m_dev : '-';

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1a120b] via-[#2a1d13] to-[#1a120b] text-gray-100 p-4 md:p-12 font-sans selection:bg-[#c2a077]/30 flex flex-col items-center">
      
      <div className="w-full max-w-4xl">
        {/* Navigation Link */}
        <div className="mb-8">
          <Link href="/tuestes" className="group flex items-center gap-2 text-[#c2a077]/70 hover:text-[#c2a077] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a Tuestes
          </Link>
        </div>

        {/* Ficha de Tueste Card */}
        <div className="bg-white text-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-white/10">
          
          {/* Card Header */}
          <div className="bg-[#1a120b] px-8 py-6 flex justify-between items-center text-white">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔥</span>
                <h1 className="text-3xl font-bold text-[#c2a077] tracking-tight">Ficha de Tueste</h1>
              </div>
              <p className="text-white/60 text-sm mt-1">Detalles de la curva de tueste y merma física</p>
            </div>
            <div className="text-right">
              <div className="text-white/60 text-xs uppercase tracking-wider font-semibold">Batch N°</div>
              <div className="text-4xl font-extrabold text-white">#{tueste.batch_n || tueste.id}</div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            {/* Grid 1: Datos de Origen */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 pb-1 border-b border-gray-100">Café y Origen</h3>
                <div className="space-y-3">
                  <div className="flex justify-between border-b border-gray-100 pb-1 text-sm">
                    <span className="text-slate-500 font-medium">Lote Origen</span>
                    <span className="font-mono font-bold text-slate-800 bg-[#c2a077]/10 px-2 py-0.5 rounded">{tueste.codigo_lote || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-1 text-sm">
                    <span className="text-slate-500 font-medium">Variedad</span>
                    <span className="font-semibold text-slate-800 uppercase">{tueste.variedad || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-1 text-sm">
                    <span className="text-slate-500 font-medium">Proceso</span>
                    <span className="font-semibold text-slate-800 uppercase">
                      {tueste.proceso ? <ProcessBadge proceso={tueste.proceso} className="border-gray-300 text-slate-700 bg-slate-100" /> : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-1 text-sm">
                    <span className="text-slate-500 font-medium">Productor</span>
                    <span className="font-semibold text-slate-800 uppercase">{tueste.productor || '-'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 pb-1 border-b border-gray-100">Datos Generales</h3>
                <div className="space-y-3">
                  <div className="flex justify-between border-b border-gray-100 pb-1 text-sm">
                    <span className="text-slate-500 font-medium">Fecha</span>
                    <span className="font-semibold text-slate-800">{tueste.fecha || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-1 text-sm">
                    <span className="text-slate-500 font-medium">Roaster (Operador)</span>
                    <span className="font-semibold text-slate-800 uppercase">{tueste.roaster || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-1 text-sm">
                    <span className="text-slate-500 font-medium">Cliente / Destino</span>
                    <span className="font-semibold text-slate-800 uppercase">{tueste.cliente || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-1 text-sm">
                    <span className="text-slate-500 font-medium">Orden de Servicio</span>
                    <span className="font-semibold text-slate-800">
                      {tueste.n_orden ? `#${tueste.n_orden}` : 'Independiente'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid 2: Parámetros del Café y Merma */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 rounded-2xl p-6 border border-slate-100">
              <div className="text-center md:border-r border-slate-200 p-2">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Masa Verde (In)</div>
                <div className="text-2xl font-extrabold text-slate-800">{tueste.gc ? `${tueste.gc.toFixed(3)} kg` : '-'}</div>
              </div>
              <div className="text-center md:border-r border-slate-200 p-2">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Masa Tostada (Out)</div>
                <div className="text-2xl font-extrabold text-amber-700">{tueste.rc ? `${tueste.rc.toFixed(3)} kg` : '-'}</div>
              </div>
              <div className="text-center p-2">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Merma Física</div>
                <div className={`text-2xl font-extrabold ${tueste.lw_percent > 15 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {tueste.lw_percent ? `${tueste.lw_percent.toFixed(2)}%` : '0.00%'}
                </div>
              </div>
            </div>

            {/* Grid 3: Propiedades del Grano Físicas */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 pb-1 border-b border-gray-100">Propiedades del Grano</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-[#c2a077]/5 rounded-xl p-4 border border-[#c2a077]/10">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Humedad</div>
                  <div className="text-lg font-bold text-slate-800 mt-1">{tueste.b_moist ? `${tueste.b_moist.toFixed(2)}%` : '-'}</div>
                </div>
                <div className="bg-[#c2a077]/5 rounded-xl p-4 border border-[#c2a077]/10">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Densidad</div>
                  <div className="text-lg font-bold text-slate-800 mt-1">{tueste.b_density || '-'}</div>
                </div>
                <div className="bg-[#c2a077]/5 rounded-xl p-4 border border-[#c2a077]/10">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Actividad de Agua (AW)</div>
                  <div className="text-lg font-bold text-slate-800 mt-1">{tueste.aw ? tueste.aw.toFixed(3) : '-'}</div>
                </div>
              </div>
            </div>

            {/* Grid 4: Curva de Tueste */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 pb-1 border-b border-gray-100">Parámetros de la Curva</h3>
              
              {/* Timeline curve parameters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="border border-slate-100 rounded-xl p-4 text-center shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-gray-400">1. Turn Point</span>
                  <div className="text-lg font-extrabold text-slate-800 mt-2">{tueste.t_tp || '-'}</div>
                  <div className="text-xs text-[#c2a077] font-semibold mt-1">{tueste.temp_tp ? `${tueste.temp_tp}°C` : '-'}</div>
                </div>
                <div className="border border-slate-100 rounded-xl p-4 text-center shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-gray-400">2. Secado (TS)</span>
                  <div className="text-lg font-extrabold text-slate-800 mt-2">{tueste.t_ts || '-'}</div>
                  <div className="text-xs text-[#c2a077] font-semibold mt-1">{tueste.temp_ts ? `${tueste.temp_ts}°C` : '-'}</div>
                </div>
                <div className="border border-slate-100 rounded-xl p-4 text-center shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-gray-400">3. First Crack (FC)</span>
                  <div className="text-lg font-extrabold text-slate-800 mt-2">{tueste.t_fc || '-'}</div>
                  <div className="text-xs text-[#c2a077] font-semibold mt-1">{tueste.temp_fc ? `${tueste.temp_fc}°C` : '-'}</div>
                </div>
                <div className="border border-slate-100 rounded-xl p-4 text-center shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-gray-400">4. Fin Tueste (End)</span>
                  <div className="text-lg font-extrabold text-slate-800 mt-2">{tueste.t_t || '-'}</div>
                  <div className="text-xs text-[#c2a077] font-semibold mt-1">{tueste.temp_end ? `${tueste.temp_end}°C` : '-'}</div>
                </div>
              </div>
            </div>

            {/* Visual Phase Ratio Bar */}
            {tueste.dry_percent !== null && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Distribución de Fases del Tueste</h4>
                <div className="h-7 w-full bg-slate-100 rounded-full overflow-hidden flex font-mono text-[10px] font-extrabold text-slate-900 border border-slate-200">
                  <div 
                    style={{ width: `${tueste.dry_percent}%` }} 
                    className="bg-yellow-400 flex items-center justify-center"
                  >
                    {tueste.dry_percent > 15 && `SECADO ${tueste.dry_percent.toFixed(0)}%`}
                  </div>
                  <div 
                    style={{ width: `${tueste.mai_percent}%` }} 
                    className="bg-amber-500 flex items-center justify-center text-white"
                  >
                    {tueste.mai_percent > 15 && `MAILLARD ${tueste.mai_percent.toFixed(0)}%`}
                  </div>
                  <div 
                    style={{ width: `${tueste.dev_percent}%` }} 
                    className="bg-orange-600 flex items-center justify-center text-white"
                  >
                    {tueste.dev_percent > 10 && `DEV ${tueste.dev_percent.toFixed(0)}%`}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 text-center text-xs text-slate-500 font-medium">
                  <div>Fase Secado: <span className="text-yellow-600 font-bold">{secDry}</span></div>
                  <div>Fase Maillard: <span className="text-amber-700 font-bold">{secMai}</span></div>
                  <div>Fase Desarrollo: <span className="text-orange-600 font-bold">{secDev}</span></div>
                </div>
              </div>
            )}

            {/* Grid 5: Agtron and dev metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-slate-100 text-sm">
              <div>
                <span className="text-slate-500 block">Agtron Color</span>
                <span className="font-bold text-slate-800 text-lg mt-0.5 block">{tueste.agtron || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Potencia Inicial</span>
                <span className="font-bold text-slate-800 text-lg mt-0.5 block">{tueste.potencia_inicial || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Tiempo Enfriamiento</span>
                <span className="font-bold text-slate-800 text-lg mt-0.5 block">{tueste.t_cooling || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Código Curva</span>
                <span className="font-mono font-bold text-slate-800 text-lg mt-0.5 block">{tueste.codigo || '-'}</span>
              </div>
            </div>

            {/* Note / Detail */}
            {tueste.detalle && (
              <div className="pt-6 border-t border-slate-100">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Notas y Comentarios</span>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {tueste.detalle}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}
