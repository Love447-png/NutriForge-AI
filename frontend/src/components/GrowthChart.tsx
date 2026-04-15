import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Dot, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import whoReference from "../lib/who-growth-reference.json";
import { formatChildName, getRiskDisplay } from "../lib/presentation";
import type { ChildProfile, TrajectoryBundle } from "../types/api";

type ChartMode = "weight" | "height";

type GrowthChartProps = {
  trajectory?: {
    without_intervention: TrajectoryBundle;
    with_forge_plan: TrajectoryBundle;
  } | null;
  child: ChildProfile;
};

export function GrowthChart({ trajectory, child }: GrowthChartProps) {
  const [mode, setMode] = useState<ChartMode>("weight");
  const sexKey = child.sex === "male" ? "male" : "female";
  const withoutAction = trajectory?.without_intervention.without_intervention ?? [];
  const withPlan = trajectory?.with_forge_plan.with_forge_plan ?? [];
  const hasData = withoutAction.length > 0 || withPlan.length > 0;
  const displayName = formatChildName(child.name);

  const chartData = useMemo(() => {
    const months = Array.from({ length: 13 }, (_, index) => index);
    return months.map((month) => {
      const ageMonth = Math.max(0, Math.min(60, child.age_months + month));
      const ref = whoReference[sexKey][ageMonth];
      const withoutPoint = withoutAction.find((item) => item.month === month);
      const withPoint = withPlan.find((item) => item.month === month);
      return {
        month,
        currentValue: month === 0 ? (mode === "weight" ? child.weight_kg : child.height_cm) : null,
        withoutAction: withoutPoint ? (mode === "weight" ? withoutPoint.weight_kg : withoutPoint.height_cm) : null,
        withPlan: withPoint ? (mode === "weight" ? withPoint.weight_kg : withPoint.height_cm) : null,
        healthyLow: mode === "weight" ? ref.weight.p03 : ref.height.p03,
        healthyHigh: mode === "weight" ? ref.weight.p85 : ref.height.p85,
      };
    });
  }, [child.age_months, child.height_cm, child.weight_kg, mode, sexKey, withPlan, withoutAction]);

  const title = `${displayName}'s Growth (${child.age_months} months)`;

  const yDomain = useMemo(() => {
    const values = chartData.flatMap((row) => [row.currentValue, row.withoutAction, row.withPlan, row.healthyLow, row.healthyHigh].filter((value): value is number => typeof value === "number"));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = mode === "weight" ? 1.5 : 4;
    return [Math.max(0, Math.floor(min - padding)), Math.ceil(max + padding)];
  }, [chartData, mode]);

  const withPlanMilestones = [
    ["3M", trajectory?.with_forge_plan.with_forge_plan[2]?.risk_level ?? "monitor"],
    ["6M", trajectory?.with_forge_plan.with_forge_plan[5]?.risk_level ?? "monitor"],
    ["12M", trajectory?.with_forge_plan.with_forge_plan[11]?.risk_level ?? "safe"],
  ] as const;

  const withoutMilestones = [
    ["3M", trajectory?.without_intervention.risk_at_3m ?? "monitor"],
    ["6M", trajectory?.without_intervention.risk_at_6m ?? "monitor"],
    ["12M", trajectory?.without_intervention.risk_at_12m ?? "monitor"],
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-xl font-bold text-[#1C2B2B]">{title}</p>
          <p className="text-sm text-slate-500">Projected growth with and without nutrition support.</p>
        </div>
        <div className="inline-flex rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-1">
          <button type="button" onClick={() => setMode("weight")} className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${mode === "weight" ? "bg-white text-[#1A7A4A] shadow-sm" : "text-slate-500"}`}>Weight for Age</button>
          <button type="button" onClick={() => setMode("height")} className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${mode === "height" ? "bg-white text-[#1A7A4A] shadow-sm" : "text-slate-500"}`}>Height for Age</button>
        </div>
      </div>

      <div className="relative h-80 overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid stroke="#E5E7EB" vertical={false} />
            <ReferenceArea y1={10.5} y2={12.5} fill="#22c55e" fillOpacity={0.08} />
            <ReferenceArea y1={9} y2={10.5} fill="#f59e0b" fillOpacity={0.1} />
            <ReferenceArea y1={0} y2={9} fill="#ef4444" fillOpacity={0.1} />
            <ReferenceLine y={10.5} stroke="#f59e0b" strokeDasharray="4 2" />
            <Area dataKey="healthyHigh" stroke="none" fill="#D1D5DB" fillOpacity={0.18} />
            <Area dataKey="healthyLow" stroke="none" fill="#F7F9F7" fillOpacity={1} />
            <XAxis dataKey="month" tickFormatter={(value) => `${value}m`} tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} domain={yDomain} />
            <Tooltip />
            <Line dataKey="currentValue" stroke="#1A7A4A" strokeWidth={3} dot={<Dot r={4} fill="#1A7A4A" />} activeDot={{ r: 5 }} connectNulls={false} />
            <Line dataKey="withoutAction" stroke="#DC2626" strokeWidth={2.5} strokeDasharray="6 4" dot={false} connectNulls />
            <Line dataKey="withPlan" stroke="#1A7A4A" strokeWidth={2.5} strokeDasharray="6 4" dot={false} connectNulls />
          </AreaChart>
        </ResponsiveContainer>
        {!hasData ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-2xl bg-white/92 px-4 py-2 text-sm text-slate-500 shadow-sm">
              Growth data will appear after assessment
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-6 rounded-full bg-[#1A7A4A]" />current measurement</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-6 rounded-full border-t-2 border-dashed border-[#1A7A4A]" />with forge plan</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-6 rounded-full border-t-2 border-dashed border-[#DC2626]" />without intervention</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-6 rounded-full bg-slate-300" />WHO safe range</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <TrajectoryCard title="Without Action" tone="red" entries={withoutMilestones} />
        <TrajectoryCard title="With Forge Plan" tone="green" entries={withPlanMilestones} footer={trajectory?.with_forge_plan.intervention_benefit ?? "Forge plan benefit will appear after assessment."} />
      </div>
    </div>
  );
}

function TrajectoryCard({
  title,
  entries,
  footer,
  tone,
}: {
  title: string;
  entries: readonly (readonly [string, string])[];
  footer?: string;
  tone: "red" | "green";
}) {
  return (
    <div className={`rounded-[24px] border p-4 ${tone === "red" ? "border-red-100 bg-red-50/80" : "border-emerald-100 bg-emerald-50/80"}`}>
      <p className={`text-sm font-semibold ${tone === "red" ? "text-red-700" : "text-[#1A7A4A]"}`}>{title}</p>
      <div className="mt-3 grid gap-2">
        {entries.map(([label, value]) => {
          const display = getRiskDisplay(value);
          return (
            <div key={label} className="flex items-center justify-between rounded-2xl bg-white/85 px-3 py-2">
              <span className="text-sm text-slate-600">{label}</span>
              <span
                className="rounded-2xl px-3 py-1 text-xs font-semibold"
                style={{ color: display.color, backgroundColor: display.bg }}
              >
                {display.label}
              </span>
            </div>
          );
        })}
      </div>
      {footer ? <p className="mt-4 text-sm font-semibold text-[#1A7A4A]">{footer}</p> : null}
    </div>
  );
}
