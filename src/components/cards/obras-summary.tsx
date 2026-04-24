"use client";

import { Building2, Hammer, AlertTriangle, TrendingUp } from "lucide-react";

interface ObrasSummaryProps {
  total: number;
  emAndamento: number;
  estouradas: number;
  margemMedia: number;
}

export function ObrasSummary({ total, emAndamento, estouradas, margemMedia }: ObrasSummaryProps) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {/* Total */}
      <div className="relative rounded-2xl bg-white dark:bg-[var(--bg-card)] border border-[#e2e8f0]/40 dark:border-[#334155]/40 shadow-[var(--shadow-sm)] p-4 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] flup-fade-up flup-stagger-1">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--color-primary-400)] to-transparent opacity-60" />
        <div className="flex items-center gap-2.5 mb-2">
          <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-[var(--color-primary-400)] to-[var(--color-primary-600)] shadow-[0_4px_14px_rgba(99,102,241,0.2)] text-white">
            <Building2 className="size-[14px]" strokeWidth={2.2} />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-surface-400)]">Total</span>
        </div>
        <p className="text-2xl font-black tabular-nums tracking-tight text-[var(--color-surface-900)] dark:text-white">{total}</p>
      </div>

      {/* Em Andamento */}
      <div className="relative rounded-2xl bg-white dark:bg-[var(--bg-card)] border border-[#e2e8f0]/40 dark:border-[#334155]/40 shadow-[var(--shadow-sm)] p-4 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] flup-fade-up flup-stagger-2">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#34d399] to-transparent opacity-60" />
        <div className="flex items-center gap-2.5 mb-2">
          <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-[#34d399] to-[#059669] shadow-[0_4px_14px_rgba(16,185,129,0.2)] text-white">
            <Hammer className="size-[14px]" strokeWidth={2.2} />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-surface-400)]">Em Andamento</span>
        </div>
        <p className="text-2xl font-black tabular-nums tracking-tight text-[var(--color-success-500)]">{emAndamento}</p>
      </div>

      {/* Estouradas */}
      <div className="relative rounded-2xl bg-white dark:bg-[var(--bg-card)] border border-[#e2e8f0]/40 dark:border-[#334155]/40 shadow-[var(--shadow-sm)] p-4 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] flup-fade-up flup-stagger-3">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#f87171] to-transparent opacity-60" />
        <div className="flex items-center gap-2.5 mb-2">
          <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-[#f87171] to-[#dc2626] shadow-[0_4px_14px_rgba(239,68,68,0.2)] text-white">
            <AlertTriangle className="size-[14px]" strokeWidth={2.2} />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-surface-400)]">Estouradas</span>
        </div>
        <p className={`text-2xl font-black tabular-nums tracking-tight ${estouradas > 0 ? "text-[var(--color-danger-500)]" : "text-[var(--color-surface-900)] dark:text-white"}`}>
          {estouradas}
        </p>
      </div>

      {/* Margem Média */}
      <div className="relative rounded-2xl bg-white dark:bg-[var(--bg-card)] border border-[#e2e8f0]/40 dark:border-[#334155]/40 shadow-[var(--shadow-sm)] p-4 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] flup-fade-up flup-stagger-4">
        <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${margemMedia >= 0 ? "from-[#34d399]" : "from-[#f87171]"} to-transparent opacity-60`} />
        <div className="flex items-center gap-2.5 mb-2">
          <div className={`flex items-center justify-center size-8 rounded-lg bg-gradient-to-br ${margemMedia >= 0 ? "from-[#34d399] to-[#059669] shadow-[0_4px_14px_rgba(16,185,129,0.2)]" : "from-[#f87171] to-[#dc2626] shadow-[0_4px_14px_rgba(239,68,68,0.2)]"} text-white`}>
            <TrendingUp className="size-[14px]" strokeWidth={2.2} />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-surface-400)]">Margem Média</span>
        </div>
        <p className={`text-2xl font-black tabular-nums tracking-tight ${margemMedia >= 0 ? "text-[var(--color-success-500)]" : "text-[var(--color-danger-500)]"}`}>
          {margemMedia.toFixed(1).replace(".", ",")}%
        </p>
      </div>
    </div>
  );
}
