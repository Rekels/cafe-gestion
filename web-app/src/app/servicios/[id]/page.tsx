import dbPromise from '@/lib/db'
import ServicioDetailClient from './ServicioDetailClient'
import Link from 'next/link'
import { getGlobalAjustes } from '@/app/actions'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const db = await dbPromise;
  const resolvedParams = await params;
  const decodedId = decodeURIComponent(resolvedParams.id);
  const servicio = await db.get('SELECT n_orden, cliente FROM Servicios WHERE n_orden = ? OR id = ? LIMIT 1', [decodedId, decodedId]);
  if (!servicio) return { title: 'Servicio - Pantiwayta' };
  return {
    title: `${servicio.n_orden} - ${servicio.cliente || 'Servicio'}`,
  };
}

export default async function ServicioResumenPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const db = await dbPromise;
  const resolvedParams = await params;
  const decodedId = decodeURIComponent(resolvedParams.id);
  
  // 1. Fetch Service Order
  const servicio = await db.get('SELECT * FROM Servicios WHERE n_orden = ? OR id = ? LIMIT 1', [decodedId, decodedId]) as any;

  if (!servicio) {
    return (
      <div className="min-h-screen bg-[#1a120b] flex items-center justify-center p-8">
        <div className="bg-[#1a120b]/50 backdrop-blur-md p-8 rounded-2xl border border-white/10 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Servicio no encontrado</h2>
          <p className="text-[#c2a077] mb-6">No pudimos localizar la orden con ID: {decodedId}</p>
          <Link href="/servicios" className="text-[#c2a077] hover:text-white font-medium">
            ← Volver a la lista
          </Link>
        </div>
      </div>
    );
  }
  
  // 2. Fetch all dependent data concurrently
  const [
    clienteInfo,
    clientes,
    globalAjustes,
    linkedRoastOrder,
    lotes,
    activeSessions,
    movimientos,
    bolsas,
    ordenEnvasado,
    linkedProforma
  ] = await Promise.all([
    servicio.cliente 
      ? db.get('SELECT * FROM Clientes WHERE nombre = ?', [servicio.cliente.toUpperCase()])
      : Promise.resolve(null),
    db.all('SELECT * FROM Clientes ORDER BY nombre ASC'),
    getGlobalAjustes(),
    db.get('SELECT id, sesion_id, moisture, density, aw FROM OrdenesTueste WHERE servicio_id = ? LIMIT 1', [servicio.id]),
    db.all('SELECT * FROM Lotes ORDER BY codigo_lote ASC'),
    db.all(`
      SELECT s.id, s.fecha, e.nombre as equipo_nombre,
             (SELECT GROUP_CONCAT(DISTINCT UPPER(o.cliente)) FROM OrdenesTueste o WHERE o.sesion_id = s.id) as clientes
      FROM SesionesTueste s
      LEFT JOIN Equipos e ON s.equipo_id = e.id
      WHERE s.estado = 'activa'
      ORDER BY s.fecha DESC
    `),
    servicio.lote_id
      ? db.all('SELECT * FROM MovimientosStock WHERE lote_id = ? ORDER BY id DESC', [servicio.lote_id])
      : Promise.resolve([]),
    db.all('SELECT * FROM CatalogoBolsas ORDER BY nombre ASC'),
    db.get('SELECT * FROM OrdenesEnvasado WHERE servicio_id = ?', [servicio.id]),
    servicio.proforma_id
      ? db.get('SELECT * FROM Proformas WHERE id = ?', [servicio.proforma_id])
      : Promise.resolve(null)
  ]);

  let paquetesEnvasado: any[] = [];
  let detallesEnvasado: any[] = [];
  if (ordenEnvasado) {
    [paquetesEnvasado, detallesEnvasado] = await Promise.all([
      db.all('SELECT * FROM PaquetesEnvio WHERE orden_envasado_id = ?', [ordenEnvasado.id]),
      db.all('SELECT * FROM OrdenesEnvasado_Detalle WHERE orden_envasado_id = ?', [ordenEnvasado.id])
    ]);
  }

  return (
    <ServicioDetailClient
      servicio={servicio}
      clienteInfo={clienteInfo}
      linkedRoastOrder={linkedRoastOrder}
      lotes={lotes}
      activeSessions={activeSessions}
      clientes={clientes}
      globalAjustes={globalAjustes}
      movimientos={movimientos}
      bolsas={bolsas}
      initialOrdenEnvasado={ordenEnvasado}
      initialPaquetesEnvasado={paquetesEnvasado}
      initialDetallesEnvasado={detallesEnvasado}
      linkedProforma={linkedProforma}
    />
  )
}
