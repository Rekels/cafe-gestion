'use client'

import { useState, useEffect } from 'react'
import { getDashboardData, DashboardData } from './dashboardActions'
import DatePicker from 'react-datepicker'
import { format, subDays } from 'date-fns'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [fechaInicio, setFechaInicio] = useState<Date>(subDays(new Date(), 7))
  const [fechaFin, setFechaFin] = useState<Date>(new Date())

  const setPreset = (days: number) => {
    setFechaFin(new Date());
    setFechaInicio(subDays(new Date(), days));
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await getDashboardData(format(fechaInicio, 'yyyy-MM-dd'), format(fechaFin, 'yyyy-MM-dd'))
        setData(result)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [fechaInicio, fechaFin])

  const formatCurrency = (val: number) => `S/ ${val.toFixed(2)}`

  return (
    <div className="p-6 max-w-[1600px] mx-auto min-h-screen">
      {/* Header and Filters */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Dashboard General</h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setPreset(0)} className="px-3 py-1.5 text-sm bg-black/30 hover:bg-white/10 text-gray-300 rounded-lg transition border border-white/10">Hoy</button>
          <button onClick={() => setPreset(1)} className="px-3 py-1.5 text-sm bg-black/30 hover:bg-white/10 text-gray-300 rounded-lg transition border border-white/10">Ayer</button>
          <button onClick={() => setPreset(7)} className="px-3 py-1.5 text-sm bg-emerald-500/20 text-emerald-400 rounded-lg transition border border-emerald-500/30 font-medium">Últimos 7 días</button>
          <button onClick={() => setPreset(15)} className="px-3 py-1.5 text-sm bg-black/30 hover:bg-white/10 text-gray-300 rounded-lg transition border border-white/10">Últimos 15 días</button>
          
          <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg border border-white/10">
            <DatePicker
              selected={fechaInicio}
              onChange={(date: Date | null) => date && setFechaInicio(date)}
              dateFormat="dd/MM/yyyy"
              className="bg-transparent text-sm text-white w-24 outline-none cursor-pointer"
            />
            <span className="text-gray-500">-</span>
            <DatePicker
              selected={fechaFin}
              onChange={(date: Date | null) => date && setFechaFin(date)}
              dateFormat="dd/MM/yyyy"
              className="bg-transparent text-sm text-white w-24 outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 text-[#c2a077]">
          <div className="w-8 h-8 border-4 border-[#c2a077] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl">{error}</div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Ventas Totales */}
          <div className="bg-[#1a120b]/80 border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-gray-400 text-sm font-medium">Ventas totales</h2>
                <div className="text-4xl font-black text-white mt-1">{formatCurrency(data.ventasTotales)}</div>
              </div>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.ventasPorDia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `\${val}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a120b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ticket Promedio */}
          <div className="bg-[#1a120b]/80 border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-gray-400 text-sm font-medium">Ticket promedio</h2>
                <div className="text-4xl font-black text-white mt-1">{formatCurrency(data.ticketPromedio)}</div>
              </div>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.ticketPorDia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a120b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  />
                  <Bar dataKey="promedio" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Productos más vendidos */}
          <div className="bg-[#1a120b]/80 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center">
            <div className="w-full md:w-1/2 mb-4 md:mb-0">
              <h2 className="text-gray-400 text-sm font-medium mb-4">Productos más vendidos</h2>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.productosMasVendidos} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {data.productosMasVendidos.map((entry, index) => (
                        <Cell key={`prod-cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1a120b', borderColor: 'rgba(255,255,255,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="w-full md:w-1/2 space-y-3">
              {data.productosMasVendidos.length === 0 ? <p className="text-gray-500 text-sm">No hay datos</p> : null}
              {data.productosMasVendidos.map((prod, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                    <span className="text-gray-300 truncate">{prod.name}</span>
                  </div>
                  <span className="text-white font-mono ml-2">{formatCurrency(prod.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Estado de Proformas */}
          <div className="bg-[#1a120b]/80 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center">
            <div className="w-full md:w-1/2 mb-4 md:mb-0">
              <h2 className="text-gray-400 text-sm font-medium mb-4">Estado de Proformas</h2>
              <div className="text-3xl font-bold text-white mb-2">{formatCurrency(data.ventasTotales)}</div>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.estadoProformas} innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                      {data.estadoProformas.map((entry, index) => (
                        <Cell key={`estado-cell-${entry.name}-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1a120b', borderColor: 'rgba(255,255,255,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="w-full md:w-1/2 space-y-3">
              {data.estadoProformas.length === 0 ? <p className="text-gray-500 text-sm">No hay datos</p> : null}
              {data.estadoProformas.map((st, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[(idx + 4) % COLORS.length] }}></span>
                    <span className="text-gray-300 capitalize">{st.name.toLowerCase()}</span>
                  </div>
                  <span className="text-white font-mono">{formatCurrency(st.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Categorías más vendidas */}
          <div className="bg-[#1a120b]/80 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center">
            <div className="w-full md:w-1/2 mb-4 md:mb-0">
              <h2 className="text-gray-400 text-sm font-medium mb-4">Categorías más vendidas</h2>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.categoriasMasVendidas} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {data.categoriasMasVendidas.map((entry, index) => (
                        <Cell key={`cat-cell-${entry.name}-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1a120b', borderColor: 'rgba(255,255,255,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="w-full md:w-1/2 space-y-3">
              {data.categoriasMasVendidas.length === 0 ? <p className="text-gray-500 text-sm">No hay datos</p> : null}
              {data.categoriasMasVendidas.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[(idx + 2) % COLORS.length] }}></span>
                    <span className="text-gray-300 truncate">{cat.name}</span>
                  </div>
                  <span className="text-white font-mono ml-2">{formatCurrency(cat.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top clientes */}
          <div className="bg-[#1a120b]/80 border border-white/10 rounded-2xl p-6 shadow-xl">
            <h2 className="text-gray-400 text-sm font-medium mb-6">Top clientes</h2>
            <div className="space-y-4">
              {data.topClientes.length === 0 ? <p className="text-gray-500 text-sm">No hay datos</p> : null}
              {data.topClientes.map((client, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#c2a077]/20 text-[#c2a077] flex items-center justify-center font-bold text-lg">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-gray-200 font-medium">{client.name}</div>
                    </div>
                  </div>
                  <div className="text-white font-mono font-bold text-lg">
                    {formatCurrency(client.total)}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      ) : null}
    </div>
  )
}
