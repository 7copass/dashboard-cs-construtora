"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/tables/data-table"
import { formatCurrency, formatDate } from "@/lib/utils/format"

interface Recebimento {
  data: string
  valor: number
  forma_pagamento: string
  obra: string
}

const columns: ColumnDef<Recebimento>[] = [
  {
    accessorKey: "data",
    header: "Data",
    cell: ({ row }) => {
      const val = row.getValue("data") as string
      try {
        return formatDate(val)
      } catch {
        return val
      }
    },
  },
  {
    accessorKey: "valor",
    header: "Valor",
    cell: ({ row }) => formatCurrency(row.getValue("valor") as number),
  },
  {
    accessorKey: "forma_pagamento",
    header: "Forma de Pagamento",
  },
  {
    accessorKey: "obra",
    header: "Obra",
  },
]

interface ClienteRecebimentosTableProps {
  data: Recebimento[]
}

export function ClienteRecebimentosTable({ data }: ClienteRecebimentosTableProps) {
  return <DataTable columns={columns} data={data} searchKey="obra" />
}
