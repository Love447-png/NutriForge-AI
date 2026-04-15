import { Activity, IndianRupee, ShieldAlert, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import type { AnalysisResponse } from "../types/api";

export function ResultsSummaryStrip({ result }: { result: AnalysisResponse }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <SummaryCard icon={<ShieldAlert className="h-4 w-4" />} label="Overall Status" value={result.risk_status} />
      <SummaryCard icon={<Activity className="h-4 w-4" />} label="Signals" value={String(result.growth.signals.length || 1)} />
      <SummaryCard icon={<IndianRupee className="h-4 w-4" />} label="Daily Cost" value={`Rs ${result.nutrition.estimated_daily_cost_inr}`} />
      <SummaryCard icon={<Sparkles className="h-4 w-4" />} label="Vision Review" value={result.vision.available ? "Included" : "Skipped"} />
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[26px] border border-white/60 bg-white/65 p-4 shadow-glass backdrop-blur-xl">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-[0.2em]">{label}</span>
      </div>
      <p className="mt-3 font-display text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}
