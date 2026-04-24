"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ConversaoMensalData {
  month: string;
  taxa: number;
}

interface ConversaoMensalChartProps {
  data: ConversaoMensalData[];
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

  return (
    <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border)] p-3 shadow-lg">
      <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">
        {label}
      </p>
      <p className="text-sm font-semibold text-[var(--text-primary)]">
        {payload[0].value.toFixed(1).replace(".", ",")}%
      </p>
    </div>
  );
}

export function ConversaoMensalChart({ data }: ConversaoMensalChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-[var(--text-secondary)]">
        Nenhum dado de conversao disponivel.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={data}
        margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          opacity={0.5}
        />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}%`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="taxa"
          name="Taxa de Conversao"
          stroke="#3B82F6"
          strokeWidth={2.5}
          dot={{ fill: "#3B82F6", r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
