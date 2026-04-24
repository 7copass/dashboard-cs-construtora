"use client";

import { AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertCardProps {
  severity: "critical" | "warning";
  message: string;
  obra: string;
  value: string;
}

export function AlertCard({ severity, message, obra, value }: AlertCardProps) {
  const isCritical = severity === "critical";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200",
        "border-l-[3px]",
        isCritical
          ? "border-l-[var(--color-danger-500)] bg-[var(--color-danger-50)]/50 dark:bg-[var(--color-danger-500)]/5 hover:bg-[var(--color-danger-50)] dark:hover:bg-[var(--color-danger-500)]/10"
          : "border-l-[var(--color-warning-500)] bg-[var(--color-warning-50)]/50 dark:bg-[var(--color-warning-500)]/5 hover:bg-[var(--color-warning-50)] dark:hover:bg-[var(--color-warning-500)]/10"
      )}
    >
      <div className={cn(
        "flex items-center justify-center size-8 rounded-lg shrink-0",
        isCritical
          ? "bg-[var(--color-danger-100)] dark:bg-[var(--color-danger-500)]/15"
          : "bg-[var(--color-warning-100)] dark:bg-[var(--color-warning-500)]/15"
      )}>
        {isCritical ? (
          <AlertCircle className="size-4 text-[var(--color-danger-500)]" strokeWidth={2} />
        ) : (
          <AlertTriangle className="size-4 text-[var(--color-warning-500)]" strokeWidth={2} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[var(--color-surface-800)] dark:text-[var(--color-surface-100)] truncate leading-tight">
          {message}
        </p>
        <p className="text-[11px] text-[var(--color-surface-400)] mt-0.5">{obra}</p>
      </div>

      <span
        className={cn(
          "shrink-0 text-[12px] font-bold rounded-lg px-2.5 py-1",
          isCritical
            ? "text-[var(--color-danger-600)] bg-[var(--color-danger-100)] dark:bg-[var(--color-danger-500)]/15 dark:text-[var(--color-danger-400)]"
            : "text-[var(--color-warning-600)] bg-[var(--color-warning-100)] dark:bg-[var(--color-warning-500)]/15 dark:text-[var(--color-warning-400)]"
        )}
      >
        {value}
      </span>
    </div>
  );
}
