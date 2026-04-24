"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/data-table";
import { formatCurrency, formatDate } from "@/lib/utils/format";

interface PagamentoRow {
  id: string;
  fornecedor: string | null;
  descricao: string | null;
  categoria: string | null;
  data_pagamento: string | null;
  valor_pago: number;
}

const columns: ColumnDef<PagamentoRow>[] = [
  {
    accessorKey: "fornecedor",
    header: "Fornecedor / Descrição",
    cell: ({ row }) => (
      <div className="min-w-0 flex flex-col gap-0.5 pr-4">
        <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[180px] lg:max-w-[250px] leading-snug">
          {row.original.fornecedor ?? "—"}
        </span>
        {row.original.descricao && (
          <span className="text-[11px] text-[var(--text-secondary)] truncate max-w-[180px] lg:max-w-[250px]">
            {row.original.descricao}
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "categoria",
    header: "Categoria",
    cell: ({ row }) => (
      <span className="inline-flex rounded-md bg-[var(--bg-card-hover)] text-[var(--text-secondary)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide truncate max-w-[120px]">
        {row.original.categoria ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "data_pagamento",
    header: "Data",
    cell: ({ row }) => (
      <span className="text-xs text-[var(--text-secondary)] bg-[var(--bg-card-hover)] px-2 py-1 rounded border border-[var(--border)] tabular-nums whitespace-nowrap">
        {row.original.data_pagamento
          ? formatDate(row.original.data_pagamento)
          : "—"}
      </span>
    ),
  },
  {
    accessorKey: "valor_pago",
    header: "Valor",
    cell: ({ row }) => (
      <span className="font-semibold text-[var(--accent-red)] tabular-nums whitespace-nowrap">
        {formatCurrency(row.original.valor_pago)}
      </span>
    ),
  },
];

interface PagamentosTableProps {
  data: PagamentoRow[];
}

export function PagamentosTable({ data }: PagamentosTableProps) {
  return <DataTable columns={columns} data={data} searchKey="fornecedor" />;
}
