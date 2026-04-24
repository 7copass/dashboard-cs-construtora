"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Sparkline } from "@/components/charts/sparkline";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  delta?: number;
  deltaColor?: "green" | "red" | "blue" | "neutral";
  icon?: LucideIcon;
  color?: string;
  sparklineData?: number[];
  highlight?: boolean;
  className?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  delta,
  deltaColor = "neutral",
  icon: Icon,
  color = "var(--color-primary-500)",
  sparklineData,
  highlight = false,
  className,
}: KpiCardProps) {
  const deltaFormatted = delta !== undefined
    ? `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`
    : undefined;

  return (
    <div
      className={cn(
        /* Flup: Card Premium & Clean */
        "relative rounded-2xl bg-white p-5 overflow-hidden",
        "border border-[var(--color-surface-200)]/60",
        "shadow-[var(--shadow-sm)]",
        "transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-md)]",
        /* Dark mode */
        "dark:bg-[var(--bg-card)] dark:border-[var(--color-surface-700)]/40",
        /* Highlight (atrasados, perigo) */
        highlight && "ring-4 ring-[var(--color-danger-50)] border-[var(--color-danger-300)] shadow-[0_0_0_1px_var(--color-danger-100)]",
        className
      )}
    >
      {/* Top row: icon + title */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div
              className="flex items-center justify-center size-10 rounded-xl text-white shadow-inner"
              style={{
                backgroundImage: `linear-gradient(to bottom right, ${color}, ${color}cc)`,
                boxShadow: `0 4px 14px ${color}33, inset 0 1px 0 rgba(255,255,255,0.2)`,
              }}
            >
              <Icon className="size-[18px]" strokeWidth={2} />
            </div>
          )}
          <span className="text-[13px] font-bold uppercase tracking-wider text-[var(--color-surface-500)]">
            {title}
          </span>
        </div>
        {sparklineData && sparklineData.length > 1 && (
          <div className="w-20 h-8 opacity-60">
            <Sparkline data={sparklineData} color={color} />
          </div>
        )}
      </div>

      {/* Value — Flup: text-3xl font-black text-surface-900 */}
      <p className="text-3xl font-black text-[var(--color-surface-900)] dark:text-white tabular-nums tracking-tight leading-none mb-1">
        {value}
      </p>

      {/* Subtitle / Delta row */}
      <div className="flex items-center gap-2 mt-2">
        {deltaFormatted && (
          <span
            className={cn(
              "inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-bold tabular-nums",
              deltaColor === "green"   && "bg-[var(--color-success-50)] text-[var(--color-success-600)]",
              deltaColor === "red"     && "bg-[var(--color-danger-50)] text-[var(--color-danger-600)]",
              deltaColor === "blue"    && "bg-[var(--color-info-50)] text-[var(--color-info-600)]",
              deltaColor === "neutral" && "bg-[var(--color-surface-100)] text-[var(--color-surface-500)]"
            )}
          >
            {deltaFormatted}
          </span>
        )}
        {subtitle && (
          <span className="text-[12px] font-medium text-[var(--color-surface-400)]">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
