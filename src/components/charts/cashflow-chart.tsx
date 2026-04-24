"use client";

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
} from "recharts";
import { formatCurrency } from "@/lib/utils/format";

interface CashflowDataPoint {
  date: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

interface CashflowChartProps {
  data: CashflowDataPoint[];
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
  if (!active || !payload) return null;

  return (
    <div
      className="bg-[var(--bg-card)] border border-[var(--color-surface-200)] p-3 shadow-[var(--shadow-lg)]"
      style={{ borderRadius: 12 }}
    >
      <p className="text-xs font-medium text-[var(--color-surface-500)] mb-2">
        {label}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm">
          <span
            className="size-2.5 rounded-full shadow-inner"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[var(--color-surface-500)]">{entry.name}:</span>
          <span className="font-semibold text-[var(--color-surface-900)] dark:text-[var(--text-primary)]">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CashflowChart({ data }: CashflowChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          opacity={0.5}
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => formatCurrency(v)}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => formatCurrency(v)}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }}
        />
        <Bar
          yAxisId="left"
          dataKey="entradas"
          name="Entradas"
          fill="var(--accent-green)"
          radius={[4, 4, 0, 0]}
          stackId="cashflow"
        />
        <Bar
          yAxisId="left"
          dataKey="saidas"
          name="Saídas"
          fill="var(--accent-red)"
          radius={[4, 4, 0, 0]}
          stackId="cashflow"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="saldo"
          name="Saldo"
          stroke="var(--accent-blue)"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
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
  );
}
