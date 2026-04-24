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

interface AgingFaixas {
  emDia: number;
  ate30: number;
  ate60: number;
  ate90: number;
  mais90: number;
}

interface AgingBarProps {
  faixas: AgingFaixas;
}

const AGING_COLORS = {
  emDia: "#22C55E",
  ate30: "#F59E0B",
  ate60: "#F97316",
  ate90: "#EF4444",
  mais90: "#991B1B",
};

const AGING_LABELS: Record<string, string> = {
  emDia: "Em dia",
  ate30: "1-30 dias",
  ate60: "31-60 dias",
  ate90: "61-90 dias",
  mais90: "90+ dias",
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    dataKey: string;
    color: string;
  }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border)] p-2 shadow-lg text-sm space-y-1">
      {payload
        .filter((p) => p.value > 0)
        .map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-[var(--text-secondary)]">
              {AGING_LABELS[p.dataKey] ?? p.name}:
            </span>
            <span className="font-medium text-[var(--text-primary)]">
              {formatCurrency(p.value)}
            </span>
          </div>
        ))}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderCustomizedLabel(props: any) {
  const { x = 0, y = 0, width = 0, height = 0, value = 0 } = props as {
    x?: number; y?: number; width?: number; height?: number; value?: number;
  };
  if (!value || value === 0 || width < 40) return null;

  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight="600"
    >
      {formatCurrency(value)}
    </text>
  );
}

export function AgingBar({ faixas }: AgingBarProps) {
  const total =
    faixas.emDia + faixas.ate30 + faixas.ate60 + faixas.ate90 + faixas.mais90;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-sm text-[var(--text-secondary)]">
        Nenhuma conta em aberto.
      </div>
    );
  }

  const chartData = [{ name: "Aging", ...faixas }];

  const keys = Object.keys(AGING_COLORS) as Array<keyof typeof AGING_COLORS>;

  return (
    <div>
      <ResponsiveContainer width="100%" height={80}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          barSize={40}
        >
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "transparent" }}
          />
          {keys.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="aging"
              fill={AGING_COLORS[key]}
              label={renderCustomizedLabel}
            >
              <Cell fill={AGING_COLORS[key]} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
        {keys.map((key) => (
          <div key={key} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: AGING_COLORS[key] }}
            />
            <span className="text-[var(--text-secondary)]">
              {AGING_LABELS[key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
