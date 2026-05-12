"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { CalendarIcon, Building2, ChevronDown, Check, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Obra { id: number; nome: string }

const PRESETS = [
  { label: "Hoje",  value: "hoje" },
  { label: "7d",    value: "7d" },
  { label: "30d",   value: "30d" },
  { label: "Mês",   value: "mes" },
  { label: "Trim.", value: "trimestre" },
  { label: "Ano",   value: "ano" },
] as const;

function getPresetDates(preset: string) {
  const now = new Date();
  const dateTo = now.toISOString().slice(0, 10);
  let dateFrom = dateTo;
  switch (preset) {
    case "hoje":      break;
    case "7d":        dateFrom = new Date(now.getTime() - 7  * 864e5).toISOString().slice(0, 10); break;
    case "30d":       dateFrom = new Date(now.getTime() - 30 * 864e5).toISOString().slice(0, 10); break;
    case "mes":       dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10); break;
    case "trimestre": dateFrom = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString().slice(0, 10); break;
    case "ano":       dateFrom = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10); break;
  }
  return { dateFrom, dateTo };
}

export function FilterBar() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const pathname     = usePathname();
  const [, startTransition] = useTransition();

  // ── Date state ──────────────────────────────────────────────────────────────
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef   = useRef<HTMLInputElement>(null);

  const now        = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const dateFrom    = searchParams.get("dateFrom") ?? defaultFrom;
  const dateTo      = searchParams.get("dateTo")   ?? defaultTo;

  // ── Obras state ─────────────────────────────────────────────────────────────
  const [obras,         setObras]         = useState<Obra[]>([]);
  const [obrasOpen,     setObrasOpen]     = useState(false);
  const obrasRef = useRef<HTMLDivElement>(null);

  // Selected obra IDs from URL (comma-separated)
  const selectedObrasParam = searchParams.get("obras") ?? "";
  const selectedObraIds    = selectedObrasParam ? selectedObrasParam.split(",").map(Number).filter(Boolean) : [];

  // ── Categorias state ────────────────────────────────────────────────────────
  const [categorias,    setCategorias]    = useState<string[]>([]);
  const selectedCategoria = searchParams.get("categorias") ?? "";

  // ── Fetch obras + categorias on mount ───────────────────────────────────────
  useEffect(() => {
    const sb = createClient();

    sb.from("obras").select("id, nome").order("nome").limit(200)
      .then(({ data }) => { if (data) setObras(data) });

    sb.from("lancamentos").select("categoria").not("categoria", "is", null).limit(2000)
      .then(({ data }) => {
        if (data) {
          const unique = [...new Set(data.map((r: {categoria: string}) => r.categoria).filter(Boolean))].sort() as string[];
          setCategorias(unique);
        }
      });
  }, []);

  // ── Close obras dropdown on outside click ───────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (obrasRef.current && !obrasRef.current.contains(e.target as Node)) {
        setObrasOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── URL param helper ────────────────────────────────────────────────────────
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

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleDateChange = () => {
    setActivePreset(null);
    pushParams({
      dateFrom: fromRef.current?.value ?? dateFrom,
      dateTo:   toRef.current?.value   ?? dateTo,
    });
  };

  const toggleObra = (id: number) => {
    const next = selectedObraIds.includes(id)
      ? selectedObraIds.filter(i => i !== id)
      : [...selectedObraIds, id];
    pushParams({ obras: next.join(",") });
  };

  const clearObras = () => pushParams({ obras: "" });

  const handleCategoria = (e: React.ChangeEvent<HTMLSelectElement>) => {
    pushParams({ categorias: e.target.value });
  };

  // ── Label helpers ────────────────────────────────────────────────────────────
  const obrasLabel = selectedObraIds.length === 0
    ? "Todas as Obras"
    : selectedObraIds.length === 1
      ? obras.find(o => o.id === selectedObraIds[0])?.nome ?? "1 obra"
      : `${selectedObraIds.length} obras`;

  const inputCls =
    "h-9 rounded-xl border border-[var(--color-surface-200)] bg-white text-[13px] font-medium text-[var(--color-surface-700)] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[var(--color-primary-500)] transition-all duration-200 dark:bg-[var(--color-surface-800)] dark:border-[var(--color-surface-700)] dark:text-[var(--color-surface-200)]";

  return (
    <div className="relative z-40 flex flex-wrap items-center gap-3 rounded-2xl bg-white/60 dark:bg-[var(--bg-card)]/60 border border-white/40 dark:border-white/5 px-4 py-3 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] flup-glass transition-all duration-300">

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
              if (toRef.current)   toRef.current.value   = dt;
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

      {/* ── Obras multi-select ───────────────────────────────────────────────── */}
      <div className="relative" ref={obrasRef}>
        <button
          onClick={() => setObrasOpen(o => !o)}
          className={`${inputCls} flex items-center gap-2 pl-3 pr-8 min-w-[170px] cursor-pointer ${
            selectedObraIds.length > 0
              ? "border-[var(--color-primary-400)] text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]"
              : ""
          }`}
        >
          <Building2 className="size-3.5 shrink-0 text-[var(--color-surface-400)]" strokeWidth={1.8} />
          <span className="truncate text-[13px]">{obrasLabel}</span>
          <ChevronDown className={`absolute right-2.5 size-3.5 text-[var(--color-surface-400)] transition-transform ${obrasOpen ? "rotate-180" : ""}`} />
        </button>

        {obrasOpen && obras.length > 0 && (
          <div className="absolute top-full left-0 z-[60] mt-1 w-72 rounded-xl border border-[var(--color-surface-200)] dark:border-[var(--color-surface-700)] bg-white dark:bg-[var(--color-surface-800)] shadow-xl overflow-hidden">
            {/* Clear all */}
            {selectedObraIds.length > 0 && (
              <button
                onClick={() => { clearObras(); setObrasOpen(false); }}
                className="w-full px-3 py-2 text-left text-[12px] font-semibold text-[var(--color-primary-500)] hover:bg-[var(--color-surface-50)] dark:hover:bg-[var(--color-surface-700)] border-b border-[var(--color-surface-100)] dark:border-[var(--color-surface-700)]"
              >
                Limpar seleção
              </button>
            )}
            <div className="max-h-64 overflow-y-auto">
              {obras.map(obra => {
                const selected = selectedObraIds.includes(obra.id);
                return (
                  <button
                    key={obra.id}
                    onClick={() => toggleObra(obra.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-[var(--color-surface-50)] dark:hover:bg-[var(--color-surface-700)] transition-colors ${
                      selected ? "text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]" : "text-[var(--color-surface-700)] dark:text-[var(--color-surface-200)]"
                    }`}
                  >
                    <span className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                      selected
                        ? "bg-[var(--color-primary-500)] border-[var(--color-primary-500)]"
                        : "border-[var(--color-surface-300)] dark:border-[var(--color-surface-600)]"
                    }`}>
                      {selected && <Check className="size-2.5 text-white" strokeWidth={3} />}
                    </span>
                    <span className="truncate">{obra.nome}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Categorias select ────────────────────────────────────────────────── */}
      <div className="relative">
        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[var(--color-surface-400)] pointer-events-none" strokeWidth={1.8} />
        <select
          value={selectedCategoria}
          onChange={handleCategoria}
          className={`${inputCls} pl-9 pr-8 appearance-none cursor-pointer min-w-[150px] ${
            selectedCategoria ? "border-[var(--color-primary-400)] text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]" : ""
          }`}
        >
          <option value="">Categorias</option>
          {categorias.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[var(--color-surface-400)] pointer-events-none" />
      </div>
    </div>
  );
}
