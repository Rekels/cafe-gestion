import dbPromise from '@/lib/db'
import Link from 'next/link'
import SessionView from './SessionView'

export const dynamic = 'force-dynamic'

export default async function SesionControlPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ id: string }>
  searchParams: Promise<{ ordenId?: string }>
}) {
  const db = await dbPromise;
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const decodedId = decodeURIComponent(resolvedParams.id);
  const targetOrdenId = resolvedSearchParams.ordenId ? Number(resolvedSearchParams.ordenId) : undefined;
  
  // Fetch session with equipment info
  const sesion = await db.get(`
    SELECT s.*, e.nombre as equipo_nombre, e.capacidad_kg as equipo_capacidad,
           e.default_temp_ts, e.default_temp_fc, e.default_temp_end
    FROM SesionesTueste s
    LEFT JOIN Equipos e ON s.equipo_id = e.id
    WHERE s.id = ? LIMIT 1
  `, [decodedId]) as any;

  if (!sesion) {
    return (
      <div className="min-h-screen bg-[#1a120b] flex items-center justify-center p-8">
        <div className="bg-[#1a120b]/50 backdrop-blur-md p-8 rounded-2xl border border-white/10 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Sesión de Tueste no encontrada</h2>
          <p className="text-[#c2a077] mb-6">No pudimos localizar la sesión con ID: {decodedId}</p>
          <Link href="/tuestes" className="text-[#c2a077] hover:text-white font-medium">
            ← Volver a la lista
          </Link>
        </div>
      </div>
    );
  }

  // Fetch all órdenes for this session
  const ordenes = await db.all(`
    SELECT o.*, 
      (SELECT COUNT(*) FROM Tuestes WHERE orden_id = o.id) as batch_count,
      (SELECT SUM(gc) FROM Tuestes WHERE orden_id = o.id) as gc_total,
      (SELECT SUM(rc) FROM Tuestes WHERE orden_id = o.id) as rc_total
    FROM OrdenesTueste o 
    WHERE o.sesion_id = ? 
    ORDER BY o.orden_visual ASC
  `, [sesion.id]);

  // Fetch all batches grouped by orden
  const allBatches = await db.all(`
    SELECT * FROM Tuestes WHERE sesion_id = ? ORDER BY orden_id ASC, batch_n ASC
  `, [sesion.id]);

  // Group batches by orden_id
  const batchesByOrden: Record<number, any[]> = {};
  for (const b of allBatches) {
    if (!batchesByOrden[b.orden_id]) batchesByOrden[b.orden_id] = [];
    batchesByOrden[b.orden_id].push(b);
  }

  // Fetch references for each orden
  const referenciasByOrden: Record<number, any> = {};
  for (const orden of ordenes) {
    if (orden.referencia_tueste_id) {
      const ref = await db.get('SELECT * FROM Tuestes WHERE id = ?', [orden.referencia_tueste_id]);
      if (ref) referenciasByOrden[orden.id] = ref;
    }
  }

  // Fetch lotes and referencias for the AddOrderModal
  const lotes = await db.all('SELECT id, codigo_lote, variedad, proceso, productor, stock_real FROM Lotes ORDER BY id DESC');
  const referencias = await db.all(`
    SELECT id, variedad, proceso, productor, codigo_lote, fecha, nombre_referencia, agtron 
    FROM Tuestes WHERE es_referencia = 1 ORDER BY id DESC
  `);
  const clientes = await db.all('SELECT * FROM Clientes ORDER BY nombre ASC');
  const equipos = await db.all("SELECT id, nombre FROM Equipos WHERE tipo = 'tostadora' AND activo = 1 ORDER BY nombre ASC");

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1a120b] via-[#2a1d13] to-[#1a120b] text-gray-100 p-4 md:p-6 font-sans selection:bg-[#c2a077]/30">
      <div className="max-w-[1400px] mx-auto">
        <SessionView
          sesion={sesion}
          ordenes={ordenes}
          batchesByOrden={batchesByOrden}
          referenciasByOrden={referenciasByOrden}
          lotes={lotes}
          referencias={referencias}
          clientes={clientes}
          equipos={equipos}
          initialActiveOrdenId={targetOrdenId}
        />
      </div>
    </div>
  )
}
