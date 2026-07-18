import Link from 'next/link'
import dbPromise from '@/lib/db'

export const dynamic = 'force-dynamic';

export default async function Home() {
  const db = await dbPromise;

  // 1. Lotes en custodia (suma de stocks)
  const lotesRes = await db.get(`
    SELECT 
      SUM(IFNULL(stock_pergamino, 0)) + 
      SUM(IFNULL(stock_oro_verde_bruto, 0)) + 
      SUM(IFNULL(stock_oro_verde_seleccionado, 0)) + 
      SUM(IFNULL(stock_tostado, 0)) as total_kg 
    FROM Lotes
  `);
  const totalCustodia = lotesRes?.total_kg || 0;

  // 2. Órdenes de servicio activas
  const serviciosRes = await db.get(`
    SELECT COUNT(*) as count 
    FROM Servicios 
    WHERE estado != 'Completado' AND estado != 'Entregado'
  `);
  const ordenesActivas = serviciosRes?.count || 0;

  // 3. Tuestes programados (OrdenesTueste pendientes)
  const tuestesRes = await db.get(`
    SELECT COUNT(*) as count 
    FROM OrdenesTueste 
    WHERE estado != 'Completado'
  `);
  const tuestesProgramados = tuestesRes?.count || 0;

  // 4. Créditos a Clientes (Proformas no pagadas)
  const proformasRes = await db.get(`
    SELECT SUM(total) as creditos 
    FROM Proformas 
    WHERE estado = 'Pendiente' OR estado = 'Emitida'
  `);
  const creditosTotales = proformasRes?.creditos || 0;

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Panel General
        </h1>
        <p className="text-sm text-gray-400">Resumen operativo y accesos rápidos</p>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1a120b]/60 backdrop-blur-xl rounded-3xl border border-white/10 p-5 shadow-lg flex flex-col justify-between hover:bg-[#1a120b]/80 transition-colors">
          <div className="text-gray-400 text-xs sm:text-sm font-medium mb-2 flex items-center gap-2">
            <span className="text-lg">📦</span> Custodia Total
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
            {totalCustodia.toFixed(1)} <span className="text-sm text-[#c2a077] ml-1">kg</span>
          </div>
        </div>
        
        <div className="bg-[#1a120b]/60 backdrop-blur-xl rounded-3xl border border-white/10 p-5 shadow-lg flex flex-col justify-between hover:bg-[#1a120b]/80 transition-colors">
          <div className="text-gray-400 text-xs sm:text-sm font-medium mb-2 flex items-center gap-2">
            <span className="text-lg">📋</span> Órdenes Activas
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-blue-400 font-mono">
            {ordenesActivas} <span className="text-sm text-gray-500 ml-1">OTs</span>
          </div>
        </div>

        <div className="bg-[#1a120b]/60 backdrop-blur-xl rounded-3xl border border-white/10 p-5 shadow-lg flex flex-col justify-between hover:bg-[#1a120b]/80 transition-colors">
          <div className="text-gray-400 text-xs sm:text-sm font-medium mb-2 flex items-center gap-2">
            <span className="text-lg">🔥</span> Tuestes Pendientes
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-500 font-mono">
            {tuestesProgramados} <span className="text-sm text-gray-500 ml-1">Lotes</span>
          </div>
        </div>

        <div className="bg-[#1a120b]/60 backdrop-blur-xl rounded-3xl border border-[#c2a077]/30 p-5 shadow-[0_0_15px_rgba(194,160,119,0.1)] flex flex-col justify-between bg-gradient-to-br from-[#1a120b]/80 to-[#c2a077]/10 hover:to-[#c2a077]/20 transition-colors">
          <div className="text-[#c2a077] text-xs sm:text-sm font-medium mb-2 flex items-center gap-2">
            <span className="text-lg">💳</span> Créditos a Clientes
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
            <span className="text-sm text-[#c2a077] mr-1">S/</span>{creditosTotales.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Quick Access Buttons */}
      <div className="pt-4">
        <h2 className="text-lg font-bold text-white mb-4">Nueva Orden de Trabajo</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Link href="/servicios?action=trillado" className="group">
            <div className="flex flex-col items-center justify-center p-6 bg-[#1a120b]/40 backdrop-blur-md rounded-3xl border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all duration-300 shadow-sm hover:shadow-emerald-500/20 text-center h-full">
              <span className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">🌾</span>
              <span className="text-sm font-bold text-gray-200 group-hover:text-emerald-400">Recepción / Trillado</span>
            </div>
          </Link>
          
          <Link href="/servicios?action=seleccion" className="group">
            <div className="flex flex-col items-center justify-center p-6 bg-[#1a120b]/40 backdrop-blur-md rounded-3xl border border-white/10 hover:border-teal-500/50 hover:bg-teal-500/10 transition-all duration-300 shadow-sm hover:shadow-teal-500/20 text-center h-full">
              <span className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">🔍</span>
              <span className="text-sm font-bold text-gray-200 group-hover:text-teal-400">Selección Sorte</span>
            </div>
          </Link>

          <Link href="/servicios?action=tueste" className="group">
            <div className="flex flex-col items-center justify-center p-6 bg-[#1a120b]/40 backdrop-blur-md rounded-3xl border border-white/10 hover:border-amber-500/50 hover:bg-amber-500/10 transition-all duration-300 shadow-sm hover:shadow-amber-500/20 text-center h-full">
              <span className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">🔥</span>
              <span className="text-sm font-bold text-gray-200 group-hover:text-amber-400">Tueste</span>
            </div>
          </Link>

          <Link href="/servicios?action=molienda" className="group">
            <div className="flex flex-col items-center justify-center p-6 bg-[#1a120b]/40 backdrop-blur-md rounded-3xl border border-white/10 hover:border-orange-500/50 hover:bg-orange-500/10 transition-all duration-300 shadow-sm hover:shadow-orange-500/20 text-center h-full">
              <span className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">⚙️</span>
              <span className="text-sm font-bold text-gray-200 group-hover:text-orange-400">Molienda</span>
            </div>
          </Link>
          
          <Link href="/envasado" className="group">
            <div className="flex flex-col items-center justify-center p-6 bg-[#1a120b]/40 backdrop-blur-md rounded-3xl border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all duration-300 shadow-sm hover:shadow-blue-500/20 text-center h-full">
              <span className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">📦</span>
              <span className="text-sm font-bold text-gray-200 group-hover:text-blue-400">Envasado</span>
            </div>
          </Link>
          
          <Link href="/despachos" className="group">
            <div className="flex flex-col items-center justify-center p-6 bg-[#1a120b]/40 backdrop-blur-md rounded-3xl border border-white/10 hover:border-red-500/50 hover:bg-red-500/10 transition-all duration-300 shadow-sm hover:shadow-red-500/20 text-center h-full">
              <span className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">📤</span>
              <span className="text-sm font-bold text-gray-200 group-hover:text-red-400">Despachos</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
