import dbPromise from '@/lib/db'
import ServicioDetailClient from './ServicioDetailClient'
import Link from 'next/link'
import { getGlobalAjustes } from '@/app/actions'

export const dynamic = 'force-dynamic'

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
  
  // 2. Fetch Client Info
  let clienteInfo = null;
  if (servicio.cliente) {
    clienteInfo = await db.get('SELECT * FROM Clientes WHERE nombre = ?', [servicio.cliente.toUpperCase()]);
  }

  const clientes = await db.all('SELECT * FROM Clientes ORDER BY nombre ASC');
  const globalAjustes = await getGlobalAjustes();

  // 3. Fetch linked roast order if scheduled
  const linkedRoastOrder = await db.get('SELECT id, sesion_id, moisture, density, aw FROM OrdenesTueste WHERE servicio_id = ? LIMIT 1', [servicio.id]);

  // 4. Fetch lotes
  const lotes = await db.all('SELECT * FROM Lotes ORDER BY codigo_lote ASC');

  // 5. Fetch active sessions
  const activeSessions = await db.all(`
    SELECT s.id, s.fecha, e.nombre as equipo_nombre,
           (SELECT GROUP_CONCAT(DISTINCT UPPER(o.cliente)) FROM OrdenesTueste o WHERE o.sesion_id = s.id) as clientes
    FROM SesionesTueste s
    LEFT JOIN Equipos e ON s.equipo_id = e.id
    WHERE s.estado = 'activa'
    ORDER BY s.fecha DESC
  `);

  // 6. Fetch lot movements
  let movimientos: any[] = [];
  if (servicio.lote_id) {
    movimientos = await db.all(
      'SELECT * FROM MovimientosStock WHERE lote_id = ? ORDER BY id DESC',
      [servicio.lote_id]
    );
  }

  // 7. Fetch Envasado Data
  const bolsas = await db.all('SELECT * FROM CatalogoBolsas ORDER BY nombre ASC');
  let ordenEnvasado = await db.get('SELECT * FROM OrdenesEnvasado WHERE servicio_id = ?', [servicio.id]);
  let paquetesEnvasado = [];
  let detallesEnvasado = [];
  
  if (ordenEnvasado) {
    paquetesEnvasado = await db.all('SELECT * FROM PaquetesEnvio WHERE orden_envasado_id = ?', [ordenEnvasado.id]);
    detallesEnvasado = await db.all('SELECT * FROM OrdenesEnvasado_Detalle WHERE orden_envasado_id = ?', [ordenEnvasado.id]);
  }

  let linkedProforma = null;
  if (servicio.proforma_id) {
    linkedProforma = await db.get('SELECT * FROM Proformas WHERE id = ?', [servicio.proforma_id]);
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
