"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/lib/utils/format";

interface CashflowGapProps {
  data: { date: string; saldo: number }[];
  gapDate?: string;
  maxDeficit?: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const saldo = payload[0].value;

  return (
    <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border)] p-3 shadow-lg">
      <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">
        {label}
      </p>
      <p
        className={`text-sm font-semibold ${
          saldo >= 0 ? "text-green-500" : "text-red-500"
        }`}
      >
        {formatCurrency(saldo)}
      </p>
    </div>
  );
}

export function CashflowGap({ data, gapDate, maxDeficit }: CashflowGapProps) {
  // Split data into positive and negative for dual coloring
  const chartData = useMemo(() => {
    return data.map((point) => ({
      date: point.date,
      saldoPositive: point.saldo >= 0 ? point.saldo : 0,
      saldoNegative: point.saldo < 0 ? point.saldo : 0,
      saldo: point.saldo,
    }));
  }, [data]);

  // Calculate days until gap
  const daysUntilGap = useMemo(() => {
    if (!gapDate) return null;
    const today = new Date();
    const gap = new Date(gapDate);
    return Math.ceil(
      (gap.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
  }, [gapDate]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-[var(--text-secondary)]">
        Nenhum dado de projecao disponivel.
      </div>
    );
  }

  return (
    <div>
      {gapDate && maxDeficit !== undefined && (
        <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm">
          <span className="font-medium text-amber-600 dark:text-amber-400">
            Caixa negativo em {daysUntilGap} dias
          </span>
          <span className="text-[var(--text-secondary)]">
            {" "}
            — Deficit maximo:{" "}
          </span>
          <span className="font-semibold text-red-500">
            {formatCurrency(maxDeficit)}
          </span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
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
          <ReferenceLine y={0} stroke="var(--text-secondary)" strokeWidth={1} />
          <Area
            type="monotone"
            dataKey="saldoPositive"
            stroke="var(--accent-green)"
            fill="var(--accent-green)"
            fillOpacity={0.2}
            strokeWidth={2}
            name="Saldo positivo"
          />
          <Area
            type="monotone"
            dataKey="saldoNegative"
            stroke="var(--accent-red)"
            fill="var(--accent-red)"
            fillOpacity={0.2}
            strokeWidth={2}
            name="Saldo negativo"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
