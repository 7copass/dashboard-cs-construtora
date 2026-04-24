"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/data-table";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface AgingDetalheReceber {
  cliente: string;
  obra: string;
  valor: number;
  dataVencimento: string;
  diasAtraso: number;
  status: string;
}

const columns: ColumnDef<AgingDetalheReceber, unknown>[] = [
  {
    accessorKey: "cliente",
    header: "Cliente",
    cell: ({ row }) => (
      <span
        className="text-sm max-w-[180px] truncate block"
        title={row.original.cliente}
      >
        {row.original.cliente}
      </span>
    ),
  },
  {
    accessorKey: "obra",
    header: "Obra",
    cell: ({ row }) => (
      <span
        className="text-sm max-w-[180px] truncate block"
        title={row.original.obra}
      >
        {row.original.obra}
      </span>
    ),
  },
  {
    accessorKey: "valor",
    header: "Valor (R$)",
    cell: ({ row }) => (
      <span className="text-sm font-medium whitespace-nowrap text-[var(--text-primary)]">
        {formatCurrency(row.original.valor)}
      </span>
    ),
  },
  {
    accessorKey: "dataVencimento",
    header: "Data Vencimento",
    cell: ({ row }) => (
      <span className="text-sm whitespace-nowrap">
        {formatDate(row.original.dataVencimento)}
      </span>
    ),
  },
  {
    accessorKey: "diasAtraso",
    header: "Dias em Atraso",
    cell: ({ row }) => {
      const dias = row.original.diasAtraso;
      return (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            dias === 0
              ? "bg-green-500/10 text-green-600 dark:text-green-400"
              : dias <= 30
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : dias <= 60
                  ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
          )}
        >
          {dias} {dias === 1 ? "dia" : "dias"}
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
        {row.original.status}
      </span>
    ),
  },
];

interface AgingReceberTableProps {
  data: AgingDetalheReceber[];
}

export function AgingReceberTable({ data }: AgingReceberTableProps) {
  return <DataTable columns={columns} data={data} searchKey="cliente" />;
}
