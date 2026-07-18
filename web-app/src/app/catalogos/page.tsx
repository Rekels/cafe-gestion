import dbPromise from '@/lib/db'
import CatalogosClient from './CatalogosClient'

export const dynamic = 'force-dynamic'

export default async function CatalogosPage() {
  const db = await dbPromise;

  // Fetch all databases in parallel or sequentially
  const clientes = await db.all('SELECT * FROM Clientes ORDER BY nombre ASC');
  const equipos = await db.all('SELECT * FROM Equipos ORDER BY nombre ASC');
  const productoras = await db.all('SELECT * FROM Productores ORDER BY nombre ASC');
  const variedades = await db.all('SELECT * FROM Variedades ORDER BY nombre ASC');
  const procesos = await db.all('SELECT * FROM Procesos ORDER BY nombre ASC');
  const bolsas = await db.all('SELECT * FROM CatalogoBolsas ORDER BY nombre ASC');

  return (
    <CatalogosClient
      initialClientes={clientes}
      initialEquipos={equipos}
      initialProductores={productoras}
      initialVariedades={variedades}
      initialProcesos={procesos}
      initialBolsas={bolsas}
    />
  )
}
