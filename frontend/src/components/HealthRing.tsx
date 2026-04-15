import { motion } from "framer-motion";

import type { RiskLevel } from "../types/api";

const statusConfig: Record<RiskLevel, { ring: string; accent: string; text: string }> = {
  Healthy: {
    ring: "from-[#86efac] via-[#4ade80] to-[#22c55e]",
    accent: "bg-emerald-50 text-emerald-700",
    text: "Growth signals look stable right now.",
  },
  "Needs Attention": {
    ring: "from-[#fde68a] via-[#fbbf24] to-[#f97316]",
    accent: "bg-amber-50 text-amber-700",
    text: "Your child needs more protein and closer follow-up.",
  },
  "High Risk": {
    ring: "from-[#fca5a5] via-[#f87171] to-[#ef4444]",
    accent: "bg-red-50 text-red-700",
    text: "Please seek clinical follow-up and act on the plan today.",
  },
};

export function HealthRing({
  status,
  summary,
}: {
  status: RiskLevel;
  summary?: string;
}) {
  const config = statusConfig[status];

  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
        className={`flex h-[320px] w-[320px] items-center justify-center rounded-full bg-gradient-to-br ${config.ring} p-[18px] shadow-[0_30px_90px_rgba(15,23,42,0.12)]`}
      >
        <motion.div
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ repeat: Infinity, duration: 4.2, ease: "easeInOut" }}
          className="flex h-full w-full items-center justify-center rounded-full border border-white/50 bg-white/85 backdrop-blur-2xl"
        >
          <div className="max-w-[210px] text-center">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${config.accent}`}>Status</span>
            <p className="mt-4 font-display text-4xl font-bold text-ink">{status}</p>
            <p className="mt-4 text-sm leading-6 text-slate-600">{summary ?? config.text}</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
