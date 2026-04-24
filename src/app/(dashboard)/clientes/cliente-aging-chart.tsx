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

interface AgingData {
  cliente: string
  emDia: number
  ate30: number
  ate60: number
  ate90: number
  mais90: number
}

interface ClienteAgingChartProps {
  data: AgingData[]
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

export function ClienteAgingChart({ data }: ClienteAgingChartProps) {
  const chartHeight = Math.max(300, data.length > 6 ? 400 : 300)

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={data}
        margin={{ top: 0, right: 20, bottom: 0, left: 10 }}
      >
        <XAxis
          dataKey="cliente"
          tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
          axisLine={false}
          tickLine={false}
          interval={0}
          angle={data.length > 5 ? -25 : 0}
          textAnchor={data.length > 5 ? "end" : "middle"}
          height={data.length > 5 ? 80 : 40}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => formatCurrency(v)}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--bg-card-hover)", opacity: 0.5 }} />
        <Legend
          verticalAlign="top"
          height={36}
          formatter={(value: string) => (
            <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{value}</span>
          )}
        />
        <Bar dataKey="emDia" name="Em dia" stackId="a" fill="#22C55E" />
        <Bar dataKey="ate30" name="1-30 dias" stackId="a" fill="#F59E0B" />
        <Bar dataKey="ate60" name="31-60 dias" stackId="a" fill="#F97316" />
        <Bar dataKey="ate90" name="61-90 dias" stackId="a" fill="#EF4444" />
        <Bar dataKey="mais90" name="90+ dias" stackId="a" fill="#991B1B" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
