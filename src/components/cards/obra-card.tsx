"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCompactCurrency, formatPercent } from "@/lib/utils/format";
import { TrendingDown, TrendingUp, Minus, ChevronRight } from "lucide-react";

interface ObraCardProps {
  id: number;
  nome: string;
  cliente: string | null;
  status: string | null;
  progressoOrcamentario: number;
  valorOrcado: number;
  valorRealizado: number;
  desvio: number;
  progressoCronograma: number;
  margem: number;
}

function getStatusConfig(status: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s.includes("ativa") || s.includes("andamento"))
    return {
      label: status ?? "Em Andamento",
      cls: "bg-[var(--color-success-50)] text-[var(--color-success-600)] dark:bg-[#10b981]/10 dark:text-[var(--color-success-500)]",
    };
  if (s.includes("conclu"))
    return {
      label: status ?? "Concluída",
      cls: "bg-[var(--color-surface-100)] text-[var(--color-surface-500)] dark:bg-[var(--color-surface-700)] dark:text-[var(--color-surface-400)]",
    };
  if (s.includes("paus"))
    return {
      label: status ?? "Pausada",
      cls: "bg-[var(--color-warning-50)] text-[var(--color-warning-600)] dark:bg-[#f59e0b]/10 dark:text-[var(--color-warning-500)]",
    };
  return {
    label: status ?? "—",
    cls: "bg-[var(--color-surface-100)] text-[var(--color-surface-500)] dark:bg-[var(--color-surface-700)] dark:text-[var(--color-surface-400)]",
  };
}

function getBudgetHealth(pct: number) {
  if (pct > 100) return { color: "var(--color-danger-500)", bg: "bg-[#ef4444]/15" };
  if (pct >= 80)  return { color: "var(--color-warning-500)", bg: "bg-[#f59e0b]/15" };
  return              { color: "var(--color-success-500)", bg: "bg-[#10b981]/15" };
}

export function ObraRow({
  id,
  nome,
  cliente,
  status,
  progressoOrcamentario,
  valorOrcado,
  valorRealizado,
  desvio,
  margem,
}: ObraCardProps) {
  const statusCfg = getStatusConfig(status);
  const health    = getBudgetHealth(progressoOrcamentario);
  const budgetW   = Math.min(progressoOrcamentario, 100);

  return (
    <Link href={`/obras/${id}`} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] rounded-lg">
      <div className="grid grid-cols-[1fr_100px_100px_100px_80px_120px_100px_24px] items-center gap-2 px-5 py-3.5 hover:bg-[var(--color-surface-50)] dark:hover:bg-[#1e293b]/40 transition-colors cursor-pointer">
        {/* Nome + Cliente */}
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[var(--color-surface-800)] dark:text-[var(--color-surface-100)] truncate leading-snug group-hover:text-[var(--color-primary-500)] transition-colors">
            {nome}
          </p>
          {cliente && (
            <p className="text-[11px] text-[var(--color-surface-400)] truncate mt-0.5">{cliente}</p>
          )}
        </div>

        {/* Orçado */}
        <p className="text-[13px] font-semibold text-[var(--color-surface-700)] dark:text-[var(--color-surface-200)] tabular-nums text-right">
          {formatCompactCurrency(valorOrcado)}
        </p>

        {/* Realizado */}
        <p className="text-[13px] font-semibold text-[var(--color-surface-700)] dark:text-[var(--color-surface-200)] tabular-nums text-right">
          {formatCompactCurrency(valorRealizado)}
        </p>

        {/* Desvio */}
        <div className="flex items-center justify-end gap-1">
          {desvio < 0 ? <TrendingDown className="size-3 text-[var(--color-success-500)] shrink-0" />
            : desvio > 0 ? <TrendingUp className="size-3 text-[var(--color-danger-500)] shrink-0" />
            : <Minus className="size-3 text-[var(--color-surface-400)] shrink-0" />}
          <span className={cn("text-[13px] font-semibold tabular-nums", desvio <= 0 ? "text-[var(--color-success-500)]" : "text-[var(--color-danger-500)]")}>
            {desvio <= 0 ? "" : "+"}{formatCompactCurrency(Math.abs(desvio))}
          </span>
        </div>

        {/* Margem */}
        <div className="text-right">
          <span className={cn("inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-bold tabular-nums",
            margem >= 0
              ? "bg-[var(--color-success-50)] text-[var(--color-success-600)] dark:bg-[#10b981]/10 dark:text-[var(--color-success-500)]"
              : "bg-[var(--color-danger-50)] text-[var(--color-danger-600)] dark:bg-[#ef4444]/10 dark:text-[var(--color-danger-500)]")}>
            {margem >= 0 ? "+" : ""}{formatPercent(margem)}
          </span>
        </div>

        {/* Budget Progress */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-[var(--color-surface-100)] dark:bg-[var(--color-surface-700)] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${budgetW}%`, background: health.color }} />
          </div>
          <span className="text-[11px] font-bold tabular-nums w-8 text-right shrink-0" style={{ color: health.color }}>
            {formatPercent(progressoOrcamentario, 0)}
          </span>
        </div>

        {/* Status */}
        <div>
          <span className={cn("inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap", statusCfg.cls)}>
            {statusCfg.label}
          </span>
        </div>

        {/* Arrow */}
        <ChevronRight className="size-4 text-[var(--color-surface-300)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
      </div>
    </Link>
  );
}

export function ObraCard(props: ObraCardProps) {
  return <ObraRow {...props} />;
}
