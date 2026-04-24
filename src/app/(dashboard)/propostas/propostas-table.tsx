"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/data-table";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import Link from "next/link";

interface PropostaRow {
  id: string;
  data: string | null;
  cliente: string | null;
  valor: number | null;
  status: string | null;
  obraVinculada: string | null;
  obraId: number | null;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pendente: {
    label: "Pendente",
    className: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  },
  aprovada: {
    label: "Aprovada",
    className: "bg-green-500/15 text-green-600 border-green-500/30",
  },
  recusada: {
    label: "Recusada",
    className: "bg-red-500/15 text-red-600 border-red-500/30",
  },
  "em elaboração": {
    label: "Em Elaboracao",
    className: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  },
};

function StatusBadge({ status }: { status: string | null }) {
  const normalized = (status ?? "").toLowerCase().trim();
  const config = statusConfig[normalized] ?? {
    label: status ?? "—",
    className: "bg-gray-500/15 text-gray-500 border-gray-500/30",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

const columns: ColumnDef<PropostaRow>[] = [
  {
    accessorKey: "data",
    header: "Data",
    cell: ({ row }) => {
      const data = row.getValue("data") as string | null;
      return data ? formatDate(data) : "—";
    },
    sortingFn: "datetime",
  },
  {
    accessorKey: "cliente",
    header: "Cliente",
    cell: ({ row }) => {
      const cliente = row.getValue("cliente") as string | null;
      return (
        <span className="text-[var(--text-primary)]">{cliente ?? "—"}</span>
      );
    },
  },
  {
    accessorKey: "valor",
    header: "Valor",
    cell: ({ row }) => {
      const valor = row.getValue("valor") as number | null;
      return valor != null ? formatCurrency(valor) : "—";
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    enableSorting: false,
  },
  {
    accessorKey: "obraVinculada",
    header: "Obra Vinculada",
    cell: ({ row }) => {
      const obraVinculada = row.original.obraVinculada;
      const obraId = row.original.obraId;

      if (!obraVinculada || !obraId) {
        return <span className="text-[var(--text-secondary)]">—</span>;
      }

      return (
        <Link
          href={`/obras/${obraId}`}
          className="text-[var(--accent-blue)] hover:underline text-sm"
        >
          {obraVinculada}
        </Link>
      );
    },
    enableSorting: false,
  },
];

interface PropostasTableProps {
  data: PropostaRow[];
}

export function PropostasTable({ data }: PropostasTableProps) {
  return <DataTable columns={columns} data={data} searchKey="cliente" />;
}
