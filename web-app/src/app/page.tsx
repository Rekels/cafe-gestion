import { Metadata } from 'next'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Inicio | Pantiwayta',
  description: 'Dashboard principal del sistema',
}

export default function Home() {
  return (
    <DashboardClient />
  )
}
