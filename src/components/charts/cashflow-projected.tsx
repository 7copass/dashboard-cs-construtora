"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
  Legend,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { formatCurrency } from "@/lib/utils/format";

interface CashflowDataPoint {
  date: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

interface CashflowProjectedProps {
  realized: CashflowDataPoint[];
  projected: CashflowDataPoint[];
}

interface MergedDataPoint {
  date: string;
  entradas: number;
  saidas: number;
  saldo: number;
  entradasRealized?: number;
  saidasRealized?: number;
  saldoRealized?: number;
  entradasProjected?: number;
  saidasProjected?: number;
  saldoProjected?: number;
  isProjected: boolean;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border)] p-3 shadow-lg">
      <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">
        {label}
      </p>
      {payload
        .filter((entry) => entry.value != null && entry.value !== 0)
        .map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 text-sm">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[var(--text-secondary)]">{entry.name}:</span>
            <span className="font-medium text-[var(--text-primary)]">
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
    </div>
  );
}

function getGroupingLabel(totalDays: number): string {
  if (totalDays <= 31) return "Diario";
  if (totalDays <= 90) return "Semanal";
  return "Mensal";
}

export function CashflowProjected({
  realized,
  projected,
}: CashflowProjectedProps) {
  const today = new Date().toISOString().split("T")[0];

  const mergedData = useMemo(() => {
    const data: MergedDataPoint[] = [];

    // Add realized data
    for (const point of realized) {
      data.push({
        ...point,
        entradasRealized: point.entradas,
        saidasRealized: point.saidas,
        saldoRealized: point.saldo,
        isProjected: false,
      });
    }

    // Add projected data
    for (const point of projected) {
      data.push({
        ...point,
        entradasProjected: point.entradas,
        saidasProjected: point.saidas,
        saldoProjected: point.saldo,
        isProjected: true,
      });
    }

    // Sort by date
    data.sort((a, b) => a.date.localeCompare(b.date));

    return data;
  }, [realized, projected]);

  // Find date ranges where saldo is negative for ReferenceArea
  const negativeRanges = useMemo(() => {
    const ranges: { start: string; end: string }[] = [];
    let currentStart: string | null = null;

    for (const point of mergedData) {
      const saldo = point.saldoRealized ?? point.saldoProjected ?? 0;
      if (saldo < 0) {
        if (!currentStart) currentStart = point.date;
      } else if (currentStart) {
        ranges.push({ start: currentStart, end: point.date });
        currentStart = null;
      }
    }

    if (currentStart && mergedData.length > 0) {
      ranges.push({
        start: currentStart,
        end: mergedData[mergedData.length - 1].date,
      });
    }

    return ranges;
  }, [mergedData]);

  // Detect grouping based on date range
  const totalDays = useMemo(() => {
    if (mergedData.length < 2) return 0;
    const first = new Date(mergedData[0].date);
    const last = new Date(mergedData[mergedData.length - 1].date);
    return Math.ceil(
      (last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)
    );
  }, [mergedData]);

  if (mergedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-[var(--text-secondary)]">
        Nenhum dado de fluxo de caixa disponivel.
      </div>
    );
  }

  const groupingLabel = getGroupingLabel(totalDays);

  return (
    <div>
      <p className="text-xs text-[var(--text-secondary)] mb-2">
        Agrupamento: {groupingLabel}
      </p>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={mergedData}
          margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            opacity={0.5}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) =>
              new Intl.NumberFormat("pt-BR", {
                notation: "compact",
                style: "currency",
                currency: "BRL",
              }).format(v)
            }
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) =>
              new Intl.NumberFormat("pt-BR", {
                notation: "compact",
                style: "currency",
                currency: "BRL",
              }).format(v)
            }
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }}
          />

          {/* Negative saldo areas */}
          {negativeRanges.map((range, i) => (
            <ReferenceArea
              key={i}
              yAxisId="left"
              x1={range.start}
              x2={range.end}
              fill="var(--accent-red)"
              fillOpacity={0.05}
            />
          ))}

          {/* Today reference line */}
          <ReferenceLine
            x={today}
            yAxisId="left"
            stroke="var(--text-secondary)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{
              value: "Hoje",
              position: "top",
              fill: "var(--text-secondary)",
              fontSize: 12,
            }}
          />

          {/* Realized bars */}
          <Bar
            yAxisId="left"
            dataKey="entradasRealized"
            name="Entradas (Realizado)"
            fill="var(--accent-green)"
            radius={[3, 3, 0, 0]}
            fillOpacity={1}
          />
          <Bar
            yAxisId="left"
            dataKey="saidasRealized"
            name="Saidas (Realizado)"
            fill="var(--accent-red)"
            radius={[3, 3, 0, 0]}
            fillOpacity={1}
          />

          {/* Projected bars */}
          <Bar
            yAxisId="left"
            dataKey="entradasProjected"
            name="Entradas (Projetado)"
            fill="var(--accent-green)"
            radius={[3, 3, 0, 0]}
            fillOpacity={0.4}
          />
          <Bar
            yAxisId="left"
            dataKey="saidasProjected"
            name="Saidas (Projetado)"
            fill="var(--accent-red)"
            radius={[3, 3, 0, 0]}
            fillOpacity={0.4}
          />

          {/* Realized saldo line (solid) */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="saldoRealized"
            name="Saldo (Realizado)"
            stroke="var(--accent-blue)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />

          {/* Projected saldo line (dashed) */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="saldoProjected"
            name="Saldo (Projetado)"
            stroke="var(--accent-blue)"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            connectNulls={false}
          />

          <Brush
            dataKey="date"
            height={24}
            stroke="var(--accent-blue)"
            fill="var(--bg-card)"
            travellerWidth={8}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
