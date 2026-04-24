"use client"

import { TrendingUp, DollarSign, TrendingDown, Receipt } from "lucide-react"
import { FunnelChart } from "@/components/charts/funnel-chart"
import { ConversaoMensalChart } from "./conversao-mensal-chart"
import { PropostasTable } from "./propostas-table"
import { KpiCardSmall } from "@/components/cards/kpi-card-small"
import { formatCurrency, formatPercent } from "@/lib/utils/format"

interface FunnelStage {
  label: string
  count: number
  value: number
  color: string
}

interface PropostasContentProps {
  funnelStages: FunnelStage[]
  conversionRates: number[]
  conversaoMensal: { month: string; taxa: number }[]
  kpis: {
    taxaMediaConversao: number
    valorMedioAprovadas: number
    valorMedioRecusadas: number
    ticketMedioGeral: number
  }
  propostas: {
    id: string
    data: string | null
    cliente: string | null
    valor: number | null
    status: string | null
    obraVinculada: string | null
    obraId: number | null
  }[]
}

export function PropostasContent({
  funnelStages,
  conversionRates,
  conversaoMensal,
  kpis,
  propostas,
}: PropostasContentProps) {
  return (
    <div className="space-y-6">
      {/* Section A - Pipeline de Propostas */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Pipeline de Propostas
        </h2>
        <FunnelChart stages={funnelStages} conversionRates={conversionRates} />
      </section>

      {/* Section B - Taxa de Conversao Mensal */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Taxa de Conversao
        </h2>
        <ConversaoMensalChart data={conversaoMensal} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <KpiCardSmall
            title="Taxa Media de Conversao"
            value={formatPercent(kpis.taxaMediaConversao)}
            icon={TrendingUp}
          />
          <KpiCardSmall
            title="Valor Medio Aprovadas"
            value={formatCurrency(kpis.valorMedioAprovadas)}
            icon={DollarSign}
          />
          <KpiCardSmall
            title="Valor Medio Recusadas"
            value={formatCurrency(kpis.valorMedioRecusadas)}
            icon={TrendingDown}
          />
          <KpiCardSmall
            title="Ticket Medio Geral"
            value={formatCurrency(kpis.ticketMedioGeral)}
            icon={Receipt}
          />
        </div>
      </section>

      {/* Section C - Lista de Propostas */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Propostas
        </h2>
        <PropostasTable data={propostas} />
      </section>
    </div>
  )
}
