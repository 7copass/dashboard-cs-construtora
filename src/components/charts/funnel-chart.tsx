"use client";

import { formatCurrency } from "@/lib/utils/format";

interface FunnelStage {
  label: string;
  count: number;
  value: number;
  color: string;
}

interface FunnelChartProps {
  stages: FunnelStage[];
  conversionRates: number[];
}

export function FunnelChart({ stages, conversionRates }: FunnelChartProps) {
  if (stages.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-[var(--text-secondary)]">
        Nenhum dado de pipeline disponivel.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center justify-center gap-0 min-w-[600px] py-6 px-4">
        {stages.map((stage, index) => {
          // Width decreases per stage: 100%, 70%, 45%
          const widthPercent = index === 0 ? 100 : index === 1 ? 70 : 45;
          const height = 140;

          return (
            <div key={stage.label} className="flex items-center">
              {/* Stage block */}
              <div className="flex flex-col items-center" style={{ width: 200 }}>
                <svg
                  width={200}
                  height={height}
                  viewBox={`0 0 200 ${height}`}
                  className="block"
                >
                  {/* Trapezoid shape */}
                  {(() => {
                    const fullW = 200;
                    const stageW = (widthPercent / 100) * fullW;
                    const offsetX = (fullW - stageW) / 2;
                    const nextWidthPercent =
                      index < stages.length - 1
                        ? index === 0
                          ? 70
                          : 45
                        : widthPercent * 0.7;
                    const nextW = (nextWidthPercent / 100) * fullW;
                    const nextOffsetX = (fullW - nextW) / 2;

                    return (
                      <polygon
                        points={`${offsetX},0 ${offsetX + stageW},0 ${nextOffsetX + nextW},${height} ${nextOffsetX},${height}`}
                        fill={stage.color}
                        opacity={0.85}
                        rx={8}
                      />
                    );
                  })()}
                  {/* Count */}
                  <text
                    x={100}
                    y={height / 2 - 18}
                    textAnchor="middle"
                    fill="white"
                    fontWeight="bold"
                    fontSize={28}
                  >
                    {stage.count}
                  </text>
                  {/* Label */}
                  <text
                    x={100}
                    y={height / 2 + 8}
                    textAnchor="middle"
                    fill="white"
                    fontSize={13}
                    fontWeight="500"
                  >
                    {stage.label}
                  </text>
                  {/* Value */}
                  <text
                    x={100}
                    y={height / 2 + 30}
                    textAnchor="middle"
                    fill="white"
                    fontSize={11}
                    opacity={0.9}
                  >
                    {formatCurrency(stage.value)}
                  </text>
                </svg>
              </div>

              {/* Arrow with conversion rate */}
              {index < stages.length - 1 && (
                <div className="flex flex-col items-center mx-2 shrink-0">
                  <div className="text-xs font-semibold text-[var(--text-primary)] mb-1">
                    {conversionRates[index] != null
                      ? `${conversionRates[index].toFixed(1).replace(".", ",")}%`
                      : "—"}
                  </div>
                  <svg width={40} height={24} viewBox="0 0 40 24">
                    <path
                      d="M2 12 L28 12 M22 6 L30 12 L22 18"
                      stroke="var(--text-secondary)"
                      strokeWidth={2}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
