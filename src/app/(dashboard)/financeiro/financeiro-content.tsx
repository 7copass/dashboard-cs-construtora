"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Clock,
  AlertCircle,
  Download,
  Loader2,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { KpiCardSmall } from "@/components/cards/kpi-card-small";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { FinanceiroKpis, EntradaRow, SaidaRow } from "@/lib/queries/financeiro";

// ─── Props ───────────────────────────────────────────────────────

interface Filters {
  dateFrom: string;
  dateTo: string;
  obras: string[];
}

interface FinFilters {
  tab: "entradas" | "saidas" | "consolidado";
  natureza: string;
  forma: string;
  categoria: string;
  status: string;
}

interface FinanceiroContentProps {
  kpis: FinanceiroKpis;
  filters: Filters;
  finFilters: FinFilters;
}

// ─── Status Badge ────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const isGreen = status === "Recebido" || status === "Pago";
  const isAmber = status === "Parcial";

  if (isGreen) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-[var(--accent-green)]/15 text-[var(--accent-green)]">
        {status}
      </span>
    );
  }
  if (isAmber) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-[var(--accent-amber)]/15 text-[var(--accent-amber)]">
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]">
      {status}
    </span>
  );
}

// ─── Category / Natureza Badge ───────────────────────────────────

function TagBadge({ label }: { label: string }) {
  if (!label) return <span className="text-[var(--text-secondary)] text-xs">—</span>;
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-[var(--accent-gold-dim)] text-[var(--accent-gold)]">
      {label}
    </span>
  );
}

// ─── Filter Select ───────────────────────────────────────────────

interface FilterSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}

function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
  return (
    <div className="flex items-center gap-1.5 min-w-[150px]">
      <label className="text-xs text-[var(--text-secondary)] shrink-0">{label}:</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--accent-gold)] transition-colors"
      >
        <option value="">Todos</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── CSV Export ──────────────────────────────────────────────────

function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(";"),
    ...rows.map((r) =>
      headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(";")
    ),
  ].join("\n");

  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Entradas Table ──────────────────────────────────────────────

