'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { updateGlobalAjustes } from '@/app/actions'
import { createConceptoPredefinido, deleteConceptoPredefinido, updateConceptoPredefinido } from '@/app/proformas/actions'

interface PredefinedConcept {
  id: number
  nombre: string
  precio_defecto: number
}

interface AjustesClientProps {
  config: Record<string, string>
  conceptos: PredefinedConcept[]
}

export default function AjustesClient({ config, conceptos }: AjustesClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<'tarifas' | 'facturacion' | 'conceptos'>('tarifas')

  // Rates states
  const [trillado, setTrillado] = useState(config.global_trillado_precio_kg || '1.00')
  const [seleccion, setSeleccion] = useState(config.global_seleccion_precio_kg || '1.50')
  const [tueste, setTueste] = useState(config.global_tueste_precio_kg || '6.00')
  const [molienda, setMolienda] = useState(config.global_molienda_precio_kg || '1.00')
  const [envasado, setEnvasado] = useState(config.global_envasado_precio_unidad || '0.50')

  // Billing states
  const [empresaNombre, setEmpresaNombre] = useState(config.empresa_nombre || 'PANTIWAYTA TOSTADURÍA')
  const [empresaRuc, setEmpresaRuc] = useState(config.empresa_ruc || '12345678901')
  const [empresaDireccion, setEmpresaDireccion] = useState(config.empresa_direccion || 'Calle Principal N° 123')
  const [empresaTelefono, setEmpresaTelefono] = useState(config.empresa_telefono || '+51 987 654 321')
  const [empresaCorreo, setEmpresaCorreo] = useState(config.empresa_correo || 'hola@pantiwayta.com')
  const [empresaYape, setEmpresaYape] = useState(config.empresa_yape || '')
  const [empresaBancoNombre, setEmpresaBancoNombre] = useState(config.empresa_banco_nombre || '')
  const [empresaBancoCuenta, setEmpresaBancoCuenta] = useState(config.empresa_banco_cuenta || '')
  const [empresaBancoCci, setEmpresaBancoCci] = useState(config.empresa_banco_cci || '')
  const [empresaTitular, setEmpresaTitular] = useState(config.empresa_titular || 'Wayta Café S.R.L.')

  // New concept form state
  const [newConceptNombre, setNewConceptNombre] = useState('')
  const [newConceptPrecio, setNewConceptPrecio] = useState('')
  const [conceptError, setConceptError] = useState('')
  const [isAddingConcept, setIsAddingConcept] = useState(false)

  // Predefined concept inline editing state
  const [editingConceptId, setEditingConceptId] = useState<number | null>(null)
  const [editingNombre, setEditingNombre] = useState('')
  const [editingPrecio, setEditingPrecio] = useState('')

  // Save general settings (Rates and Corporate details)
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const payload = {
        global_trillado_precio_kg: trillado,
        global_seleccion_precio_kg: seleccion,
        global_tueste_precio_kg: tueste,
        global_molienda_precio_kg: molienda,
        global_envasado_precio_unidad: envasado,
        empresa_nombre: empresaNombre,
        empresa_ruc: empresaRuc,
        empresa_direccion: empresaDireccion,
        empresa_telefono: empresaTelefono,
        empresa_correo: empresaCorreo,
        empresa_yape: empresaYape,
        empresa_banco_nombre: empresaBancoNombre,
        empresa_banco_cuenta: empresaBancoCuenta,
        empresa_banco_cci: empresaBancoCci,
        empresa_titular: empresaTitular,
      }

      const res = await updateGlobalAjustes(payload)
      if (res.success) {
        alert('Ajustes guardados correctamente.')
        router.refresh()
      } else {
        alert('Error al guardar ajustes.')
      }
    })
  }

  // Add a concept to catalog
  const handleAddConcept = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newConceptNombre.trim()) {
      setConceptError('El nombre del concepto es requerido.')
      return
    }
    const precio = Number(newConceptPrecio || 0)
    if (precio < 0) {
      setConceptError('El precio debe ser un número positivo.')
      return
    }

    setIsAddingConcept(true)
    setConceptError('')
    
    const res = await createConceptoPredefinido(newConceptNombre, precio)
    setIsAddingConcept(false)
    
    if (res.success) {
      setNewConceptNombre('')
      setNewConceptPrecio('')
      router.refresh()
    } else {
      setConceptError(res.error || 'Error al agregar el concepto.')
    }
  }

  // Delete a concept from catalog
  const handleDeleteConcept = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este concepto del catálogo?')) return
    const res = await deleteConceptoPredefinido(id)
    if (res.success) {
      router.refresh()
    } else {
      alert('Error al eliminar el concepto.')
    }
  }

  // Save edited concept
  const handleSaveEditConcept = async (id: number) => {
    if (!editingNombre.trim()) {
      alert('El nombre es requerido.')
      return
    }
    const precio = Number(editingPrecio || 0)
    if (precio < 0) {
      alert('El precio debe ser positivo.')
      return
    }
    
    startTransition(async () => {
      const res = await updateConceptoPredefinido(id, editingNombre, precio)
      if (res.success) {
        setEditingConceptId(null)
        router.refresh()
      } else {
        alert(res.error || 'Error al guardar el concepto.')
      }
    })
  }

  // Start editing mode
  const startEditing = (c: PredefinedConcept) => {
    setEditingConceptId(c.id)
    setEditingNombre(c.nombre)
    setEditingPrecio(String(c.precio_defecto))
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1a120b] via-[#2a1d13] to-[#1a120b] text-gray-100 p-6 md:p-12 font-sans selection:bg-[#c2a077]/30">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-white/10 pb-6">
          <Link href="/servicios" className="group text-[#c2a077]/70 hover:text-[#c2a077] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#c2a077] to-yellow-200">
              Ajustes del Sistema
            </h1>
            <p className="text-[#c2a077]/60 text-sm mt-1">
              Configura tarifas de servicios, datos corporativos para proformas y adicionales comunes.
            </p>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex border-b border-white/5 gap-2">
          <button
            onClick={() => setActiveTab('tarifas')}
            className={`px-4 py-2 text-sm font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'tarifas'
                ? 'border-[#c2a077] text-white bg-white/5'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            💰 Tarifas Globales
          </button>
          <button
            onClick={() => setActiveTab('facturacion')}
            className={`px-4 py-2 text-sm font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'facturacion'
                ? 'border-[#c2a077] text-white bg-white/5'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            🏢 Datos Corporativos
          </button>
          <button
            onClick={() => setActiveTab('conceptos')}
            className={`px-4 py-2 text-sm font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'conceptos'
                ? 'border-[#c2a077] text-white bg-white/5'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            📦 Catálogo de Adicionales
          </button>
        </div>

        {/* Tab 1: Global Rates Form */}
        {activeTab === 'tarifas' && (
          <form onSubmit={handleSaveSettings} className="bg-[#1a120b]/60 backdrop-blur-xl rounded-3xl border border-white/10 p-6 md:p-8 shadow-2xl space-y-6">
            <h3 className="text-lg font-bold text-white mb-4">💰 Tarifas Estándar de Servicios</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Trillado (por KG)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-gray-500 text-sm">S/</span>
                  <input
                    type="number"
                    step="0.01"
                    value={trillado}
                    onChange={(e) => setTrillado(e.target.value)}
                    required
                    className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-[#c2a077]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Selección Verde (por KG)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-gray-500 text-sm">S/</span>
                  <input
                    type="number"
                    step="0.01"
                    value={seleccion}
                    onChange={(e) => setSeleccion(e.target.value)}
                    required
                    className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-[#c2a077]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Tueste (por KG verde)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-gray-500 text-sm">S/</span>
                  <input
                    type="number"
                    step="0.01"
                    value={tueste}
                    onChange={(e) => setTueste(e.target.value)}
                    required
                    className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-[#c2a077]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Molienda (por KG)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-gray-500 text-sm">S/</span>
                  <input
                    type="number"
                    step="0.01"
                    value={molienda}
                    onChange={(e) => setMolienda(e.target.value)}
                    required
                    className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-[#c2a077]"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-400 mb-2">Envasado (por Unidad/Bolsa)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-gray-500 text-sm">S/</span>
                  <input
                    type="number"
                    step="0.01"
                    value={envasado}
                    onChange={(e) => setEnvasado(e.target.value)}
                    required
                    className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-[#c2a077]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isPending}
                className="px-8 py-3 bg-[#c2a077] hover:bg-[#b08f65] text-[#1a120b] font-bold rounded-xl transition-all shadow-lg shadow-[#c2a077]/10 disabled:opacity-50"
              >
                {isPending ? 'Guardando...' : 'Guardar Ajustes'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Billing / Proforma Corporate Header Form */}
        {activeTab === 'facturacion' && (
          <form onSubmit={handleSaveSettings} className="bg-[#1a120b]/60 backdrop-blur-xl rounded-3xl border border-white/10 p-6 md:p-8 shadow-2xl space-y-6">
            <h3 className="text-lg font-bold text-white mb-4">🏢 Datos Corporativos de la Tostaduría</h3>
            <p className="text-xs text-gray-400 -mt-2">Esta información se imprimirá en la cabecera de las proformas oficiales.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Nombre Comercial / Razón Social</label>
                <input
                  type="text"
                  value={empresaNombre}
                  onChange={(e) => setEmpresaNombre(e.target.value)}
                  required
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#c2a077]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">RUC / Identificación Fiscal</label>
                  <input
                    type="text"
                    value={empresaRuc}
                    onChange={(e) => setEmpresaRuc(e.target.value)}
                    required
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#c2a077]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">Teléfono de Contacto</label>
                  <input
                    type="text"
                    value={empresaTelefono}
                    onChange={(e) => setEmpresaTelefono(e.target.value)}
                    required
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#c2a077]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Dirección Fiscal / Establecimiento</label>
                <input
                  type="text"
                  value={empresaDireccion}
                  onChange={(e) => setEmpresaDireccion(e.target.value)}
                  required
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#c2a077]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Correo Electrónico</label>
                <input
                  type="email"
                  value={empresaCorreo}
                  onChange={(e) => setEmpresaCorreo(e.target.value)}
                  required
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#c2a077]"
                />
              </div>

              {/* Payment Methods */}
              <div className="border-t border-white/5 pt-6 mt-4">
                <h4 className="text-md font-bold text-[#c2a077] mb-4">💳 Formas de Pago para Clientes</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">Número de Yape / Plin</label>
                    <input
                      type="text"
                      placeholder="Ej: 987654321"
                      value={empresaYape}
                      onChange={(e) => setEmpresaYape(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#c2a077]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">Nombre del Banco</label>
                    <input
                      type="text"
                      placeholder="Ej: BCP, Interbank..."
                      value={empresaBancoNombre}
                      onChange={(e) => setEmpresaBancoNombre(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#c2a077]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">Número de Cuenta Bancaria</label>
                    <input
                      type="text"
                      placeholder="Ej: 191-xxxxxx-x-xx"
                      value={empresaBancoCuenta}
                      onChange={(e) => setEmpresaBancoCuenta(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#c2a077]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">Código de Cuenta Interbancario (CCI)</label>
                    <input
                      type="text"
                      placeholder="Ej: 002-xxxxxxxxxxxxxxx-xx"
                      value={empresaBancoCci}
                      onChange={(e) => setEmpresaBancoCci(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#c2a077]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-400 mb-2">Titular de la Cuenta Bancaria</label>
                    <input
                      type="text"
                      placeholder="Ej: Wayta Café S.R.L."
                      value={empresaTitular}
                      onChange={(e) => setEmpresaTitular(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#c2a077]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isPending}
                className="px-8 py-3 bg-[#c2a077] hover:bg-[#b08f65] text-[#1a120b] font-bold rounded-xl transition-all shadow-lg shadow-[#c2a077]/10 disabled:opacity-50"
              >
                {isPending ? 'Guardando...' : 'Guardar Ajustes'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Predefined Concepts Management */}
        {activeTab === 'conceptos' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Catalog List */}
            <div className="lg:col-span-2 bg-[#1a120b]/60 backdrop-blur-xl rounded-3xl border border-white/10 p-6 md:p-8 shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-white mb-2">📋 Conceptos Adicionales de Tostaduría</h3>
              <p className="text-xs text-gray-400">Conceptos sugeridos listos para agregar en la creación de proformas.</p>
              
              {conceptos.length === 0 ? (
                <div className="py-8 text-center text-gray-500 border border-dashed border-white/10 rounded-2xl">
                  No hay conceptos registrados en el catálogo.
                </div>
              ) : (
                <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto pr-2">
                  {conceptos.map((c) => {
                    const isEditing = editingConceptId === c.id
                    if (isEditing) {
                      return (
                        <div key={c.id} className="flex items-center justify-between py-2.5 gap-4">
                          <div className="flex-1 flex gap-3">
                            <input
                              type="text"
                              value={editingNombre}
                              onChange={(e) => setEditingNombre(e.target.value)}
                              className="bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-xs text-white uppercase focus:outline-none focus:border-[#c2a077] flex-1"
                            />
                            <div className="relative w-28">
                              <span className="absolute left-2.5 top-1 text-gray-500 text-xs">S/</span>
                              <input
                                type="number"
                                step="0.01"
                                value={editingPrecio}
                                onChange={(e) => setEditingPrecio(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-lg pl-7 pr-2 py-1 text-xs text-white focus:outline-none focus:border-[#c2a077]"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveEditConcept(c.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingConceptId(null)}
                              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-lg border border-white/10 transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div key={c.id} className="flex items-center justify-between py-3 group">
                        <div>
                          <div className="text-sm font-bold text-white uppercase">{c.nombre}</div>
                          <div className="text-xs text-[#c2a077]">Precio base: S/ {c.precio_defecto.toFixed(2)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEditing(c)}
                            className="p-2 bg-white/5 hover:bg-white/10 text-[#c2a077] hover:text-[#b08f65] rounded-lg transition-all text-xs"
                            title="Editar concepto"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteConcept(c.id)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all text-xs"
                            title="Eliminar concepto"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Add New Concept Form */}
            <div className="bg-[#1a120b]/60 backdrop-blur-xl rounded-3xl border border-white/10 p-6 shadow-2xl space-y-4">
              <h4 className="text-md font-bold text-white">➕ Agregar al Catálogo</h4>
              
              <form onSubmit={handleAddConcept} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Nombre del Adicional</label>
                  <input
                    type="text"
                    placeholder="Ej. BOLSA PAPEL CRINKLE"
                    value={newConceptNombre}
                    onChange={(e) => setNewConceptNombre(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c2a077] uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Precio Unitario Sugerido</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500 text-xs">S/</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newConceptPrecio}
                      onChange={(e) => setNewConceptPrecio(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#c2a077]"
                    />
                  </div>
                </div>

                {conceptError && (
                  <div className="text-red-400 text-xs">{conceptError}</div>
                )}

                <button
                  type="submit"
                  disabled={isAddingConcept}
                  className="w-full py-2 bg-[#c2a077] hover:bg-[#b08f65] text-[#1a120b] font-bold rounded-xl transition-all text-xs shadow-md disabled:opacity-50"
                >
                  {isAddingConcept ? 'Agregando...' : 'Añadir Concepto'}
                </button>
              </form>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
