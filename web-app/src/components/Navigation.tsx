'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const links = [
    { href: '/', label: 'Inicio', icon: '🏠' },
    { href: '/servicios', label: 'Órdenes de Servicio', icon: '📋' },
    { href: '/tuestes', label: 'Plan de Tueste', icon: '🔥' },
    { href: '/envasado', label: 'Envasado', icon: '📦' },
    { href: '/despachos', label: 'Despachos', icon: '📤' },
    { href: '/stock', label: 'Control de Stock', icon: '🏭' },
    { href: '/proformas', label: 'Proformas', icon: '📄' },
    { href: '/reportes', label: 'Reportes', icon: '📊' },
    { href: '/catalogos', label: 'Catálogos', icon: '🗂️' },
    { href: '/ajustes', label: 'Tarifas', icon: '💰' },
  ];

  return (
    <>
      {/* TOP BAR */}
      <header className="sticky top-0 z-40 w-full bg-[#1a120b]/85 backdrop-blur-md border-b border-white/10 shadow-lg print:hidden">
        <div className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8">
          
          <div className="flex items-center gap-3">
            {/* Hamburger Button (Mobile & Desktop) */}
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 -ml-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Logo / Brand Name */}
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-xl">☕</span>
              <span className="font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#c2a077] to-yellow-100 group-hover:to-white transition-colors duration-300">
                PANTIWAYTA
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase tracking-widest text-[#c2a077]/70 bg-[#c2a077]/10 px-1.5 py-0.5 rounded border border-[#c2a077]/20 font-semibold font-sans">
                Gestión
              </span>
            </Link>
          </div>
          
          {/* Top Bar Right Side (Empty for now, could be profile/settings) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-mono hidden sm:inline-block">v1.2</span>
          </div>
        </div>
      </header>

      {/* SIDEBAR OVERLAY */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity print:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1a120b]/95 backdrop-blur-xl border-r border-white/10 shadow-2xl transform transition-transform duration-300 ease-in-out print:hidden flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-white/10">
          <span className="font-extrabold tracking-wider text-white">Menú</span>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {links.map((link) => {
            const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? 'bg-[#c2a077]/20 text-[#c2a077] border border-[#c2a077]/30 shadow-sm'
                    : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className="text-lg">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Powered by</span>
            <span className="font-bold text-[#c2a077]">CafeTech</span>
          </div>
        </div>
      </aside>
    </>
  );
}
