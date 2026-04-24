"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/tables/data-table"
import { formatCurrency, formatDate } from "@/lib/utils/format"

export interface ParcelaRow {
  numero_parcela: number
  data_vencimento: string | null
  valor_parcela: number
  data_recebimento: string | null
  valor_recebido: number
  juros: number
  desconto: number
  forma_recebimento: string | null
  status: 'Recebido' | 'Parcial' | 'Pendente'
}

const STATUS_STYLES: Record<ParcelaRow['status'], string> = {
  Recebido: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Parcial:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Pendente: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
}

const columns: ColumnDef<ParcelaRow>[] = [
  {
    accessorKey: "numero_parcela",
    header: "Parcela",
    cell: ({ row }) => (
      <span className="font-mono text-sm font-medium text-[var(--text-secondary)]">
        #{String(row.getValue("numero_parcela")).padStart(2, '0')}
      </span>
    ),
  },
  {
    accessorKey: "data_vencimento",
    header: "Vencimento",
    cell: ({ row }) => {
      const val = row.getValue("data_vencimento") as string | null
      return val ? formatDate(val) : <span className="text-[var(--text-secondary)]">—</span>
    },
  },
  {
    accessorKey: "valor_parcela",
    header: "Valor",
    cell: ({ row }) => (
      <span className="font-medium">{formatCurrency(row.getValue("valor_parcela") as number)}</span>
    ),
  },
  {
    accessorKey: "data_recebimento",
    header: "Recebimento",
    cell: ({ row }) => {
      const val = row.getValue("data_recebimento") as string | null
      return val ? formatDate(val) : <span className="text-[var(--text-secondary)]">—</span>
    },
  },
  {
    accessorKey: "valor_recebido",
    header: "Recebido",
    cell: ({ row }) => {
      const val = row.getValue("valor_recebido") as number
      return val > 0
        ? <span className="text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(val)}</span>
        : <span className="text-[var(--text-secondary)]">—</span>
    },
  },
  {
    accessorKey: "juros",
    header: "Juros/Multa",
    cell: ({ row }) => {
      const val = row.getValue("juros") as number
      return val > 0
        ? <span className="text-rose-500 text-sm">{formatCurrency(val)}</span>
        : <span className="text-[var(--text-secondary)] text-sm">—</span>
    },
  },
  {
    accessorKey: "forma_recebimento",
    header: "Forma",
    cell: ({ row }) => {
      const val = row.getValue("forma_recebimento") as string | null
      return val
        ? <span className="text-sm">{val}</span>
        : <span className="text-[var(--text-secondary)] text-sm">—</span>
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as ParcelaRow['status']
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}>
          {status}
        </span>
      )
    },
  },
]

interface ClienteParcelasTableProps {
  data: ParcelaRow[]
}

export function ClienteParcelasTable({ data }: ClienteParcelasTableProps) {
  return <DataTable columns={columns} data={data} />
}
