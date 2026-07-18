import { getDespachos } from '@/app/actions'
import dbPromise from '@/lib/db'
import DespachosClient from './DespachosClient'

export const dynamic = 'force-dynamic'

export default async function DespachosPage() {
  const db = await dbPromise
  const [despachos, lotes, clientes, bolsas] = await Promise.all([
    getDespachos(),
    db.all('SELECT * FROM Lotes ORDER BY codigo_lote ASC'),
    db.all('SELECT * FROM Clientes ORDER BY nombre ASC'),
    db.all('SELECT * FROM CatalogoBolsas ORDER BY nombre ASC')
  ])

  return (
    <DespachosClient 
      initialDespachos={despachos} 
      lotes={lotes} 
      clientes={clientes}
      bolsas={bolsas}
    />
  )
}
