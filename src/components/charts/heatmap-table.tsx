"use client"

import { formatCurrency } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

interface HeatmapTableProps {
  categorias: string[]
  meses: string[]
  data: Record<string, Record<string, number>>
  deltas: Record<string, number>
}

function getCellColor(value: number, max: number): string {
  if (max === 0) return "bg-gray-100 dark:bg-gray-800"
  const ratio = value / max

  if (ratio <= 0.3) return "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-300"
  if (ratio <= 0.6) return "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300"
  return "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-300"
}

function formatMonth(month: string): string {
  const [year, m] = month.split("-")
  const names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
  return `${names[parseInt(m, 10) - 1]}/${year.slice(2)}`
}

export function HeatmapTable({ categorias, meses, data, deltas }: HeatmapTableProps) {
  if (!categorias.length || !meses.length) {
    return (
      <div className="flex items-center justify-center h-40 text-[var(--text-secondary)]">
        Sem dados para exibir.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left p-2 font-medium text-[var(--text-secondary)] border-b border-[var(--border)] bg-[var(--bg-card)] sticky left-0 z-10 min-w-[180px]">
              Categoria
            </th>
            {meses.map((month) => (
              <th
                key={month}
                className="text-right p-2 font-medium text-[var(--text-secondary)] border-b border-[var(--border)] bg-[var(--bg-card)] min-w-[110px]"
              >
                {formatMonth(month)}
              </th>
            ))}
            <th className="text-right p-2 font-medium text-[var(--text-secondary)] border-b border-[var(--border)] bg-[var(--bg-card)] min-w-[80px]">
              &Delta;%
            </th>
          </tr>
        </thead>
        <tbody>
          {categorias.map((cat) => {
            const rowValues = meses.map((m) => data[cat]?.[m] ?? 0)
            const maxVal = Math.max(...rowValues)
            const delta = deltas[cat] ?? 0

            return (
              <tr key={cat} className="border-b border-[var(--border)] last:border-b-0">
                <td className="p-2 font-medium text-[var(--text-primary)] bg-[var(--bg-card)] sticky left-0 z-10 truncate max-w-[220px]">
                  {cat}
                </td>
                {meses.map((month) => {
                  const value = data[cat]?.[month] ?? 0
                  return (
                    <td
                      key={month}
                      className={cn(
                        "p-2 text-right font-mono text-xs",
                        getCellColor(value, maxVal)
                      )}
                    >
                      {formatCurrency(value)}
                    </td>
                  )
                })}
                <td
                  className={cn(
                    "p-2 text-right font-mono text-xs font-semibold",
                    delta < 0
                      ? "text-green-600 dark:text-green-400"
                      : delta > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-[var(--text-secondary)]"
                  )}
                >
                  {delta > 0 ? "+" : ""}
                  {delta.toFixed(1).replace(".", ",")}%
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
