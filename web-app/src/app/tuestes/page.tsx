import dbPromise from '@/lib/db'
import Link from 'next/link'
import HistoryList from './HistoryList'
import ProcessBadge from '@/components/ProcessBadge'

export const dynamic = 'force-dynamic'

export default async function TuestesPage({
  searchParams
}: {
  searchParams: Promise<{ query?: string; tab?: string }>
}) {
  const db = await dbPromise;
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.query || '';
  const activeTab = resolvedSearchParams.tab || 'sesiones';

  // 1. Fetch Sessions with equipment
  let sessionsSql = `
    SELECT s.*, e.nombre as equipo_nombre 
    FROM SesionesTueste s
    LEFT JOIN Equipos e ON s.equipo_id = e.id
  `;
  let sessionParams: any[] = [];
  
  // We need to support searching by variety, lot code, producer, etc.
  // Since those are now in OrdenesTueste, we'll use a subquery if there's a search term
  if (query) {
    sessionsSql += `
      WHERE s.id IN (
        SELECT sesion_id FROM OrdenesTueste 
        WHERE codigo_lote LIKE ? OR variedad LIKE ? OR productor LIKE ? OR cliente LIKE ?
      )
    `;
    const likeQ = `%${query}%`;
    sessionParams = [likeQ, likeQ, likeQ, likeQ];
  }
  sessionsSql += ' ORDER BY s.id DESC LIMIT 50'; // Limit for performance
  
  const sesionesRows = await db.all(sessionsSql, sessionParams);
  const sessionIds = sesionesRows.map((s: any) => s.id);

  let ordenesRows: any[] = [];
  let batchesRows: any[] = [];

  if (sessionIds.length > 0) {
    const placeholders = sessionIds.map(() => '?').join(',');
    ordenesRows = await db.all(`SELECT * FROM OrdenesTueste WHERE sesion_id IN (${placeholders}) ORDER BY orden_visual ASC`, sessionIds);
    batchesRows = await db.all(`SELECT * FROM Tuestes WHERE sesion_id IN (${placeholders}) ORDER BY batch_n ASC`, sessionIds);
  }

  // Build the hierarchical structure
  const sesiones = sesionesRows.map((s: any) => {
    const ordenes = ordenesRows.filter((o: any) => o.sesion_id === s.id).map((o: any) => {
      const batches = batchesRows.filter((b: any) => b.orden_id === o.id);
      return { ...o, batches };
    });
    return { ...s, ordenes };
  });

  // 2. Fetch References
  let refsSql = 'SELECT * FROM Tuestes WHERE es_referencia = 1';
  let refParams: any[] = [];
  if (query) {
    refsSql += ' AND (nombre_referencia LIKE ? OR codigo_lote LIKE ? OR variedad LIKE ?)';
    const likeQ = `%${query}%`;
    refParams = [likeQ, likeQ, likeQ];
  }
  refsSql += ' ORDER BY id DESC';
  const referencias = await db.all(refsSql, refParams);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1a120b] via-[#2a1d13] to-[#1a120b] text-gray-100 p-6 md:p-12 font-sans selection:bg-[#c2a077]/30">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#c2a077] to-yellow-200 mb-3">
              Plan de Tueste y Perfiles
            </h1>
            <p className="text-[#c2a077]/70 text-lg">
              Planifica sesiones, registra parámetros de curva en vivo y maneja tu biblioteca de perfiles de referencia.
            </p>
          </div>
          <div>
            <Link 
              href="/tuestes/nuevo" 
              className="flex items-center gap-2 px-6 py-3 bg-[#c2a077] hover:bg-[#b08f65] text-[#1a120b] font-bold rounded-xl transition-all duration-300 shadow-lg shadow-[#c2a077]/10"
            >
              <span>🔥</span> Planificar Sesión
            </Link>
          </div>
        </div>

        {/* Tab Headers and Search */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Tabs */}
          <div className="flex bg-black/30 p-1 rounded-xl border border-white/5">
            <Link
              href={`/tuestes?tab=sesiones&query=${query}`}
              className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
                activeTab === 'sesiones'
                  ? 'bg-[#c2a077] text-[#1a120b] shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              📋 Sesiones de Tueste
            </Link>
            <Link
              href={`/tuestes?tab=referencias&query=${query}`}
              className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
                activeTab === 'referencias'
                  ? 'bg-[#c2a077] text-[#1a120b] shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ⭐ Biblioteca de Referencias
            </Link>
          </div>

          {/* Search bar */}
          <div className="flex gap-2 w-full sm:max-w-xs">
            <form method="GET" action="/tuestes" className="w-full flex gap-2">
              <input type="hidden" name="tab" value={activeTab} />
              <input
                type="text"
                name="query"
                defaultValue={query}
                placeholder="Buscar lote, variedad..."
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077] transition-colors"
              />
              <button type="submit" className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-medium">
                Buscar
              </button>
            </form>
          </div>
        </div>

        {/* Tab Contents: Sessions */}
        {activeTab === 'sesiones' && (
          <HistoryList sesiones={sesiones} />
        )}

        {/* Tab Contents: Reference Library */}
        {activeTab === 'referencias' && (
          <div className="bg-[#1a120b]/60 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-white/5 text-[#c2a077] text-sm tracking-wider uppercase">
                    <th className="p-5 font-semibold">Perfil de Referencia</th>
                    <th className="p-5 font-semibold">Fecha Guardado</th>
                    <th className="p-5 font-semibold">Variedad / Lote</th>
                    <th className="p-5 font-semibold text-center">Merma</th>
                    <th className="p-5 font-semibold text-center">Secado (TS)</th>
                    <th className="p-5 font-semibold text-center">Crack (FC)</th>
                    <th className="p-5 font-semibold text-center">Total (T)</th>
                    <th className="p-5 font-semibold text-center">Agtron Color</th>
                    <th className="p-5 font-semibold text-right">Ficha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {referencias.map((r: any) => (
                    <tr key={r.id} className="hover:bg-white/[0.03] transition-colors duration-200 group">
                      <td className="p-5">
                        <span className="font-bold text-white block text-sm">
                          {r.nombre_referencia || 'Referencia sin nombre'}
                        </span>
                        <span className="text-xs text-gray-400 block mt-0.5">Operador: {r.roaster}</span>
                      </td>
                      <td className="p-5 text-gray-300 text-sm">{r.fecha || '-'}</td>
                      <td className="p-5 text-gray-300">
                        <span className="font-semibold text-white flex items-center gap-1.5">{r.variedad} <ProcessBadge proceso={r.proceso} /></span>
                        <span className="font-mono text-xs text-[#c2a077] block mt-0.5">{r.codigo_lote}</span>
                      </td>
                      <td className="p-5 text-center font-bold text-emerald-400 font-mono">{r.lw_percent?.toFixed(1)}%</td>
                      <td className="p-5 text-center font-mono text-gray-300">{r.t_ts || '-'}</td>
                      <td className="p-5 text-center font-mono text-gray-300">{r.t_fc || '-'}</td>
                      <td className="p-5 text-center font-mono text-gray-300">{r.t_t || '-'}</td>
                      <td className="p-5 text-center font-semibold text-white">{r.agtron || '-'}</td>
                      <td className="p-5 text-right">
                        <Link 
                          href={`/tuestes/sesiones/${r.sesion_id}`} // En el nuevo modelo la ficha seria entrar a la sesión y buscarlo, u obviar. Por ahora mandamos a la sesión.
                          className="inline-flex items-center justify-center px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-colors border border-white/10 shadow-sm text-sm"
                        >
                          Ver Sesión
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {referencias.length === 0 && (
                <div className="p-12 text-center text-gray-400">
                  No hay perfiles de tueste marcados como referencia de éxito todavía.
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
