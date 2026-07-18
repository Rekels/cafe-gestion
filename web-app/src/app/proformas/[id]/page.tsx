import dbPromise from '@/lib/db'
import Link from 'next/link'
import { getProformaById, getConceptosPredefinidos } from '../actions'
import { getGlobalAjustes } from '@/app/actions'
import ProformaDetailClient from './ProformaDetailClient'

export const dynamic = 'force-dynamic'

export default async function ProformaDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const db = await dbPromise;
  const resolvedParams = await params;
  const id = Number(resolvedParams.id);

  // 1. Fetch Proforma Details
  const proforma = await getProformaById(id);

  if (!proforma) {
    return (
      <div className="min-h-screen bg-[#1a120b] flex items-center justify-center p-8">
        <div className="bg-[#1a120b]/50 backdrop-blur-md p-8 rounded-2xl border border-white/10 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Proforma no encontrada</h2>
          <p className="text-[#c2a077] mb-6">No pudimos localizar la proforma con ID: {resolvedParams.id}</p>
          <Link href="/proformas" className="text-[#c2a077] hover:text-white font-medium">
            ← Volver a la lista
          </Link>
        </div>
      </div>
    );
  }

  // 2. Fetch Client Info (RUC, email, phone) if available
  let clienteInfo = null;
  if (proforma.cliente) {
    clienteInfo = await db.get('SELECT * FROM Clientes WHERE nombre = ?', [proforma.cliente.toUpperCase()]);
  }

  // 3. Fetch corporate header info from Ajustes
  const globalAjustes = await getGlobalAjustes();

  // 4. Fetch predefined concepts for the edit modal
  const conceptosPredefinidos = await getConceptosPredefinidos();

  return (
    <ProformaDetailClient
      proforma={proforma}
      clienteInfo={clienteInfo}
      globalAjustes={globalAjustes}
      conceptosPredefinidos={conceptosPredefinidos}
    />
  )
}
