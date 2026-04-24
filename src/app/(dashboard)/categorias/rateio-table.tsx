"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/tables/data-table"
import { formatCurrency, formatPercent } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

interface RateioRow {
  obra: string
  custoDireto: number
  custoIndiretoRateado: number
  custoTotal: number
  percentualTotal: number
  margemLiquidaReal: number
}

const columns: ColumnDef<RateioRow, unknown>[] = [
  {
    accessorKey: "obra",
    header: "Obra",
    cell: ({ row }) => (
      <span className="font-medium text-[var(--text-primary)]">
        {row.getValue("obra")}
      </span>
    ),
  },
  {
    accessorKey: "custoDireto",
    header: "Custo Direto",
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {formatCurrency(row.getValue("custoDireto"))}
      </span>
    ),
  },
  {
    accessorKey: "custoIndiretoRateado",
    header: "Custo Indireto Rateado",
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {formatCurrency(row.getValue("custoIndiretoRateado"))}
      </span>
    ),
  },
  {
    accessorKey: "custoTotal",
    header: "Custo Total",
    cell: ({ row }) => (
      <span className="font-mono text-sm font-semibold">
        {formatCurrency(row.getValue("custoTotal"))}
      </span>
    ),
  },
  {
    accessorKey: "percentualTotal",
    header: "% do Total",
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {formatPercent(row.getValue("percentualTotal"))}
      </span>
    ),
  },
  {
    accessorKey: "margemLiquidaReal",
    header: "Margem Liquida Real",
    cell: ({ row }) => {
      const value = row.getValue("margemLiquidaReal") as number
      return (
        <span
          className={cn(
            "font-mono text-sm font-semibold",
            value >= 0
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          )}
        >
          {formatPercent(value)}
        </span>
      )
    },
  },
]

interface RateioTableProps {
  data: RateioRow[]
}

export function RateioTable({ data }: RateioTableProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-40 text-[var(--text-secondary)]">
        Sem dados para exibir.
      </div>
    )
  }

  return <DataTable columns={columns} data={data} searchKey="obra" />
}
