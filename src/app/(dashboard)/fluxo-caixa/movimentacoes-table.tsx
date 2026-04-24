"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/data-table";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface Movimentacao {
  date: string;
  tipo: "entrada" | "saida";
  descricao: string;
  obra: string;
  categoria: string;
  valor: number;
  status: "Realizado" | "Pendente";
}

const columns: ColumnDef<Movimentacao, unknown>[] = [
  {
    accessorKey: "date",
    header: "Data",
    cell: ({ row }) => (
      <span className="text-sm whitespace-nowrap">
        {formatDate(row.original.date)}
      </span>
    ),
  },
  {
    accessorKey: "tipo",
    header: "Tipo",
    cell: ({ row }) => {
      const isEntrada = row.original.tipo === "entrada";
      return (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            isEntrada
              ? "bg-green-500/10 text-green-600 dark:text-green-400"
              : "bg-red-500/10 text-red-600 dark:text-red-400"
          )}
        >
          {isEntrada ? "Entrada" : "Saida"}
        </span>
      );
    },
  },
  {
    accessorKey: "descricao",
    header: "Descricao",
    cell: ({ row }) => (
      <span
        className="text-sm max-w-[250px] truncate block"
        title={row.original.descricao}
      >
        {row.original.descricao || "—"}
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
    accessorKey: "categoria",
    header: "Categoria",
    cell: ({ row }) => (
      <span className="text-sm">{row.original.categoria}</span>
    ),
  },
  {
    accessorKey: "valor",
    header: "Valor (R$)",
    cell: ({ row }) => {
      const isEntrada = row.original.tipo === "entrada";
      return (
        <span
          className={cn(
            "text-sm font-medium whitespace-nowrap",
            isEntrada ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}
        >
          {isEntrada ? "+" : "-"}
          {formatCurrency(row.original.valor)}
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const isRealizado = row.original.status === "Realizado";
      return (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            isRealizado
              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          )}
        >
          {row.original.status}
        </span>
      );
    },
  },
];

interface MovimentacoesTableProps {
  data: Movimentacao[];
}

export function MovimentacoesTable({ data }: MovimentacoesTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="descricao"
    />
  );
}
