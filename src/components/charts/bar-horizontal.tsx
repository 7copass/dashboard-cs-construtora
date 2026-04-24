"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from "recharts";
import { formatCurrency } from "@/lib/utils/format";

interface BarDataPoint {
  name: string;
  value: number;
  id?: string;
}

interface BarHorizontalProps {
  data: BarDataPoint[];
  onClick?: (id: string | undefined) => void;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: BarDataPoint }>;
}) {
  if (!active || !payload || !payload[0]) return null;
  const { name, value } = payload[0].payload;

  return (
    <div
      className="bg-[var(--bg-card)] border border-[var(--color-surface-200)] p-3 shadow-[var(--shadow-lg)] text-sm"
      style={{ borderRadius: 12 }}
    >
      <span className="text-[var(--color-surface-500)]">{name}: </span>
      <span className="font-semibold text-[var(--color-surface-900)] dark:text-[var(--text-primary)]">
        {formatCurrency(value)}
      </span>
    </div>
  );
}

export function BarHorizontal({ data, onClick }: BarHorizontalProps) {
  const sorted = [...data].sort((a, b) => b.value - a.value);

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, sorted.length * 40)}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 0, right: 80, bottom: 0, left: 10 }}
      >
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-primary-400)" stopOpacity={0.85} />
            <stop offset="100%" stopColor="var(--color-primary-600)" stopOpacity={1} />
          </linearGradient>
        </defs>
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => formatCurrency(v)}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--bg-card-hover)", opacity: 0.5 }} />
        <Bar
          dataKey="value"
          fill="url(#barGradient)"
          radius={[0, 4, 4, 0]}
          cursor={onClick ? "pointer" : undefined}
          onClick={(data: unknown) => {
            const entry = data as BarDataPoint;
            onClick?.(entry?.id);
          }}
          label={{
            position: "right",
            formatter: (v: unknown) => formatCurrency(Number(v) || 0),
            fill: "var(--text-secondary)",
            fontSize: 11,
          }}
        >
          {sorted.map((_, index) => (
            <Cell key={index} fill="url(#barGradient)" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
