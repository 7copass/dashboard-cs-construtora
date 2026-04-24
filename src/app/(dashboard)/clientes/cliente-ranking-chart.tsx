"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"
import { formatCurrency } from "@/lib/utils/format"

interface RankingData {
  cliente: string
  faturado: number
  recebido: number
  pendente: number
}

interface ClienteRankingChartProps {
  data: RankingData[]
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
      <p className="font-medium text-[var(--text-primary)] mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.fill }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  )
}

export function ClienteRankingChart({ data }: ClienteRankingChartProps) {
  const chartHeight = Math.max(200, data.length * 40)

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 80, bottom: 0, left: 10 }}
      >
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => formatCurrency(v)}
        />
        <YAxis
          type="category"
          dataKey="cliente"
          width={140}
          tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--bg-card-hover)", opacity: 0.5 }} />
        <Legend
          verticalAlign="top"
          height={36}
          formatter={(value: string) => (
            <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{value}</span>
          )}
        />
        <Bar
          dataKey="recebido"
          name="Recebido"
          stackId="a"
          fill="#22C55E"
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="pendente"
          name="Pendente"
          stackId="a"
          fill="#F59E0B"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
