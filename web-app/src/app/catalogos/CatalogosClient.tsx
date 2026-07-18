'use client'

import { useState } from 'react'
import ClientesManager from '@/app/clientes/ClientesManager'
import EquiposManager from '@/app/equipos/EquiposManager'
import ProductoresManager from './ProductoresManager'
import VariedadesManager from './VariedadesManager'
import ProcesosManager from './ProcesosManager'
import BolsasManager from './BolsasManager'
import type { Productor } from './productoresActions'
import type { Variedad } from './variedadesActions'
import type { Proceso } from './procesosActions'
import type { Bolsa } from './bolsasActions'

interface CatalogosClientProps {
  initialClientes: any[]
  initialEquipos: any[]
  initialProductores: Productor[]
  initialVariedades: Variedad[]
  initialProcesos: Proceso[]
  initialBolsas: Bolsa[]
}

export default function CatalogosClient({
  initialClientes,
  initialEquipos,
  initialProductores,
  initialVariedades,
  initialProcesos,
  initialBolsas
}: CatalogosClientProps) {
  const [activeTab, setActiveTab] = useState<'clientes' | 'equipos' | 'productores' | 'variedades' | 'procesos' | 'bolsas'>('clientes')

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1a120b] via-[#2a1d13] to-[#1a120b] text-gray-100 p-6 md:p-12 font-sans selection:bg-[#c2a077]/30">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="border-b border-white/10 pb-6">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#c2a077] to-yellow-200 mb-3">
            Catálogos del Sistema
          </h1>
          <p className="text-[#c2a077]/70 text-lg">
            Administra de forma centralizada tus bases de datos de clientes, maquinarias y productores de café.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/5 gap-2 scrollbar-none overflow-x-auto">
          <button
            onClick={() => setActiveTab('clientes')}
            className={`px-5 py-3 text-sm font-bold rounded-t-2xl transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'clientes'
                ? 'border-[#c2a077] text-white bg-white/5'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>👤</span> Clientes
          </button>
          <button
            onClick={() => setActiveTab('equipos')}
            className={`px-5 py-3 text-sm font-bold rounded-t-2xl transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'equipos'
                ? 'border-[#c2a077] text-white bg-white/5'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>⚙️</span> Equipos / Maquinaria
          </button>
          <button
            onClick={() => setActiveTab('productores')}
            className={`px-5 py-3 text-sm font-bold rounded-t-2xl transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'productores'
                ? 'border-[#c2a077] text-white bg-white/5'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🌾</span> Productores
          </button>
          <button
            onClick={() => setActiveTab('variedades')}
            className={`px-5 py-3 text-sm font-bold rounded-t-2xl transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'variedades'
                ? 'border-[#c2a077] text-white bg-white/5'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🍒</span> Variedades
          </button>
          <button
            onClick={() => setActiveTab('procesos')}
            className={`px-5 py-3 text-sm font-bold rounded-t-2xl transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'procesos'
                ? 'border-[#c2a077] text-white bg-white/5'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🧪</span> Procesos
          </button>
          <button
            onClick={() => setActiveTab('bolsas')}
            className={`px-5 py-3 text-sm font-bold rounded-t-2xl transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'bolsas'
                ? 'border-[#c2a077] text-white bg-white/5'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>📦</span> Insumos (Bolsas)
          </button>
        </div>

        {/* Tab Contents */}
        <div className="mt-6">
          {activeTab === 'clientes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>👤</span> Catálogo de Clientes
                </h2>
              </div>
              <ClientesManager clientes={initialClientes} />
            </div>
          )}

          {activeTab === 'equipos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>⚙️</span> Catálogo de Equipos y Maquinarias
                </h2>
              </div>
              <EquiposManager initialEquipos={initialEquipos} />
            </div>
          )}

          {activeTab === 'productores' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>🌾</span> Catálogo de Productores de Café
                </h2>
              </div>
              <ProductoresManager productores={initialProductores} />
            </div>
          )}

          {activeTab === 'variedades' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>🍒</span> Catálogo de Variedades de Café
                </h2>
              </div>
              <VariedadesManager variedades={initialVariedades} />
            </div>
          )}

          {activeTab === 'procesos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>🧪</span> Catálogo de Procesos de Café
                </h2>
              </div>
              <ProcesosManager procesos={initialProcesos} />
            </div>
          )}

          {activeTab === 'bolsas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>📦</span> Catálogo de Insumos y Empaques
                </h2>
              </div>
              <BolsasManager bolsas={initialBolsas} />
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
