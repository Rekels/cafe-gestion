'use client'

import { useState, useTransition } from 'react'
import { saveOrdenEnvasado, completeOrdenEnvasado } from './envasadoActions'
import type { OrdenEnvasadoData, OrdenEnvasadoDetalle, PaqueteEnvio } from './envasadoActions'

interface FaseEnvasadoManagerProps {
  servicioId: number
  lotes: any[]
  bolsas: any[]
  ordenEnvasado: any | null
  paquetesEnvasado: any[]
  detallesEnvasado: any[]
}

export default function FaseEnvasadoManager({
  servicioId,
  lotes,
  bolsas,
  ordenEnvasado,
  paquetesEnvasado,
  detallesEnvasado
}: FaseEnvasadoManagerProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  
  const isCompleted = ordenEnvasado?.estado === 'Completado'

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(!ordenEnvasado || !isCompleted)
  
  const [detalles, setDetalles] = useState<OrdenEnvasadoDetalle[]>(
    detallesEnvasado.map(d => ({
      ...d,
      tempPaqueteId: d.paquete_envio_id ? String(d.paquete_envio_id) : null
    }))
  )
  
  const [paquetes, setPaquetes] = useState<PaqueteEnvio[]>(
    paquetesEnvasado.map(p => ({
      ...p,
      tempId: String(p.id)
    }))
  )

  const [estado, setEstado] = useState(ordenEnvasado?.estado || 'Planeado')
  const [notas, setNotas] = useState(ordenEnvasado?.notas || '')

  function handleAddPaquete() {
    const tempId = `temp_${Date.now()}`
    setPaquetes([...paquetes, { nombre_paquete: `Caja ${paquetes.length + 1}`, notas: '', tempId }])
  }

  function handleAddDetalle() {
    setDetalles([...detalles, { 
      bolsa_id: bolsas[0]?.id || 0, 
      lote_id: lotes[0]?.id || 0,
      estado_grano: 'tostado', 
      cantidad_bolsas: 1, 
      destino_al_completar: 'almacen',
      tempPaqueteId: null
    }])
  }

  function removeDetalle(index: number) {
    setDetalles(detalles.filter((_, i) => i !== index))
  }

  function removePaquete(tempId: string) {
    setPaquetes(paquetes.filter(p => p.tempId !== tempId))
    setDetalles(detalles.map(d => d.tempPaqueteId === tempId ? { ...d, tempPaqueteId: null } : d))
  }

  async function handleSave() {
    if (detalles.length === 0) {
      setError('Debe añadir al menos un detalle de envasado.')
      return
    }

    const isCompletingNow = estado === 'Completado' && ordenEnvasado?.estado !== 'Completado';

    const data: OrdenEnvasadoData = {
      id: ordenEnvasado?.id,
      servicio_id: servicioId,
      estado: isCompletingNow ? (ordenEnvasado?.estado || 'Planeado') : estado,
      notas,
      paquetes,
      detalles
    }

    setError(null)
    startTransition(async () => {
      const res = await saveOrdenEnvasado(data)
      if (!res.success) {
        setError(res.error || 'Error al guardar')
        return
      }
      
      const realId = res.ordenId || ordenEnvasado?.id;

      if (isCompletingNow) {
        if (confirm('Al cambiar a Completado se descontará el stock de café y bolsas. ¿Desea proceder?')) {
          const compRes = await completeOrdenEnvasado(realId)
          if (!compRes.success) {
            setError(compRes.error || 'Error al completar')
          } else {
            alert('Orden guardada y completada exitosamente.')
            setIsEditing(false)
          }
        } else {
          setEstado(ordenEnvasado?.estado || 'Planeado')
          alert('Orden guardada sin completar.')
          setIsEditing(false)
        }
      } else {
        alert('Orden guardada correctamente.')
        setIsEditing(false)
      }
    })
  }

  async function handleComplete() {
    if (!ordenEnvasado?.id) {
      setError('Guarde la orden primero.')
      return
    }

    if (!confirm('¿Marcar como completado? Esto descontará el stock de café y de bolsas.')) return

    startTransition(async () => {
      const res = await completeOrdenEnvasado(ordenEnvasado.id)
      if (!res.success) {
        setError(res.error || 'Error al completar')
      } else {
        alert('Orden Completada exitosamente')
      }
    })
  }

  function handlePrint() {
    window.print()
  }

  function handleWhatsApp() {
    let msg = `📦 *ORDEN DE ENVASADO ${ordenEnvasado?.id ? '#ENV-'+ordenEnvasado.id : 'NUEVA'}*\n`
    msg += `Fecha: ${new Date().toLocaleDateString('es-PE')}\n\n`
    
    // Group details by packages, and then unassigned
    const unassigned = detalles.filter(d => !d.tempPaqueteId && !d.paquete_envio_id)
    
    paquetes.forEach((p, idx) => {
      msg += `*PAQUETE ${idx + 1}: ${p.nombre_paquete}*\n`
      if (p.notas) msg += `_Nota: ${p.notas}_\n`
      const assigned = detalles.filter(d => d.tempPaqueteId === p.tempId || (d.paquete_envio_id === p.id && p.id))
      assigned.forEach(d => {
        const bolsa = bolsas.find(b => b.id === d.bolsa_id)
        const lote = lotes.find(l => l.id === d.lote_id)
        const variedad = lote?.variedad || 'N/A'
        const proceso = lote?.proceso || 'N/A'
        const productor = lote?.productor_nombre || 'Desconocido'
        msg += `- ${d.cantidad_bolsas}x Bolsas ${bolsa?.capacidad_g}g (${d.estado_grano}) - Lote: ${lote?.codigo_lote} | Var: ${variedad} | Proc: ${proceso} | Prod: ${productor}\n`
      })
      msg += `\n`
    })

    if (unassigned.length > 0) {
      msg += `*BOLSAS SUELTAS*\n`
      unassigned.forEach(d => {
        const bolsa = bolsas.find(b => b.id === d.bolsa_id)
        const lote = lotes.find(l => l.id === d.lote_id)
        const variedad = d.variedad || lote?.variedad || 'N/A' // Fallbacks to d.variedad if already fetched in getOrdenEnvasadoById
        const proceso = d.proceso || lote?.proceso || 'N/A'
        const productor = d.productor_nombre || lote?.productor_nombre || 'Desconocido'
        msg += `- ${d.cantidad_bolsas}x Bolsas ${bolsa?.capacidad_g}g (${d.estado_grano}) - Lote: ${d.codigo_lote || lote?.codigo_lote} | Var: ${variedad} | Proc: ${proceso} | Prod: ${productor}\n`
      })
      msg += `\n`
    }

    if (notas) {
      msg += `*Notas Generales:*\n${notas}`
    }

    const waLink = `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(waLink, '_blank')
  }

  return (
    <div className="bg-[#1a120b] border border-[#c2a077]/30 rounded-3xl p-6 md:p-8 mt-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-[#c2a077] flex items-center gap-2">
            <span>📦</span> Requerimiento de Envasado
          </h2>
          <p className="text-gray-400 text-sm mt-1">Estructura las instrucciones de embolsado y armando de encomiendas.</p>
        </div>
        <div className="flex gap-2">
          {isCompleted && (
            <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold rounded-lg text-sm flex items-center">
              ✅ Completado
            </span>
          )}
          <button onClick={handleWhatsApp} className="px-4 py-2 bg-green-500/20 hover:bg-green-500/40 text-green-400 rounded-lg font-bold transition-colors text-sm border border-green-500/30 print:hidden">
            📱 WhatsApp
          </button>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-colors text-sm border border-white/10 print:hidden">
              ✏️ Editar
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Estado</label>
          {isEditing ? (
            <select value={estado} onChange={e => setEstado(e.target.value)} className="w-full max-w-xs bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#c2a077]">
              <option value="Planeado" className="bg-black text-white">Planeado</option>
              <option value="Completado" className="bg-black text-white">Completado</option>
              <option value="Entregado" className="bg-black text-white">Entregado</option>
            </select>
          ) : (
            <span className="font-bold text-white">{estado}</span>
          )}
        </div>
        <div className="w-full">
          <label className="block text-xs text-gray-500 mb-1">Notas Generales</label>
          {isEditing ? (
            <textarea value={notas} onChange={e => setNotas(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#c2a077]" rows={2} />
          ) : (
            <p className="text-sm text-gray-300">{notas || '-'}</p>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-sm">
          {error}
        </div>
      )}

      {isEditing && !isCompleted ? (
        <div className="space-y-8">
          {/* Detalles de Envasado */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">1. ¿Qué vamos a embolsar?</h3>
              <button onClick={handleAddDetalle} className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors">
                + Añadir Bolsa
              </button>
            </div>
            
            <div className="space-y-3">
              {detalles.map((d, index) => (
                <div key={index} className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-black/30 p-3 rounded-xl border border-white/5">
                  <div className="w-full md:w-32">
                    <label className="block text-[10px] text-gray-500 mb-1">Cant. Bolsas</label>
                    <input type="number" min="1" value={d.cantidad_bolsas} onChange={e => {
                      const newD = [...detalles]; newD[index].cantidad_bolsas = Number(e.target.value); setDetalles(newD);
                    }} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077]" />
                  </div>
                  
                  <div className="w-full md:flex-1">
                    <label className="block text-[10px] text-gray-500 mb-1">Lote Origen</label>
                    <select value={d.lote_id} onChange={e => {
                      const newD = [...detalles]; newD[index].lote_id = Number(e.target.value); setDetalles(newD);
                    }} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077]">
                      {lotes.map(l => <option key={l.id} value={l.id}>{l.codigo_lote}</option>)}
                    </select>
                  </div>

                  <div className="w-full md:w-1/4">
                    <label className="block text-[10px] text-gray-500 mb-1">Tipo de Empaque</label>
                    <select value={d.bolsa_id} onChange={e => {
                      const newD = [...detalles]; newD[index].bolsa_id = Number(e.target.value); setDetalles(newD);
                    }} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077]">
                      {bolsas.map(b => <option key={b.id} value={b.id}>{b.nombre} ({b.capacidad_g}g)</option>)}
                    </select>
                  </div>

                  <div className="w-full md:w-40">
                    <label className="block text-[10px] text-gray-500 mb-1">Estado del Café</label>
                    <select value={d.estado_grano} onChange={e => {
                      const newD = [...detalles]; newD[index].estado_grano = e.target.value; setDetalles(newD);
                    }} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c2a077]">
                      <option value="tostado">Tostado</option>
                      <option value="molido">Molido</option>
                      <option value="oro verde">Oro Verde</option>
                      <option value="oro verde seleccionado">Oro Verde Seleccionado</option>
                      <option value="pergamino">Pergamino</option>
                    </select>
                  </div>

                  <div className="w-full md:w-48">
                    <label className="block text-[10px] text-gray-500 mb-1">Destino al Completar</label>
                    <select value={d.destino_al_completar} onChange={e => {
                      const newD = [...detalles]; newD[index].destino_al_completar = e.target.value; setDetalles(newD);
                    }} className="w-full bg-[#c2a077]/10 text-[#c2a077] border border-[#c2a077]/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c2a077]">
                      <option value="almacen">Guardar en Almacén</option>
                      <option value="despacho">Despacho Inmediato</option>
                    </select>
                  </div>

                  <button onClick={() => removeDetalle(index)} className="mt-4 md:mt-0 p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg shrink-0">
                    🗑️
                  </button>
                </div>
              ))}
              {detalles.length === 0 && <p className="text-sm text-gray-500 italic">No se han añadido bolsas.</p>}
            </div>
          </div>

          {/* Cajas / Paquetes */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">2. Paquetes y Encomiendas (Opcional)</h3>
              <button onClick={handleAddPaquete} className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors">
                + Añadir Caja
              </button>
            </div>
            
            {paquetes.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {paquetes.map((p) => (
                  <div key={p.tempId} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3">
                      <input type="text" value={p.nombre_paquete} onChange={e => {
                        const newP = [...paquetes];
                        const idx = newP.findIndex(x => x.tempId === p.tempId);
                        newP[idx].nombre_paquete = e.target.value;
                        setPaquetes(newP);
                      }} className="bg-transparent text-white font-bold border-b border-dashed border-white/30 focus:outline-none focus:border-[#c2a077]" />
                      <button onClick={() => removePaquete(p.tempId!)} className="text-xs text-red-400 hover:text-red-300">Quitar</button>
                    </div>
                    <input type="text" placeholder="Notas de envío..." value={p.notas || ''} onChange={e => {
                      const newP = [...paquetes];
                      const idx = newP.findIndex(x => x.tempId === p.tempId);
                      newP[idx].notas = e.target.value;
                      setPaquetes(newP);
                    }} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white mb-3" />
                    
                    {/* Asignar bolsas a esta caja */}
                    <div className="text-xs text-gray-400 mb-2">Asignar bolsas a este paquete:</div>
                    <div className="flex flex-col gap-2">
                      {detalles.map((d, index) => {
                        const bolsa = bolsas.find(b => b.id === d.bolsa_id);
                        return (
                          <label key={index} className="flex items-center gap-2 text-sm text-gray-300">
                            <input 
                              type="checkbox" 
                              checked={d.tempPaqueteId === p.tempId}
                              onChange={e => {
                                const newD = [...detalles];
                                if (e.target.checked) newD[index].tempPaqueteId = p.tempId;
                                else newD[index].tempPaqueteId = null;
                                setDetalles(newD);
                              }}
                              className="rounded bg-black/50 border-white/20 text-[#c2a077] focus:ring-0"
                            />
                            {d.cantidad_bolsas}x {bolsa?.nombre} ({bolsa?.capacidad_g}g) - {d.estado_grano}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {paquetes.length === 0 && <p className="text-sm text-gray-500 italic">No hay cajas de envío. (Solo se entregarán las bolsas sueltas)</p>}
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
            <button onClick={handleSave} disabled={isPending} className="px-6 py-2.5 bg-[#c2a077] hover:bg-[#b08f65] text-[#1a120b] font-bold rounded-xl transition-all disabled:opacity-50 text-sm">
              {isPending ? 'Guardando...' : 'Guardar Instrucciones'}
            </button>
          </div>
        </div>
      ) : (
        /* READ-ONLY / PRINT VIEW */
        <div className="space-y-6 text-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 print:bg-white print:border-black print:text-black">
              <h3 className="font-bold text-[#c2a077] print:text-black mb-4 uppercase text-xs tracking-widest">Resumen de Bolsas</h3>
              <ul className="space-y-3">
                {detalles.map((d, idx) => {
                  const bolsa = bolsas.find(b => b.id === d.bolsa_id);
                  const lote = lotes.find(l => l.id === d.lote_id) || d; // Use d directly if it has fetched attributes from getOrdenEnvasadoById
                  return (
                    <li key={idx} className="flex justify-between items-center border-b border-white/5 print:border-black/10 pb-2">
                      <div>
                        <div className="font-bold">{d.cantidad_bolsas}x {bolsa?.nombre} <span className="text-[#c2a077] ml-2">[{lote?.codigo_lote}]</span></div>
                        <div className="text-xs text-gray-400 print:text-gray-600">
                          {d.estado_grano} | Var: {lote?.variedad || 'N/A'} | Prod: {lote?.productor_nombre || 'N/A'}
                        </div>
                      </div>
                      <div className="text-xs">
                        {d.destino_al_completar === 'almacen' ? <span className="text-emerald-400 print:text-black font-semibold">→ Almacén</span> : <span className="text-blue-400 print:text-black font-semibold">→ Despacho Rápido</span>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>

            {paquetes.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 print:bg-white print:border-black print:text-black">
                <h3 className="font-bold text-[#c2a077] print:text-black mb-4 uppercase text-xs tracking-widest">Instrucciones de Empaquetado</h3>
                <ul className="space-y-4">
                  {paquetes.map((p, idx) => {
                    const assignedDetails = detalles.filter(d => (d.tempPaqueteId === p.tempId) || (d.paquete_envio_id === p.id && p.id));
                    return (
                      <li key={idx} className="bg-black/30 print:bg-gray-100 p-3 rounded-lg border border-white/5 print:border-none">
                        <div className="font-bold mb-1">{p.nombre_paquete}</div>
                        {p.notas && <div className="text-xs text-gray-400 print:text-gray-600 mb-2 italic">Nota: {p.notas}</div>}
                        <div className="text-xs text-gray-300 print:text-black">
                          <strong>Contenido:</strong>
                          <ul className="list-disc ml-4 mt-1">
                            {assignedDetails.map((ad, i) => {
                              const b = bolsas.find(x => x.id === ad.bolsa_id);
                              return <li key={i}>{ad.cantidad_bolsas}x {b?.nombre}</li>
                            })}
                            {assignedDetails.length === 0 && <li className="text-red-400">Sin bolsas asignadas</li>}
                          </ul>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>

          {!isCompleted && !isEditing && (
            <div className="pt-6 border-t border-white/10 flex justify-end print:hidden">
              <button onClick={handleComplete} disabled={isPending} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 text-sm shadow-lg shadow-emerald-900/20">
                {isPending ? 'Completando...' : '✅ Marcar Orden de Envasado como Completada'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
