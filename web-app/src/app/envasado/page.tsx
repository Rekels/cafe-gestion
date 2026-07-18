import dbPromise from '@/lib/db'
import { getAllOrdenesEnvasado } from './envasadoActions'
import EnvasadoClient from './EnvasadoClient'

export const dynamic = 'force-dynamic'

export default async function EnvasadoPage() {
  const db = await dbPromise
  const [ordenes, lotes, bolsas] = await Promise.all([
    getAllOrdenesEnvasado(),
    db.all('SELECT * FROM Lotes ORDER BY codigo_lote ASC'),
    db.all('SELECT * FROM CatalogoBolsas ORDER BY nombre ASC')
  ])

  return (
    <EnvasadoClient 
      initialOrdenes={ordenes} 
      lotes={lotes} 
      bolsas={bolsas}
    />
  )
}
