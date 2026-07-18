import dbPromise from '@/lib/db'
import { getGlobalAjustes } from '@/app/actions'
import { getConceptosPredefinidos } from '@/app/proformas/actions'
import AjustesClient from './AjustesClient'

export const dynamic = 'force-dynamic'

export default async function AjustesPage() {
  const config = await getGlobalAjustes();
  const conceptos = await getConceptosPredefinidos();

  return (
    <AjustesClient
      config={config}
      conceptos={conceptos}
    />
  )
}
