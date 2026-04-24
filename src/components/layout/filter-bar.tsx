"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { CalendarIcon, Building2, ChevronDown } from "lucide-react";

interface FilterBarProps {
  dateFrom?: string;
  dateTo?: string;
  obras?: string[];
  categorias?: string[];
}

const PRESETS = [
  { label: "Hoje", value: "hoje" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "Mês", value: "mes" },
  { label: "Trim.", value: "trimestre" },
  { label: "Ano", value: "ano" },
] as const;

function getPresetDates(preset: string) {
  const now = new Date();
  const dateTo = now.toISOString().slice(0, 10);
  let dateFrom = dateTo;

  switch (preset) {
    case "hoje": break;
    case "7d":        dateFrom = new Date(now.getTime() - 7 * 864e5).toISOString().slice(0, 10); break;
    case "30d":       dateFrom = new Date(now.getTime() - 30 * 864e5).toISOString().slice(0, 10); break;
    case "mes":       dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10); break;
    case "trimestre": dateFrom = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString().slice(0, 10); break;
    case "ano":       dateFrom = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10); break;
  }
  return { dateFrom, dateTo };
}

export function FilterBar({ dateFrom: initialFrom, dateTo: initialTo }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef   = useRef<HTMLInputElement>(null);

  // Defaults: current month
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const dateFrom = initialFrom ?? searchParams.get("dateFrom") ?? defaultFrom;
  const dateTo = initialTo ?? searchParams.get("dateTo") ?? defaultTo;

  const pushParams = useCallback(
    (overrides: Record<string, string>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(overrides)) {
        if (v) { p.set(k, v) } else { p.delete(k) }
      }
      startTransition(() => router.push(`${pathname}?${p.toString()}`));
    },
    [router, searchParams, pathname, startTransition]
  );

  const handleDateChange = () => {
    setActivePreset(null);
    pushParams({
      dateFrom: fromRef.current?.value ?? dateFrom,
      dateTo:   toRef.current?.value   ?? dateTo,
    });
  };

  const inputCls =
    "h-9 rounded-xl border border-[var(--color-surface-200)] bg-white text-[13px] font-medium text-[var(--color-surface-700)] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[var(--color-primary-500)] transition-all duration-200 dark:bg-[var(--color-surface-800)] dark:border-[var(--color-surface-700)] dark:text-[var(--color-surface-200)]";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/60 dark:bg-[var(--bg-card)]/60 border border-white/40 dark:border-white/5 px-4 py-3 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] flup-glass transition-all duration-300">
      {/* Date range */}
      <div className="flex items-center gap-2">
        <CalendarIcon className="size-4 text-[var(--color-surface-400)]" strokeWidth={1.8} />
        <input
          ref={fromRef}
          type="date"
          defaultValue={dateFrom}
          onChange={handleDateChange}
          className={`${inputCls} w-[130px] px-2.5`}
        />
        <span className="text-[var(--color-surface-400)] text-xs font-medium">→</span>
        <input
          ref={toRef}
          type="date"
          defaultValue={dateTo}
          onChange={handleDateChange}
          className={`${inputCls} w-[130px] px-2.5`}
        />
      </div>

      {/* Presets */}
      <div className="flex items-center gap-1 rounded-xl bg-[var(--color-surface-50)] dark:bg-[var(--color-surface-800)] p-1 border border-[#e2e8f0]/50 dark:border-[var(--color-surface-700)]">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => {
              setActivePreset(p.value);
              const { dateFrom: df, dateTo: dt } = getPresetDates(p.value);
              if (fromRef.current) fromRef.current.value = df;
              if (toRef.current)   toRef.current.value = dt;
              pushParams({ dateFrom: df, dateTo: dt });
            }}
            className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all duration-200 ${
              activePreset === p.value
                ? "bg-[var(--color-primary-500)] text-white shadow-[0_2px_8px_rgba(99,102,241,0.25)]"
                : "text-[var(--color-surface-500)] hover:text-[var(--color-surface-700)] hover:bg-white dark:hover:bg-[var(--color-surface-700)]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Obra filter */}
      <div className="relative">
        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[var(--color-surface-400)] pointer-events-none" strokeWidth={1.8} />
        <input
          placeholder="Todas as Obras"
          className={`${inputCls} w-[170px] pl-9 pr-3`}
          readOnly
        />
      </div>

      {/* Categories */}
      <div className="relative">
        <select className={`${inputCls} pl-3 pr-8 appearance-none cursor-pointer w-[120px]`}>
          <option value="">Categorias</option>
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[var(--color-surface-400)] pointer-events-none" />
      </div>
    </div>
  );
}
