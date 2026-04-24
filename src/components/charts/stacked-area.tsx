"use client"

import { useState } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { CHART_COLORS } from "@/lib/utils/colors"
import { formatCurrency } from "@/lib/utils/format"

interface StackedAreaProps {
  data: Record<string, string | number>[]
  dataKeys: string[]
  xAxisKey: string
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
    <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border)] p-3 shadow-lg text-sm">
      <p className="font-medium text-[var(--text-primary)] mb-1">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[var(--text-secondary)]">{entry.name}:</span>
          <span className="font-medium text-[var(--text-primary)]">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function StackedArea({ data, dataKeys, xAxisKey }: StackedAreaProps) {
  const [mode, setMode] = useState<"stacked" | "lines">("stacked")

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[350px] text-[var(--text-secondary)]">
        Sem dados para exibir.
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <div className="inline-flex rounded-lg border border-[var(--border)] overflow-hidden text-sm">
          <button
            className={`px-3 py-1.5 transition-colors ${
              mode === "stacked"
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-page)]"
            }`}
            onClick={() => setMode("stacked")}
          >
            Empilhado
          </button>
          <button
            className={`px-3 py-1.5 transition-colors ${
              mode === "lines"
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-page)]"
            }`}
            onClick={() => setMode("lines")}
          >
            Linhas
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey={xAxisKey}
            tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) =>
              v >= 1_000_000
                ? `${(v / 1_000_000).toFixed(1)}M`
                : v >= 1_000
                ? `${(v / 1_000).toFixed(0)}K`
                : String(v)
            }
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          />
          {dataKeys.map((key, i) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stackId={mode === "stacked" ? "1" : undefined}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              fillOpacity={mode === "stacked" ? 0.6 : 0.1}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
