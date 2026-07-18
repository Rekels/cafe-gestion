import dbPromise from '@/lib/db'
import ServiciosClient from './ServiciosClient'
import { getGlobalAjustes } from '@/app/actions'

import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

export default async function ServiciosList() {
  const db = await dbPromise;
  
  // Fetch services
  const servicios = await db.all('SELECT * FROM Servicios ORDER BY id DESC');
  
  // Fetch clients for dropdown selector
  const clientes = await db.all('SELECT * FROM Clientes ORDER BY nombre ASC');
  
  // Fetch lotes for selector
  const lotes = await db.all('SELECT * FROM Lotes ORDER BY codigo_lote ASC');

  // Fetch equipos
  const equipos = await db.all("SELECT * FROM Equipos WHERE activo = 1 ORDER BY nombre ASC");

  // Fetch active sessions for dropdown scheduling
  const activeSessions = await db.all(`
    SELECT s.id, s.fecha, e.nombre as equipo_nombre,
           (SELECT GROUP_CONCAT(DISTINCT UPPER(o.cliente)) FROM OrdenesTueste o WHERE o.sesion_id = s.id) as clientes
    FROM SesionesTueste s
    LEFT JOIN Equipos e ON s.equipo_id = e.id
    WHERE s.estado = 'activa'
    ORDER BY s.fecha DESC
  `);

  // Fetch global adjustments
  const globalAjustes = await getGlobalAjustes();

  // Fetch unlinked finalizadas ordenes de tueste
  const unlinkedTuestes = await db.all(`
    SELECT o.id, o.cliente, o.codigo_lote, s.fecha
    FROM OrdenesTueste o
    JOIN SesionesTueste s ON s.id = o.sesion_id
    WHERE o.estado = 'finalizada' AND o.servicio_id IS NULL
    ORDER BY s.fecha DESC, o.id DESC
  `);

  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-400 animate-pulse">Cargando servicios...</div>}>
      <ServiciosClient
        servicios={servicios}
        clientes={clientes}
        lotes={lotes}
        activeSessions={activeSessions}
        globalAjustes={globalAjustes}
        equipos={equipos}
        unlinkedTuestes={unlinkedTuestes}
      />
    </Suspense>
  )
}
