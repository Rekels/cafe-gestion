'use client'

import { usePathname } from 'next/navigation'

export default function Header({ title, icon }: { title: string, icon?: string }) {
  return (
    <header className="bg-[#1a120b] border-b border-white/10 px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        {icon && <span className="text-2xl">{icon}</span>}
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          {title}
        </h1>
      </div>
    </header>
  )
}
