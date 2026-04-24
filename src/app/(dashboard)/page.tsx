import { getMainKPIs, getSecondaryKPIs } from '@/lib/queries/kpis'
import { getCashflowSummary } from '@/lib/queries/fluxo-caixa'
import { getTopObrasByGasto } from '@/lib/queries/obras'
import { getCategoryDistribution } from '@/lib/queries/categorias'
import { getAlerts } from '@/lib/queries/alertas'
import { DashboardContent } from './dashboard-content'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: {
    dateFrom?: string
    dateTo?: string
    obras?: string
    categorias?: string
  }
}

function getDefaultDates() {
  const now = new Date()
  const dateFrom = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10)
  const dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10)
  return { dateFrom, dateTo }
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const defaults = getDefaultDates()

  const filters = {
    dateFrom: searchParams.dateFrom ?? defaults.dateFrom,
    dateTo: searchParams.dateTo ?? defaults.dateTo,
    obras: searchParams.obras ? searchParams.obras.split(',') : undefined,
    categorias: searchParams.categorias ? searchParams.categorias.split(',') : undefined,
  }

  // Fetch all data in parallel
  const [mainKPIs, secondaryKPIs, cashflow, topObras, categories, alerts] =
    await Promise.all([
      getMainKPIs(filters),
      getSecondaryKPIs(filters),
      getCashflowSummary(filters),
      getTopObrasByGasto(filters, 5),
      getCategoryDistribution(filters),
      getAlerts(filters),
    ])

  return (
    <DashboardContent
      mainKPIs={mainKPIs}
      secondaryKPIs={secondaryKPIs}
      cashflow={cashflow}
      topObras={topObras}
      categories={categories}
      alerts={alerts}
    />
  )
}
