import { Flame } from "lucide-react";
import { motion } from "framer-motion";

import { formatChildName } from "../lib/presentation";
import type { AnalysisResponse } from "../types/api";
import { Panel } from "./Panel";

export function ForgePlan({ result }: { result: AnalysisResponse | null }) {
  if (!result) {
    return (
      <Panel title="Forge Plan" subtitle="Your localized meal plan will appear here after assessment.">
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Your forge plan will appear here</p>
          {[0, 1, 2].map((item) => (
            <div key={item} className="animate-pulse rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="h-6 w-12 rounded-full bg-slate-200" />
              </div>
              <div className="mt-3 h-5 w-40 rounded bg-slate-200" />
              <div className="mt-2 h-3 w-48 rounded bg-slate-200" />
              <div className="mt-4 flex gap-2">
                <div className="h-5 w-16 rounded-full bg-slate-200" />
                <div className="h-5 w-16 rounded-full bg-slate-200" />
                <div className="h-5 w-16 rounded-full bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    );
  }

  const childName = formatChildName(result.child.name);
  const actionItem = result.nutrition.daily_actions[0]?.detail ?? "Check weight and appetite at the next visit.";

  return (
    <Panel
      title="Forge Plan"
      subtitle="Meals selected for this child’s state and daily budget."
      className="border-[#E5E7EB] bg-white"
    >
      <div className="space-y-4">
        {result.nutrition.source === "fallback" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            AI plan unavailable — showing standard plan for {result.child.state}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-[#1C2B2B]">
            <Flame className="h-5 w-5 text-[#F5A623]" />
            <div>
              <p className="font-display text-lg font-bold">Forge Plan</p>
              <p className="text-xs text-slate-500">Practical meals matched to the child’s budget.</p>
            </div>
          </div>
          <span className="rounded-full bg-[#1A7A4A] px-4 py-2 text-xs font-semibold text-white">₹{result.nutrition.estimated_daily_cost_inr}/day</span>
        </div>

        <div className="h-px w-full bg-[#E5E7EB]" />

        <div className="grid gap-3">
          {Object.entries(result.nutrition.daily_plan).map(([slot, item], index) => {
            const tags = getNutritionTags(item);
            return (
              <motion.article
                key={slot}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.28 }}
                whileHover={{ y: -3 }}
                className="rounded-2xl border border-[#E5E7EB] bg-white p-4 transition hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-[#1C2B2B] capitalize">{formatSlot(slot)}</p>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#1A7A4A]">{item.cost}</span>
                </div>
                <p className="mt-3 text-[18px] font-bold text-[#1C2B2B]">
                  {item.name_hi || item.meal}
                  <span className="text-[14px] font-medium text-[#6B7280]"> / {item.name_en || item.meal}</span>
                </p>
                {item.quantity ? <p className="mt-2 text-xs text-[#6B7280]">📏 {item.quantity}</p> : null}
                <p className="mt-2 text-[13px] italic text-slate-500">{item.reason}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span key={`${slot}-${tag.label}`} className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${tag.className}`}>
                        {tag.label}
                      </span>
                    ))}
                  </div>
                  <button type="button" className="text-[11px] font-semibold text-[#1A7A4A]">
                    Swap this meal →
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>

        <div className="rounded-2xl bg-[#F0FDF4] p-4">
          <p className="text-[16px] font-bold text-[#166534]">{result.nutrition.summary}</p>
          <p className="mt-2 text-[13px] text-slate-600">
            {childName} should follow the meals above consistently for the next few weeks to improve intake and recovery.
          </p>
        </div>

        <div className={`rounded-2xl p-4 ${result.referral_required ? "bg-red-50 text-red-800" : "bg-blue-50 text-blue-900"}`}>
          <p className="text-sm font-semibold">{result.referral_required ? "Urgent for ASHA Worker" : "For ASHA Worker"}</p>
          <p className="mt-2 text-sm leading-6">{result.referral_required ? "Immediate referral is required. Recheck MUAC, appetite, and the referral handoff today." : `Next visit: ${actionItem}`}</p>
        </div>
      </div>
    </Panel>
  );
}

function formatSlot(slot: string) {
  if (slot === "evening") return "Evening Snack";
  return slot.charAt(0).toUpperCase() + slot.slice(1);
}

function getNutritionTags(item: AnalysisResponse["nutrition"]["daily_plan"][string]) {
  const source = `${item.meal} ${item.reason} ${item.quantity ?? ""}`.toLowerCase();
  const tagPool = [
    source.includes("dal") || source.includes("chana") || source.includes("sattu") || source.includes("egg")
      ? { label: "🥩 Protein", className: "bg-emerald-50 text-emerald-700" }
      : { label: "⚡ Energy", className: "bg-amber-50 text-amber-700" },
    source.includes("milk") || source.includes("ragi")
      ? { label: "🦴 Calcium", className: "bg-sky-50 text-sky-700" }
      : { label: "⚡ Energy", className: "bg-sky-50 text-sky-700" },
    source.includes("iron") || source.includes("chana") || source.includes("groundnut") || source.includes("dal")
      ? { label: "🩸 Iron", className: "bg-red-50 text-red-700" }
      : { label: "🌾 Growth", className: "bg-rose-50 text-rose-700" },
  ];
  return tagPool.slice(0, 3);
}
