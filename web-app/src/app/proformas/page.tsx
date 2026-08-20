import dbPromise from '@/lib/db'
import { getProformas, getConceptosPredefinidos } from './actions'
import ProformasClient from './ProformasClient'

export const dynamic = 'force-dynamic'

export default async function ProformasPage() {
  const db = await dbPromise;

  // Parallelize fetches
  const [proformas, clientes, conceptosPredefinidos] = await Promise.all([
    getProformas(),
    db.all('SELECT * FROM Clientes ORDER BY nombre ASC'),
    getConceptosPredefinidos()
  ]);

  return (
    <ProformasClient
      proformas={proformas}
      clientes={clientes}
      conceptosPredefinidos={conceptosPredefinidos}
    />
  )
}
