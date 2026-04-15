import { motion } from "framer-motion";

import type { AnalysisResponse } from "../types/api";
import { Panel } from "./Panel";

const statusConfig = {
  Healthy: { ring: "from-mint to-emerald-400", glow: "shadow-[0_0_90px_rgba(124,231,196,0.35)]" },
  "Needs Attention": { ring: "from-amber-300 to-coral", glow: "shadow-[0_0_90px_rgba(255,139,116,0.25)]" },
  "High Risk": { ring: "from-red-400 to-coral", glow: "shadow-[0_0_90px_rgba(248,113,113,0.28)]" },
} as const;

export function HealthStatusCard({ result }: { result: AnalysisResponse | null }) {
  const status = result?.risk_status ?? "Needs Attention";
  const config = statusConfig[status];

  return (
    <Panel title="Health Status" subtitle="Coordinator synthesis across growth, visual, and nutrition context." className="h-full">
      <div className="flex h-full min-h-[760px] flex-col justify-between gap-6">
        <div className="mx-auto flex w-full max-w-sm justify-center">
          <motion.div
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 3.5, repeat: Infinity }}
            className={`relative flex h-72 w-72 items-center justify-center rounded-full bg-gradient-to-br ${config.ring} ${config.glow}`}
          >
            <div className="absolute inset-4 rounded-full border border-white/30 bg-white/85 backdrop-blur-xl" />
            <div className="relative z-10 text-center">
              <p className="font-display text-4xl font-bold text-ink">{status}</p>
              <p className="mx-auto mt-3 max-w-48 text-sm text-slate-600">
                {result?.coordinator_summary ?? "Enter a profile to generate a coordinated offline nutrition assessment."}
              </p>
            </div>
          </motion.div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Growth confidence" value={result ? `${Math.round(result.growth.confidence * 100)}%` : "--"} />
          <Metric label="Photo signal" value={result?.vision.available ? `${Math.round(result.vision.confidence * 100)}%` : "N/A"} />
          <Metric label="Plan cost/day" value={result ? `Rs ${result.nutrition.estimated_daily_cost_inr}` : "--"} />
        </div>

        <div className="rounded-3xl bg-slate-950/90 p-4 text-slate-100">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Alerts</p>
          <div className="mt-3 space-y-2 text-sm">
            {(result?.alerts.length ? result.alerts : ["No alerts yet. NutriForge will surface referral guidance here."]).map((alert) => (
              <p key={alert} className="rounded-2xl bg-white/5 px-3 py-2">
                {alert}
              </p>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white/55 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}
