import dbPromise from '@/lib/db'
import StockClient from './StockClient'
import StockTotales from './StockTotales'

export const dynamic = 'force-dynamic'

export default async function StockPage() {
  const db = await dbPromise;
  const lotes = await db.all(`
    SELECT L.*, IFNULL(L.peso_kg, 0) as stock_actual
    FROM Lotes L
    WHERE L.activo = 1
    ORDER BY L.id DESC
  `);

  const lotesBolsas = await db.all(`
    SELECT lb.*, c.nombre, c.capacidad_g 
    FROM LotesBolsas lb
    JOIN CatalogoBolsas c ON lb.bolsa_id = c.id
    WHERE lb.cantidad_en_almacen > 0
  `);

  const totales = await db.all(`
    SELECT * FROM InventarioGlobal
    ORDER BY propietario ASC, variedad ASC
  `);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1a120b] via-[#2a1d13] to-[#1a120b] text-gray-100 p-6 md:p-12 font-sans selection:bg-[#c2a077]/30">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#c2a077] to-yellow-200 mb-3">
              Control de Stock e Inventario
            </h1>
            <p className="text-[#c2a077]/70 text-lg">
              Monitorea los almacenes de café verde (pergamino/oro) y tostado en tiempo real.
            </p>
          </div>
        </div>

        <StockTotales totales={totales} />
        <StockClient initialLotes={lotes} initialBolsas={lotesBolsas} />

      </div>
    </div>
  )
}
