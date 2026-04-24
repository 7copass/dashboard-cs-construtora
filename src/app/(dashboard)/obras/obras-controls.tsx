"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { SlidersHorizontal, ArrowUpDown } from "lucide-react";

interface ObrasControlsProps {
  currentStatus: string;
  currentSort: string;
  total: number;
}

export function ObrasControls({ currentStatus, currentSort }: ObrasControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "todas" && value !== "nome") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/obras?${params.toString()}`);
    },
    [router, searchParams]
  );

  const selectCls =
    "h-9 rounded-xl border border-[var(--color-surface-200)] dark:border-[var(--color-surface-700)] bg-white dark:bg-[#1e293b]/60 text-[12px] font-medium text-[var(--color-surface-700)] dark:text-[var(--color-surface-300)] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[var(--color-primary-400)] transition-all duration-200 cursor-pointer appearance-none";

  return (
    <div className="flex items-center gap-2">
      {/* Status filter */}
      <div className="relative">
        <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[var(--color-surface-400)] pointer-events-none" strokeWidth={1.8} />
        <select
          value={currentStatus}
          onChange={(e) => updateParam("status", e.target.value)}
          className={`${selectCls} pl-9 pr-8`}
        >
          <option value="todas">Todas</option>
          <option value="ativa">Ativa</option>
          <option value="andamento">Em andamento</option>
          <option value="concluida">Concluída</option>
          <option value="pausada">Pausada</option>
        </select>
      </div>

      {/* Sort */}
      <div className="relative">
        <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[var(--color-surface-400)] pointer-events-none" strokeWidth={1.8} />
        <select
          value={currentSort}
          onChange={(e) => updateParam("sortBy", e.target.value)}
          className={`${selectCls} pl-9 pr-8`}
        >
          <option value="nome">Por nome</option>
          <option value="gasto">Por gasto</option>
          <option value="margem">Por margem</option>
          <option value="desvio">Por desvio</option>
        </select>
      </div>
    </div>
  );
}
