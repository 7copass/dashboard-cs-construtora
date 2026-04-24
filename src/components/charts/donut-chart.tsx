"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_COLORS } from "@/lib/utils/colors";
import { formatCurrency } from "@/lib/utils/format";

interface DonutDataPoint {
  name: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  data: DonutDataPoint[];
}

/* Flup: Tooltip customizado com borderRadius 12px, borda surface-200, sombra custom */
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: DonutDataPoint }>;
}) {
  if (!active || !payload || !payload[0]) return null;
  const { name, value } = payload[0];

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

export function DonutChart({ data }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex items-center w-full h-[220px]">
      <div className="w-[200px] h-full shrink-0">
        <ResponsiveContainer width={200} height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              dataKey="value"
              strokeWidth={3}
              stroke="var(--bg-card)"
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Flup: Legendas em grid com dot shadow-inner e hover bg-surface-50 */}
      <div className="flex-1 min-w-0 pl-6 pr-2 h-full flex flex-col gap-2 overflow-y-auto py-2">
        {data.map((d, i) => {
          const color = d.color || CHART_COLORS[i % CHART_COLORS.length];
          const pct = total > 0 ? (d.value / total) * 100 : 0;
          const displayPct = pct > 0 && pct < 0.1 ? "< 0,1%" : pct.toFixed(1).replace(".", ",") + "%";

          return (
            <div
              key={d.name}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--color-surface-50)] transition-colors group cursor-default"
            >
              {/* Flup: Dot com shadow-inner para parecer botão táctil */}
              <div
                className="w-3 h-3 rounded-full shrink-0 shadow-inner"
                style={{ backgroundColor: color }}
              />
              <span
                className="text-[12px] font-medium text-[var(--color-surface-500)] truncate group-hover:text-[var(--color-surface-700)] transition-colors mr-auto"
                title={d.name}
              >
                {d.name}
              </span>
              <span className="text-[12px] font-medium text-[var(--color-surface-500)] tabular-nums shrink-0 ml-2">
                {formatCurrency(d.value)}
              </span>
              <span className="text-[12px] font-bold text-[var(--color-surface-900)] dark:text-[var(--text-primary)] tabular-nums shrink-0 ml-2 min-w-[44px] text-right">
                {displayPct}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
