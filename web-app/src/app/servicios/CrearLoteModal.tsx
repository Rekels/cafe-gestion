'use client'

import { useState, useEffect, useTransition } from 'react'
import { createLote, getLoteCreationCatalogs, calculateNextLoteSeq } from '@/app/actions'

export default function CrearLoteModal({
  onClose,
  onSave,
  defaultClienteName
}: {
  onClose: () => void;
  onSave: (lote: any) => void;
  defaultClienteName?: string;
}) {
  const [isPending, startTransition] = useTransition();

  // Catalogs
  const [clientes, setClientes] = useState<any[]>([]);
  const [variedades, setVariedades] = useState<any[]>([]);
  const [procesos, setProcesos] = useState<any[]>([]);
  const [productores, setProductores] = useState<any[]>([]);

  // Selected state
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [selectedVariedadId, setSelectedVariedadId] = useState('');
  const [selectedProcesoId, setSelectedProcesoId] = useState('');
  const [selectedProductorId, setSelectedProductorId] = useState('');

  // Code input state
  const [codigoLote, setCodigoLote] = useState('');
  const [isManualCode, setIsManualCode] = useState(false);

  // Load catalogs on mount
  useEffect(() => {
    async function load() {
      const res = await getLoteCreationCatalogs();
      if (res.success) {
        setClientes(res.clientes || []);
        setVariedades(res.variedades || []);
        setProcesos(res.procesos || []);
        setProductores(res.productores || []);

        if (defaultClienteName) {
          const match = res.clientes?.find(
            (c: any) => c.nombre.toUpperCase().trim() === defaultClienteName.toUpperCase().trim()
          );
          if (match) {
            setSelectedClienteId(String(match.id));
          }
        }
      }
    }
    load();
  }, [defaultClienteName]);

  // Code generation effect
  useEffect(() => {
    if (isManualCode) return;

    const clientObj = clientes.find(c => String(c.id) === selectedClienteId);
    const varObj = variedades.find(v => String(v.id) === selectedVariedadId);
    const procObj = procesos.find(p => String(p.id) === selectedProcesoId);
    const prodObj = productores.find(p => String(p.id) === selectedProductorId);

    const abrVar = varObj?.abreviatura || '';
    const abrProc = procObj?.abreviatura || '';
    const abrProd = prodObj?.abreviatura || '';
    const abrCli = clientObj?.abreviatura || '';

    if (abrVar && abrProc && abrProd && abrCli) {
      const prefix = `${abrVar}-${abrProc}-${abrProd}-${abrCli}`.toUpperCase();
      
      calculateNextLoteSeq(prefix).then(res => {
        if (res.success) {
          setCodigoLote(`${prefix}-${res.seq}`);
        } else {
          setCodigoLote(`${prefix}-1`);
        }
      });
    } else {
      const parts = [
        abrVar || 'VAR',
        abrProc || 'PROC',
        abrProd || 'PROD',
        abrCli || 'CLI'
      ];
      setCodigoLote(parts.join('-').toUpperCase());
    }
  }, [selectedClienteId, selectedVariedadId, selectedProcesoId, selectedProductorId, clientes, variedades, procesos, productores, isManualCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoLote.trim()) {
      alert('El código de lote es requerido.');
      return;
    }

    const clientObj = clientes.find(c => String(c.id) === selectedClienteId);
    const varObj = variedades.find(v => String(v.id) === selectedVariedadId);
    const procObj = procesos.find(p => String(p.id) === selectedProcesoId);
    const prodObj = productores.find(p => String(p.id) === selectedProductorId);

    if (!clientObj || !varObj || !procObj || !prodObj) {
      alert('Por favor selecciona todos los campos requeridos para generar el lote.');
      return;
    }

    const formData = new FormData();
    formData.append('codigo_lote', codigoLote.toUpperCase().trim());
    formData.append('variedad', varObj.nombre);
    formData.append('proceso', procObj.nombre);
    formData.append('productor', prodObj.nombre);
    formData.append('propietario', clientObj.nombre);
    formData.append('cliente_id', String(clientObj.id));

    startTransition(async () => {
      const res = await createLote(formData);
      if (res.success && res.lote) {
        onSave(res.lote);
      } else {
        alert('Error: ' + res.error);
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
      <div className="relative bg-[#1a120b] border border-white/10 rounded-3xl shadow-2xl max-w-lg w-full p-6 md:p-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 className="text-xl font-bold text-[#c2a077] flex items-center gap-2">
            <span>📦</span> Crear Nuevo Lote
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-xl transition-colors">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Dropdown selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Variedad *</label>
              <select
                value={selectedVariedadId}
                onChange={e => setSelectedVariedadId(e.target.value)}
                required
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#c2a077] uppercase"
              >
                <option value="">-- Variedad --</option>
                {variedades.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.nombre} ({v.abreviatura})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Proceso *</label>
              <select
                value={selectedProcesoId}
                onChange={e => setSelectedProcesoId(e.target.value)}
                required
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#c2a077] uppercase"
              >
                <option value="">-- Proceso --</option>
                {procesos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.abreviatura})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Productor *</label>
              <select
                value={selectedProductorId}
                onChange={e => setSelectedProductorId(e.target.value)}
                required
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#c2a077] uppercase"
              >
                <option value="">-- Productor --</option>
                {productores.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.abreviatura})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Propietario / Cliente *</label>
              <select
                value={selectedClienteId}
                onChange={e => setSelectedClienteId(e.target.value)}
                required
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#c2a077] uppercase"
              >
                <option value="">-- Cliente --</option>
                 {clientes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} {c.empresa ? `• ${c.empresa}` : ''} ({c.abreviatura})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Code generation / preview */}
          <div className="bg-black/25 border border-white/5 rounded-2xl p-4 space-y-2.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-[#c2a077] uppercase tracking-wider">
                Código de Lote Auto-generado
              </label>
              {isManualCode && (
                <button
                  type="button"
                  onClick={() => setIsManualCode(false)}
                  className="text-[10px] text-[#c2a077] hover:underline flex items-center gap-1"
                >
                  🔄 Resetear a automático
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={codigoLote}
                onChange={e => {
                  setCodigoLote(e.target.value.toUpperCase().trim());
                  setIsManualCode(true);
                }}
                placeholder="Código de Lote"
                required
                className="w-full bg-black/40 border border-[#c2a077]/40 rounded-xl px-4 py-3 text-lg font-mono font-bold text-white focus:outline-none focus:border-[#c2a077] text-center uppercase tracking-widest"
              />
            </div>
            <p className="text-[11px] text-gray-400 text-center">
              Puedes modificar el código generado de forma manual si es necesario.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-white/10 hover:bg-white/5 text-gray-300 rounded-xl text-xs font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2.5 bg-[#c2a077] hover:bg-[#b08f65] text-[#1a120b] font-bold rounded-xl text-xs transition-all disabled:opacity-50"
            >
              {isPending ? 'Guardando...' : 'Crear Lote ✓'}
            </button>
          </div>

        </form>

      </div>
    </div>
  )
}
