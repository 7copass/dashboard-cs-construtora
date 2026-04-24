"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils/format";

interface ObraData {
  obra: string;
  obraId: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

interface FluxoPorObraChartProps {
  data: ObraData[];
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
      <p className="text-xs font-medium text-[var(--text-secondary)] mb-2 max-w-[200px] truncate">
        {label}
      </p>
      {payload.map((entry) => (
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

export function FluxoPorObraChart({ data }: FluxoPorObraChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-[var(--text-secondary)]">
        Nenhum dado de fluxo por obra disponivel.
      </div>
    );
  }

  // Truncate obra names for display
  const chartData = data.map((d) => ({
    ...d,
    obraLabel:
      d.obra.length > 25 ? d.obra.slice(0, 22) + "..." : d.obra,
  }));

  const chartHeight = Math.max(300, data.length * 50);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          opacity={0.5}
          horizontal={false}
        />
        <XAxis
          type="number"
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
          type="category"
          dataKey="obraLabel"
          width={160}
          tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }}
        />
        <Bar
          dataKey="entradas"
          name="Entradas"
          fill="var(--accent-green)"
          radius={[0, 4, 4, 0]}
          barSize={16}
        />
        <Bar
          dataKey="saidas"
          name="Saidas"
          fill="var(--accent-red)"
          radius={[0, 4, 4, 0]}
          barSize={16}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
