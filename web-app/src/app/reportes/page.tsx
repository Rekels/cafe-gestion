import { Metadata } from 'next'
import ReportesClient from './ReportesClient'

export const metadata: Metadata = {
  title: 'Reportes | Pantiwayta',
  description: 'Reportes y Resumen de Servicios',
}

export default function ReportesPage() {
  return <ReportesClient />
}
