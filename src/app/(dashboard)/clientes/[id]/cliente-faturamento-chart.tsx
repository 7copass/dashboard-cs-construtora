"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts"
import { formatCurrency } from "@/lib/utils/format"

interface FaturamentoPoint {
  data: string
  valor: number
}

interface ClienteFaturamentoChartProps {
  data: FaturamentoPoint[]
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
  label?: string
}) {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border)] p-3 shadow-lg text-sm">
      <p className="text-[var(--text-secondary)] mb-1">{label}</p>
      <p className="font-medium text-[var(--text-primary)]">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  )
}

export function ClienteFaturamentoChart({ data }: ClienteFaturamentoChartProps) {
  // Aggregate by date in case of multiple faturamentos on same date
  const aggregated = new Map<string, number>()
  for (const d of data) {
    const dateKey = d.data.slice(0, 10)
    aggregated.set(dateKey, (aggregated.get(dateKey) ?? 0) + d.valor)
  }

  const chartData = Array.from(aggregated.entries())
    .map(([data, valor]) => ({ data, valor }))
    .sort((a, b) => a.data.localeCompare(b.data))

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart
        data={chartData}
        margin={{ top: 10, right: 20, bottom: 10, left: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="data"
          tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: string) => {
            const d = new Date(v + 'T00:00:00')
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`
          }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => formatCurrency(v)}
          width={100}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="valor"
          stroke="#3B82F6"
          strokeWidth={2}
          dot={{ fill: "#3B82F6", r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
