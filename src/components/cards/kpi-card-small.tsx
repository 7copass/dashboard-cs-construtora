"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardSmallProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
}

export function KpiCardSmall({
  title,
  value,
  subtitle,
  icon: Icon,
}: KpiCardSmallProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl bg-white dark:bg-[var(--bg-card)] overflow-hidden",
        "border border-[var(--color-surface-200)]/40 dark:border-[var(--color-surface-700)]/40",
        "shadow-[var(--shadow-sm)] p-4 transition-all duration-300 group/kpi-sm",
        "hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
      )}
    >
      {/* Subtle accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--color-primary-400)] to-transparent opacity-50 group-hover/kpi-sm:opacity-80 transition-opacity duration-300" />

      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-[var(--color-primary-400)] to-[var(--color-primary-600)] shadow-[0_2px_8px_rgba(99,102,241,0.2),inset_0_1px_0_rgba(255,255,255,0.2)] text-white">
          <Icon className="size-[14px]" strokeWidth={2.2} />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-surface-400)]">
          {title}
        </span>
      </div>
      <p className="text-xl font-black text-[var(--color-surface-900)] dark:text-white leading-tight tracking-tight">
        {value}
      </p>
      {subtitle && (
        <p className="text-[11px] text-[var(--color-surface-400)] mt-2 pt-2 border-t border-[var(--color-surface-100)] dark:border-[var(--color-surface-700)]/40">
          {subtitle}
        </p>
      )}
    </div>
  );
}
