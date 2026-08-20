import dbPromise from '@/lib/db'
import Link from 'next/link'
import CreateSessionForm from './CreateSessionForm'

export const dynamic = 'force-dynamic'

export default async function NuevoTuestePage() {
  const db = await dbPromise;
  
  const equipos = await db.all("SELECT id, nombre, tipo, capacidad_kg FROM Equipos WHERE activo = 1 AND tipo = 'tostadora' ORDER BY nombre");

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1a120b] via-[#2a1d13] to-[#1a120b] text-gray-100 p-6 md:p-12 font-sans selection:bg-[#c2a077]/30">
      <div className="max-w-2xl mx-auto space-y-8">
        
        <div className="flex items-center gap-4">
          <Link href="/tuestes" className="group text-[#c2a077]/70 hover:text-[#c2a077] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#c2a077] to-yellow-200">
              Nueva Sesión de Tueste
            </h1>
            <p className="text-[#c2a077]/60 text-sm mt-1">
              Selecciona la fecha y la tostadora. Luego podrás agregar Órdenes de Tueste con los cafés a procesar.
            </p>
          </div>
        </div>

        <CreateSessionForm equipos={equipos} />

      </div>
    </div>
  )
}
