"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils/format";

interface EtapaData {
  etapa: string;
  orcado: number;
  realizado: number;
}

interface EtapasBarChartProps {
  data: EtapaData[];
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
    <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border)] p-3 shadow-xl shadow-black/20 text-sm backdrop-blur-sm">
      <p className="font-medium text-[var(--text-primary)] mb-1.5 text-[13px]">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <div
            className="size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[var(--text-secondary)] text-[12px]">{entry.name}:</span>
          <span className="font-medium text-[var(--text-primary)] text-[12px]">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function EtapasBarChart({ data }: EtapasBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(300, data.length * 50)}>
      <BarChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <XAxis
          dataKey="etapa"
          tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
          axisLine={false}
          tickLine={false}
          interval={0}
          angle={-30}
          textAnchor="end"
          height={80}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => formatCurrency(v)}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)", paddingTop: "8px" }}
        />
        <Bar
          dataKey="orcado"
          name="Orçado"
          fill="#818CF8"
          radius={[4, 4, 0, 0]}
          opacity={0.6}
        />
        <Bar
          dataKey="realizado"
          name="Realizado"
          fill="#6366F1"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
