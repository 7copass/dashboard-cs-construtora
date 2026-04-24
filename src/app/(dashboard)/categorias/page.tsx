import {
  getCategoryEvolution,
  getGastosPorCentroCusto,
  getRateioCustosIndiretos,
  getHeatmapMoM,
} from "@/lib/queries/categorias"
import { StackedArea } from "@/components/charts/stacked-area"
import { HeatmapTable } from "@/components/charts/heatmap-table"
import { CentroCustoBarChart } from "./centro-custo-chart"
import { RateioTable } from "./rateio-table"

interface PageProps {
  searchParams: Promise<{
    dateFrom?: string
    dateTo?: string
    obras?: string
    categorias?: string
  }>
}

export default async function CategoriasPage({ searchParams }: PageProps) {
  const params = await searchParams

  const today = new Date()
  const defaultFrom = new Date(today)
  defaultFrom.setMonth(defaultFrom.getMonth() - 12)
  const defaultTo = new Date(today)

  const dateFrom = params.dateFrom ?? defaultFrom.toISOString().split("T")[0]
  const dateTo = params.dateTo ?? defaultTo.toISOString().split("T")[0]
  const obras = params.obras ? params.obras.split(",") : undefined
  const categorias = params.categorias ? params.categorias.split(",") : undefined

  const filters = { dateFrom, dateTo, obras, categorias }

  const [evolution, gastosCc, rateio, heatmap] = await Promise.all([
    getCategoryEvolution(filters),
    getGastosPorCentroCusto(filters),
    getRateioCustosIndiretos(filters),
    getHeatmapMoM(filters),
  ])

  // Extract data keys from evolution (all keys except 'month')
  const evolutionKeys = evolution.length
    ? [...new Set(evolution.flatMap((r) => Object.keys(r).filter((k) => k !== "month")))]
    : []

  return (
    <div className="space-y-6">
      {/* Section A - Evolucao Mensal por Categoria */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Evolucao Mensal por Categoria
        </h2>
        <StackedArea data={evolution} dataKeys={evolutionKeys} xAxisKey="month" />
      </section>

      {/* Section B - Gastos por Centro de Custo */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Gastos por Centro de Custo
        </h2>
        <CentroCustoBarChart data={gastosCc} />
      </section>

      {/* Section C - Rateio de Custos Indiretos */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Rateio de Custos Indiretos
        </h2>
        <RateioTable data={rateio} />
      </section>

      {/* Section D - Heatmap Comparativo MoM */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Comparativo Mensal (Heatmap)
        </h2>
        <HeatmapTable
          categorias={heatmap.categorias}
          meses={heatmap.meses}
          data={heatmap.data}
          deltas={heatmap.deltas}
        />
      </section>
    </div>
  )
}
