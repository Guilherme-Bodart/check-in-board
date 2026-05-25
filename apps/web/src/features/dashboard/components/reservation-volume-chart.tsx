"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { chartTokens } from "../../../design-system/tokens";
import type { BoardSectionViewModel } from "../types";

export function ReservationVolumeChart({
  sections,
}: {
  sections: BoardSectionViewModel[];
}) {
  const data = sections.map((section) => ({
    name: section.title,
    total: section.count,
  }));

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            Visualização
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-text-primary">
            Volume operacional
          </h2>
        </div>
        <p className="text-sm text-text-secondary">
          Reservas distribuídas por seção do board
        </p>
      </div>
      <div className="mt-6 h-72">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={data}>
            <CartesianGrid
              stroke={chartTokens.border}
              strokeDasharray="4 4"
              vertical={false}
            />
            <XAxis
              axisLine={false}
              dataKey="name"
              tick={{ fill: chartTokens.textSecondary, fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tick={{ fill: chartTokens.textSecondary, fontSize: 12 }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: chartTokens.surface,
                border: `1px solid ${chartTokens.border}`,
                borderRadius: 12,
                color: chartTokens.textPrimary,
              }}
            />
            <Bar dataKey="total" fill={chartTokens.bar} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
