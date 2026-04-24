"use client";

import { useMemo, useState, useEffect } from "react";

interface GanttRow {
  etapa: string;
  previstoInicio: string | null;
  previstoFim: string | null;
  realInicio?: string | null;
  realFim?: string | null;
  percentual: number;
}

interface GanttChartProps {
  data: GanttRow[];
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

const ROW_HEIGHT = 40;
const ROW_GAP = 6;
const LABEL_WIDTH = 180;
const PCT_WIDTH = 60;
const BAR_HEIGHT = 14;
const BAR_Y_OFFSET = (ROW_HEIGHT - BAR_HEIGHT) / 2;
const MIN_CHART_WIDTH = 500;

export function GanttChart({ data }: GanttChartProps) {
  // Must be declared before any early return to respect Rules of Hooks
  const { minDate, maxDate, totalDays } = useMemo(() => {
    const dates: Date[] = [];
    for (const row of data) {
      const d1 = parseDate(row.previstoInicio);
      const d2 = parseDate(row.previstoFim);
      const d3 = parseDate(row.realInicio);
      const d4 = parseDate(row.realFim);
      if (d1) dates.push(d1);
      if (d2) dates.push(d2);
      if (d3) dates.push(d3);
      if (d4) dates.push(d4);
    }
    if (dates.length === 0) {
      // Use a fixed fallback date — do NOT use new Date() here (SSR mismatch)
      const fallback = new Date("2025-01-01");
      return { minDate: fallback, maxDate: fallback, totalDays: 1 };
    }
    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));
    const total = Math.max(daysBetween(min, max), 1);
    return { minDate: min, maxDate: max, totalDays: total };
  }, [data]);

  // today is only set on the client to avoid SSR/hydration mismatch
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    setToday(new Date());
  }, []);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[120px] text-[var(--text-secondary)]">
        Nenhum dado de cronograma disponivel.
      </div>
    );
  }

  const chartWidth = MIN_CHART_WIDTH;
  const svgHeight = data.length * (ROW_HEIGHT + ROW_GAP) + 10;
  const totalWidth = LABEL_WIDTH + chartWidth + PCT_WIDTH;

  function xPos(date: Date | null): number {
    if (!date) return 0;
    const days = daysBetween(minDate, date);
    return LABEL_WIDTH + (days / totalDays) * chartWidth;
  }

  function barWidth(start: Date | null, end: Date | null): number {
    if (!start || !end) return 0;
    return Math.max((daysBetween(start, end) / totalDays) * chartWidth, 4);
  }

  // todayX is null during SSR — the <line> only appears after client hydration
  const todayX =
    today && today >= minDate && today <= maxDate ? xPos(today) : null;

  return (
    <div className="overflow-x-auto">
      <svg
        width={totalWidth}
        height={svgHeight}
        className="min-w-full"
        style={{ minWidth: totalWidth }}
      >
        {data.map((row, i) => {
          const y = i * (ROW_HEIGHT + ROW_GAP) + 5;
          const pStart = parseDate(row.previstoInicio);
          const pEnd = parseDate(row.previstoFim);
          const rStart = parseDate(row.realInicio);
          const rEnd = parseDate(row.realFim);

          return (
            <g key={i}>
              {/* Row background */}
              <rect
                x={0}
                y={y}
                width={totalWidth}
                height={ROW_HEIGHT}
                fill={i % 2 === 0 ? "var(--bg-card)" : "var(--bg-primary)"}
                rx={4}
              />

              {/* Etapa label */}
              <text
                x={8}
                y={y + ROW_HEIGHT / 2}
                dominantBaseline="central"
                fill="var(--text-secondary)"
                fontSize={12}
                className="select-none"
              >
                {row.etapa.length > 22 ? row.etapa.slice(0, 22) + "..." : row.etapa}
              </text>

              {/* Planned bar */}
              {pStart && pEnd && (
                <rect
                  x={xPos(pStart)}
                  y={y + BAR_Y_OFFSET}
                  width={barWidth(pStart, pEnd)}
                  height={BAR_HEIGHT}
                  rx={4}
                  fill="#93C5FD"
                  opacity={0.5}
                />
              )}

              {/* Actual bar — falls back to rStart so width is 0 when today unknown */}
              {rStart && (
                <rect
                  x={xPos(rStart)}
                  y={y + BAR_Y_OFFSET}
                  width={barWidth(rStart, rEnd ?? today ?? rStart)}
                  height={BAR_HEIGHT}
                  rx={4}
                  fill="#3B82F6"
                />
              )}

              {/* Percentual label */}
              <text
                x={LABEL_WIDTH + chartWidth + 12}
                y={y + ROW_HEIGHT / 2}
                dominantBaseline="central"
                fill="var(--text-primary)"
                fontSize={12}
                fontWeight={600}
              >
                {row.percentual.toFixed(0)}%
              </text>
            </g>
          );
        })}

        {/* Today line — only rendered after client hydration */}
        {todayX != null && (
          <line
            x1={todayX}
            y1={0}
            x2={todayX}
            y2={svgHeight}
            stroke="#EF4444"
            strokeWidth={1.5}
            strokeDasharray="6,4"
          />
        )}
      </svg>
    </div>
  );
}
