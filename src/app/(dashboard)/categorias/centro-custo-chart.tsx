"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { CHART_COLORS } from "@/lib/utils/colors"
import { formatCurrency } from "@/lib/utils/format"

interface CentroCustoData {
  centroCusto: string
  categorias: { nome: string; valor: number }[]
}

interface CentroCustoBarChartProps {
  data: CentroCustoData[]
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border)] p-3 shadow-lg text-sm max-w-xs">
      <p className="font-medium text-[var(--text-primary)] mb-1 truncate">{label}</p>
      {payload
        .filter((e) => e.value > 0)
        .map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[var(--text-secondary)] truncate">{entry.name}:</span>
            <span className="font-medium text-[var(--text-primary)] whitespace-nowrap">
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
    </div>
  )
}

export function CentroCustoBarChart({ data }: CentroCustoBarChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-40 text-[var(--text-secondary)]">
        Sem dados para exibir.
      </div>
    )
  }

  // Get top 5 categories across all centros de custo
  const catTotals = new Map<string, number>()
  for (const cc of data) {
    for (const cat of cc.categorias) {
      catTotals.set(cat.nome, (catTotals.get(cat.nome) ?? 0) + cat.valor)
    }
  }
  const top5Cats = [...catTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nome]) => nome)

  // Transform data for Recharts
  const chartData = data.map((cc) => {
    const row: Record<string, string | number> = { centroCusto: cc.centroCusto }
    for (const catName of top5Cats) {
      const found = cc.categorias.find((c) => c.nome === catName)
      row[catName] = found?.valor ?? 0
    }
    return row
  })

  const dynamicHeight = Math.max(300, data.length * 60)

  return (
    <ResponsiveContainer width="100%" height={dynamicHeight}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          tickFormatter={(v) =>
            v >= 1_000_000
              ? `${(v / 1_000_000).toFixed(1)}M`
              : v >= 1_000
              ? `${(v / 1_000).toFixed(0)}K`
              : String(v)
          }
        />
        <YAxis
          type="category"
          dataKey="centroCusto"
          tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={180}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="bottom"
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
        />
        {top5Cats.map((cat, i) => (
          <Bar
            key={cat}
            dataKey={cat}
            fill={CHART_COLORS[i % CHART_COLORS.length]}
            radius={[0, 4, 4, 0]}
            barSize={14}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
