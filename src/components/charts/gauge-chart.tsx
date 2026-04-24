"use client";

import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";

interface GaugeChartProps {
  value: number;
  label: string;
  size?: number;
}

function getColor(value: number): string {
  if (value >= 90) return "#22C55E";
  if (value >= 70) return "#F59E0B";
  return "#EF4444";
}

export function GaugeChart({ value, label, size = 180 }: GaugeChartProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const color = getColor(clampedValue);

  const data = [
    {
      name: "background",
      value: 100,
      fill: "var(--border)",
    },
    {
      name: label,
      value: clampedValue,
      fill: color,
    },
  ];

  return (
    <div
      className="flex flex-col items-center"
      style={{ width: size, height: size + 30 }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="90%"
            startAngle={210}
            endAngle={-30}
            data={data}
            barSize={12}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={6}
              background={false}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-2xl font-bold"
            style={{ color }}
          >
            {clampedValue.toFixed(1).replace(".", ",")}%
          </span>
        </div>
      </div>
      <span className="text-xs text-[var(--text-secondary)] text-center mt-1">
        {label}
      </span>
    </div>
  );
}
