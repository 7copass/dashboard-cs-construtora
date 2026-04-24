"use client";

import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface CalendarHeatmapProps {
  data: Record<string, { pagar: number; receber: number }>;
  month: number; // 0-11
  year: number;
  onDayClick?: (date: string) => void;
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(".", ",")}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toFixed(0);
}

export function CalendarHeatmap({
  data,
  month,
  year,
  onDayClick,
}: CalendarHeatmapProps) {
  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay(); // 0=Sun
  const totalDays = lastDay.getDate();

  const weeks: Array<Array<number | null>> = [];
  let currentWeek: Array<number | null> = new Array(startDow).fill(null);

  for (let day = 1; day <= totalDays; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  const monthName = firstDay.toLocaleDateString("pt-BR", { month: "long" });
  const title = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

  return (
    <div>
      <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3 text-center">
        {title}
      </h3>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-[10px] font-medium text-[var(--text-secondary)] py-1"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-16" />;
          }

          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayData = data[dateStr];
          const hasPagar = dayData && dayData.pagar > 0;
          const hasReceber = dayData && dayData.receber > 0;
          const hasData = hasPagar || hasReceber;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onDayClick?.(dateStr)}
              className={cn(
                "h-16 rounded-md border text-left p-1 flex flex-col transition-colors",
                hasData
                  ? "border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] cursor-pointer"
                  : "border-transparent bg-transparent cursor-default"
              )}
              title={
                hasData
                  ? `Pagar: ${formatCurrency(dayData?.pagar ?? 0)} | Receber: ${formatCurrency(dayData?.receber ?? 0)}`
                  : undefined
              }
            >
              <span
                className={cn(
                  "text-[10px] font-medium leading-none",
                  hasData
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)]"
                )}
              >
                {day}
              </span>
              {hasPagar && (
                <span className="text-[9px] text-red-500 dark:text-red-400 truncate mt-auto leading-tight">
                  -{formatCompact(dayData.pagar)}
                </span>
              )}
              {hasReceber && (
                <span className="text-[9px] text-green-500 dark:text-green-400 truncate leading-tight">
                  +{formatCompact(dayData.receber)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
