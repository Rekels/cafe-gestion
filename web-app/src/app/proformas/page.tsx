import dbPromise from '@/lib/db'
import { getProformas, getConceptosPredefinidos } from './actions'
import ProformasClient from './ProformasClient'

export const dynamic = 'force-dynamic'

export default async function ProformasPage() {
  const db = await dbPromise;

  // Fetch all proformas
  const proformas = await getProformas();

  // Fetch all clients for client selector
  const clientes = await db.all('SELECT * FROM Clientes ORDER BY nombre ASC');

  // Fetch predefined concepts
  const conceptosPredefinidos = await getConceptosPredefinidos();

  return (
    <ProformasClient
      proformas={proformas}
      clientes={clientes}
      conceptosPredefinidos={conceptosPredefinidos}
    />
  )
}