function EntradasTable({ rows }: { rows: EntradaRow[] }) {
  if (!rows.length) {
    return (
      <p className="text-center py-12 text-[var(--text-secondary)] text-sm">
        Nenhuma entrada encontrada para os filtros selecionados.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">
              Data Recebimento
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">
              Obra / CC
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-secondary)]">
              Cliente
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-secondary)]">
              Descrição
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-secondary)]">
              Natureza
            </th>
            <th className="px-3 py-2.5 text-center text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">
              Parcela
            </th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">
              Vl. Parcela
            </th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">
              Vl. Recebido
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-secondary)]">
              Forma
            </th>
            <th className="px-3 py-2.5 text-center text-xs font-semibold text-[var(--text-secondary)]">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((row, i) => (
            <tr
              key={i}
              className="hover:bg-[var(--bg-card-hover)] transition-colors group"
            >
              <td className="px-3 py-2.5 text-[var(--text-secondary)] text-xs whitespace-nowrap">
                {row.data_recebimento
                  ? formatDate(row.data_recebimento)
                  : row.data_vencimento
                  ? formatDate(row.data_vencimento)
                  : "—"}
              </td>
              <td className="px-3 py-2.5 text-[var(--text-primary)] text-xs font-medium max-w-[140px] truncate">
                {row.centro_de_custo || `Obra ${row.id_obra}`}
              </td>
              <td className="px-3 py-2.5 text-[var(--text-secondary)] text-xs max-w-[120px] truncate">
                {row.cliente || "—"}
              </td>
              <td className="px-3 py-2.5 text-[var(--text-secondary)] text-xs max-w-[160px] truncate">
                {row.descricao || "—"}
              </td>
              <td className="px-3 py-2.5">
                <TagBadge label={row.natureza} />
              </td>
              <td className="px-3 py-2.5 text-center text-[var(--text-secondary)] text-xs">
                {row.numero_parcela ?? "—"}
              </td>
              <td className="px-3 py-2.5 text-right text-[var(--text-primary)] text-xs font-medium tabular-nums whitespace-nowrap">
                {formatCurrency(row.valor_parcela)}
              </td>
              <td className="px-3 py-2.5 text-right text-[var(--accent-green)] text-xs font-semibold tabular-nums whitespace-nowrap">
                {row.valor_recebido > 0 ? formatCurrency(row.valor_recebido) : "—"}
              </td>
              <td className="px-3 py-2.5 text-[var(--text-secondary)] text-xs whitespace-nowrap">
                {row.forma_recebimento || "—"}
              </td>
              <td className="px-3 py-2.5 text-center">
                <StatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Saidas Table ────────────────────────────────────────────────

function SaidasTable({ rows }: { rows: SaidaRow[] }) {
  if (!rows.length) {
    return (
      <p className="text-center py-12 text-[var(--text-secondary)] text-sm">
        Nenhuma saída encontrada para os filtros selecionados.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">
              Data Pagamento
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">
              Obra / CC
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-secondary)]">
              Fornecedor
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-secondary)]">
              Descrição
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-secondary)]">
              Categoria
            </th>
            <th className="px-3 py-2.5 text-center text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">
              Parcela
            </th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">
              Vl. Parcela
            </th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">
              Vl. Pago
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-secondary)]">
              Forma
            </th>
            <th className="px-3 py-2.5 text-center text-xs font-semibold text-[var(--text-secondary)]">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((row, i) => (
            <tr
              key={i}
              className="hover:bg-[var(--bg-card-hover)] transition-colors group"
            >
              <td className="px-3 py-2.5 text-[var(--text-secondary)] text-xs whitespace-nowrap">
                {row.data_pagamento
                  ? formatDate(row.data_pagamento)
                  : row.data_vencimento
                  ? formatDate(row.data_vencimento)
                  : "—"}
              </td>
              <td className="px-3 py-2.5 text-[var(--text-primary)] text-xs font-medium max-w-[140px] truncate">
                {row.centro_de_custo || `Obra ${row.id_obra}`}
              </td>
              <td className="px-3 py-2.5 text-[var(--text-secondary)] text-xs max-w-[120px] truncate">
                {row.fornecedor || "—"}
              </td>
              <td className="px-3 py-2.5 text-[var(--text-secondary)] text-xs max-w-[160px] truncate">
                {row.descricao || "—"}
              </td>
              <td className="px-3 py-2.5">
                <TagBadge label={row.categoria} />
              </td>
              <td className="px-3 py-2.5 text-center text-[var(--text-secondary)] text-xs">
                {row.numero_parcela ?? "—"}
              </td>
              <td className="px-3 py-2.5 text-right text-[var(--text-primary)] text-xs font-medium tabular-nums whitespace-nowrap">
                {formatCurrency(row.valor_parcela)}
              </td>
              <td className="px-3 py-2.5 text-right text-[var(--accent-red)] text-xs font-semibold tabular-nums whitespace-nowrap">
                {row.valor_pago > 0 ? formatCurrency(row.valor_pago) : "—"}
              </td>
              <td className="px-3 py-2.5 text-[var(--text-secondary)] text-xs whitespace-nowrap">
                {row.forma_pagamento || "—"}
              </td>
              <td className="px-3 py-2.5 text-center">
                <StatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Consolidado Table ───────────────────────────────────────────

interface ConsolidadoRow {
  obra: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

function ConsolidadoTable({
  entradas,
  saidas,
}: {
  entradas: EntradaRow[];
  saidas: SaidaRow[];
}) {
  const map = new Map<string, ConsolidadoRow>();

  for (const r of entradas) {
    const obra = r.centro_de_custo || `Obra ${r.id_obra}`;
    const existing = map.get(obra) ?? { obra, entradas: 0, saidas: 0, saldo: 0 };
    existing.entradas += r.valor_recebido;
    existing.saldo = existing.entradas - existing.saidas;
    map.set(obra, existing);
  }

  for (const r of saidas) {
    const obra = r.centro_de_custo || `Obra ${r.id_obra}`;
    const existing = map.get(obra) ?? { obra, entradas: 0, saidas: 0, saldo: 0 };
    existing.saidas += r.valor_pago;
    existing.saldo = existing.entradas - existing.saidas;
    map.set(obra, existing);
  }

  const rows = [...map.values()].sort((a, b) => b.saldo - a.saldo);

  if (!rows.length) {
    return (
      <p className="text-center py-12 text-[var(--text-secondary)] text-sm">
        Nenhum dado consolidado encontrado.
      </p>
    );
  }

  const totalEntradas = rows.reduce((s, r) => s + r.entradas, 0);
  const totalSaidas = rows.reduce((s, r) => s + r.saidas, 0);
  const totalSaldo = totalEntradas - totalSaidas;

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-secondary)]">
              Obra / Centro de Custo
            </th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">
              Entradas
            </th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">
              Saídas
            </th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">
              Saldo
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-[var(--bg-card-hover)] transition-colors">
              <td className="px-3 py-2.5 text-[var(--text-primary)] text-xs font-medium">
                {row.obra}
              </td>
              <td className="px-3 py-2.5 text-right text-[var(--accent-green)] text-xs font-semibold tabular-nums whitespace-nowrap">
                {formatCurrency(row.entradas)}
              </td>
              <td className="px-3 py-2.5 text-right text-[var(--accent-red)] text-xs font-semibold tabular-nums whitespace-nowrap">
                {formatCurrency(row.saidas)}
              </td>
              <td
                className={`px-3 py-2.5 text-right text-xs font-bold tabular-nums whitespace-nowrap ${
                  row.saldo >= 0
                    ? "text-[var(--accent-green)]"
                    : "text-[var(--accent-red)]"
                }`}
              >
                {formatCurrency(row.saldo)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-[var(--border-light)] bg-[var(--bg-secondary)]">
            <td className="px-3 py-2.5 text-xs font-bold text-[var(--text-primary)]">
              Total
            </td>
            <td className="px-3 py-2.5 text-right text-xs font-bold text-[var(--accent-green)] tabular-nums whitespace-nowrap">
              {formatCurrency(totalEntradas)}
            </td>
            <td className="px-3 py-2.5 text-right text-xs font-bold text-[var(--accent-red)] tabular-nums whitespace-nowrap">
              {formatCurrency(totalSaidas)}
            </td>
            <td
              className={`px-3 py-2.5 text-right text-xs font-bold tabular-nums whitespace-nowrap ${
                totalSaldo >= 0
                  ? "text-[var(--accent-green)]"
                  : "text-[var(--accent-red)]"
              }`}
            >
              {formatCurrency(totalSaldo)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────

export function FinanceiroContent({
  kpis,
  filters,
  finFilters,
}: FinanceiroContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"entradas" | "saidas" | "consolidado">(
    finFilters.tab
  );

  // Local filter state
  const [natureza, setNatureza] = useState(finFilters.natureza);
  const [formaEntrada, setFormaEntrada] = useState(finFilters.forma);
  const [categoria, setCategoria] = useState(finFilters.categoria);
  const [formaSaida, setFormaSaida] = useState(finFilters.forma);
  const [statusFilter, setStatusFilter] = useState(finFilters.status);

  // Data state
  const [entradas, setEntradas] = useState<EntradaRow[]>([]);
  const [saidas, setSaidas] = useState<SaidaRow[]>([]);
  const [loadingEntradas, setLoadingEntradas] = useState(false);
  const [loadingSaidas, setLoadingSaidas] = useState(false);

  // Update URL helper
  const updateParam = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v) {
          params.set(k, v);
        } else {
          params.delete(k);
        }
      }
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Fetch entradas
  const fetchEntradas = useCallback(async () => {
    setLoadingEntradas(true);
    try {
      const params = new URLSearchParams({
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        ...(filters.obras.length ? { obras: filters.obras.join(",") } : {}),
        ...(natureza ? { natureza } : {}),
        ...(formaEntrada ? { forma: formaEntrada } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      const res = await fetch(`/api/financeiro/entradas?${params}`);
      const data: EntradaRow[] = await res.json();
      setEntradas(data);
    } catch (err) {
      console.error("Error fetching entradas:", err);
    } finally {
      setLoadingEntradas(false);
    }
  }, [filters, natureza, formaEntrada, statusFilter]);

  // Fetch saidas
  const fetchSaidas = useCallback(async () => {
    setLoadingSaidas(true);
    try {
      const params = new URLSearchParams({
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        ...(filters.obras.length ? { obras: filters.obras.join(",") } : {}),
        ...(categoria ? { categoria } : {}),
        ...(formaSaida ? { forma: formaSaida } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      const res = await fetch(`/api/financeiro/saidas?${params}`);
      const data: SaidaRow[] = await res.json();
      setSaidas(data);
    } catch (err) {
      console.error("Error fetching saidas:", err);
    } finally {
      setLoadingSaidas(false);
    }
  }, [filters, categoria, formaSaida, statusFilter]);

  // Initial load
  useEffect(() => {
    fetchEntradas();
  }, [fetchEntradas]);

  useEffect(() => {
    fetchSaidas();
  }, [fetchSaidas]);

  // Derived options for selects
  const naturezaOptions = [...new Set(entradas.map((r) => r.natureza).filter(Boolean))].sort();
  const formaEntradasOptions = [
    ...new Set(entradas.map((r) => r.forma_recebimento ?? "").filter(Boolean)),
  ].sort();
  const categoriaOptions = [...new Set(saidas.map((r) => r.categoria).filter(Boolean))].sort();
  const formaSaidasOptions = [
    ...new Set(saidas.map((r) => r.forma_pagamento ?? "").filter(Boolean)),
  ].sort();
  const statusOptions = ["Recebido", "Parcial", "Pendente"];
  const statusSaidasOptions = ["Pago", "Parcial", "Pendente"];

  // Handle tab change
  function handleTabChange(tab: "entradas" | "saidas" | "consolidado") {
    setActiveTab(tab);
    setStatusFilter("");
    updateParam({ fin_tab: tab, fin_status: "" });
  }

  // CSV export handlers
  function handleExportEntradas() {
    exportCSV(
      `entradas_${filters.dateFrom}_${filters.dateTo}.csv`,
      entradas.map((r) => ({
        "Data Recebimento": r.data_recebimento ?? r.data_vencimento ?? "",
        Obra: r.centro_de_custo || `Obra ${r.id_obra}`,
        Cliente: r.cliente,
        Descrição: r.descricao,
        Natureza: r.natureza,
        Parcela: r.numero_parcela,
        "Valor Parcela": r.valor_parcela,
        "Valor Recebido": r.valor_recebido,
        Forma: r.forma_recebimento ?? "",
        Status: r.status,
      }))
    );
  }

  function handleExportSaidas() {
    exportCSV(
      `saidas_${filters.dateFrom}_${filters.dateTo}.csv`,
      saidas.map((r) => ({
        "Data Pagamento": r.data_pagamento ?? r.data_vencimento ?? "",
        Obra: r.centro_de_custo || `Obra ${r.id_obra}`,
        Fornecedor: r.fornecedor,
        Descrição: r.descricao,
        Categoria: r.categoria,
        Parcela: r.numero_parcela,
        "Valor Parcela": r.valor_parcela,
        "Valor Pago": r.valor_pago,
        Forma: r.forma_pagamento ?? "",
        Status: r.status,
      }))
    );
  }

  function handleExportConsolidado() {
    const map = new Map<string, { obra: string; entradas: number; saidas: number }>();
    for (const r of entradas) {
      const obra = r.centro_de_custo || `Obra ${r.id_obra}`;
      const e = map.get(obra) ?? { obra, entradas: 0, saidas: 0 };
      e.entradas += r.valor_recebido;
      map.set(obra, e);
    }
    for (const r of saidas) {
      const obra = r.centro_de_custo || `Obra ${r.id_obra}`;
      const e = map.get(obra) ?? { obra, entradas: 0, saidas: 0 };
      e.saidas += r.valor_pago;
      map.set(obra, e);
    }
    exportCSV(
      `consolidado_${filters.dateFrom}_${filters.dateTo}.csv`,
      [...map.values()].map((r) => ({
        Obra: r.obra,
        Entradas: r.entradas,
        Saídas: r.saidas,
        Saldo: r.entradas - r.saidas,
      }))
    );
  }

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Financeiro</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Período: {formatDate(filters.dateFrom)} — {formatDate(filters.dateTo)}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCardSmall
          title="Total Entradas"
          value={formatCurrency(kpis.totalEntradas)}
          icon={ArrowDownLeft}
          subtitle="No período"
        />
        <KpiCardSmall
          title="Total Saídas"
          value={formatCurrency(kpis.totalSaidas)}
          icon={ArrowUpRight}
          subtitle="No período"
        />
        <KpiCardSmall
          title="Saldo Período"
          value={formatCurrency(kpis.saldo)}
          icon={Scale}
          subtitle="Entradas − Saídas"
        />
        <KpiCardSmall
          title="Pendente Receber"
          value={formatCurrency(kpis.pendenteReceber)}
          icon={Clock}
          subtitle="Em aberto"
        />
        <KpiCardSmall
          title="Pendente Pagar"
          value={formatCurrency(kpis.pendentePagar)}
          icon={AlertCircle}
          subtitle="Em aberto"
        />
      </div>

      {/* Tabs Section */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 lg:p-6">
        <Tabs
          value={activeTab}
          onValueChange={(v) =>
            handleTabChange(v as "entradas" | "saidas" | "consolidado")
          }
        >
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <TabsList className="bg-[var(--bg-secondary)] border border-[var(--border)]">
              <TabsTrigger
                value="entradas"
                className="data-[state=active]:bg-[var(--accent-gold-dim)] data-[state=active]:text-[var(--accent-gold)] text-[var(--text-secondary)] text-sm"
              >
                Entradas
              </TabsTrigger>
              <TabsTrigger
                value="saidas"
                className="data-[state=active]:bg-[var(--accent-gold-dim)] data-[state=active]:text-[var(--accent-gold)] text-[var(--text-secondary)] text-sm"
              >
                Saídas
              </TabsTrigger>
              <TabsTrigger
                value="consolidado"
                className="data-[state=active]:bg-[var(--accent-gold-dim)] data-[state=active]:text-[var(--accent-gold)] text-[var(--text-secondary)] text-sm"
              >
                Consolidado
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Entradas Tab ────────────────────────────────── */}
          <TabsContent value="entradas" className="mt-0 space-y-4">
            {/* Filter row */}
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
              <span className="text-xs font-semibold text-[var(--text-secondary)] shrink-0 uppercase tracking-wider">
                Filtros
              </span>
              <FilterSelect
                label="Natureza"
                value={natureza}
                options={naturezaOptions}
                onChange={(v) => {
                  setNatureza(v);
                  updateParam({ fin_natureza: v });
                }}
              />
              <FilterSelect
                label="Forma"
                value={formaEntrada}
                options={formaEntradasOptions}
                onChange={(v) => {
                  setFormaEntrada(v);
                  updateParam({ fin_forma: v });
                }}
              />
              <FilterSelect
                label="Status"
                value={statusFilter}
                options={statusOptions}
                onChange={(v) => {
                  setStatusFilter(v);
                  updateParam({ fin_status: v });
                }}
              />
              <div className="ml-auto">
                <button
                  onClick={handleExportEntradas}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] transition-colors"
                >
                  <Download className="size-3.5" />
                  Exportar CSV
                </button>
              </div>
            </div>

            {/* Summary row */}
            <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
              <span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {entradas.length}
                </span>{" "}
                registros
              </span>
              <span>
                Total recebido:{" "}
                <span className="font-semibold text-[var(--accent-green)]">
                  {formatCurrency(entradas.reduce((s, r) => s + r.valor_recebido, 0))}
                </span>
              </span>
              <span>
                Total faturado:{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  {formatCurrency(entradas.reduce((s, r) => s + r.valor_parcela, 0))}
                </span>
              </span>
            </div>

            {/* Table */}
            {loadingEntradas ? (
              <div className="flex items-center justify-center py-16 gap-2 text-[var(--text-secondary)]">
                <Loader2 className="size-5 animate-spin" />
                <span className="text-sm">Carregando...</span>
              </div>
            ) : (
              <EntradasTable rows={entradas} />
            )}
          </TabsContent>

          {/* ── Saidas Tab ──────────────────────────────────── */}
          <TabsContent value="saidas" className="mt-0 space-y-4">
            {/* Filter row */}
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
              <span className="text-xs font-semibold text-[var(--text-secondary)] shrink-0 uppercase tracking-wider">
                Filtros
              </span>
              <FilterSelect
                label="Categoria"
                value={categoria}
                options={categoriaOptions}
                onChange={(v) => {
                  setCategoria(v);
                  updateParam({ fin_categoria: v });
                }}
              />
              <FilterSelect
                label="Forma Pgto"
                value={formaSaida}
                options={formaSaidasOptions}
                onChange={(v) => {
                  setFormaSaida(v);
                  updateParam({ fin_forma: v });
                }}
              />
              <FilterSelect
                label="Status"
                value={statusFilter}
                options={statusSaidasOptions}
                onChange={(v) => {
                  setStatusFilter(v);
                  updateParam({ fin_status: v });
                }}
              />
              <div className="ml-auto">
                <button
                  onClick={handleExportSaidas}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] transition-colors"
                >
                  <Download className="size-3.5" />
                  Exportar CSV
                </button>
              </div>
            </div>

            {/* Summary row */}
            <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
              <span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {saidas.length}
                </span>{" "}
                registros
              </span>
              <span>
                Total pago:{" "}
                <span className="font-semibold text-[var(--accent-red)]">
                  {formatCurrency(saidas.reduce((s, r) => s + r.valor_pago, 0))}
                </span>
              </span>
              <span>
                Total lançado:{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  {formatCurrency(saidas.reduce((s, r) => s + r.valor_parcela, 0))}
                </span>
              </span>
            </div>

            {/* Table */}
            {loadingSaidas ? (
              <div className="flex items-center justify-center py-16 gap-2 text-[var(--text-secondary)]">
                <Loader2 className="size-5 animate-spin" />
                <span className="text-sm">Carregando...</span>
              </div>
            ) : (
              <SaidasTable rows={saidas} />
            )}
          </TabsContent>

          {/* ── Consolidado Tab ─────────────────────────────── */}
          <TabsContent value="consolidado" className="mt-0 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--text-secondary)]">
                Visão consolidada por obra / centro de custo no período.
              </p>
              <button
                onClick={handleExportConsolidado}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] transition-colors"
              >
                <Download className="size-3.5" />
                Exportar CSV
              </button>
            </div>

            {loadingEntradas || loadingSaidas ? (
              <div className="flex items-center justify-center py-16 gap-2 text-[var(--text-secondary)]">
                <Loader2 className="size-5 animate-spin" />
                <span className="text-sm">Carregando...</span>
              </div>
            ) : (
              <ConsolidadoTable entradas={entradas} saidas={saidas} />
            )}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
