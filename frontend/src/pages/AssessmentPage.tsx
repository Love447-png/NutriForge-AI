import { AnimatePresence, motion } from "framer-motion";
import { Cpu, RefreshCcw, ServerCog } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { EmptyStateCard } from "../components/EmptyStateCard";
import { HealthStatusCard } from "../components/HealthStatusCard";
import { InputPanel } from "../components/InputPanel";
import { InsightsPanel } from "../components/InsightsPanel";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { ResultsSummaryStrip } from "../components/ResultsSummaryStrip";
import { analyzeChild, getBackendHealth, type HealthPayload } from "../lib/api";
import type { AnalysisResponse, ChildProfile } from "../types/api";
import { useAssessmentHistory } from "../hooks/useAssessmentHistory";
import { useLocalAuth } from "../hooks/useLocalAuth";

export function AssessmentPage() {
  const navigate = useNavigate();
  const { user } = useLocalAuth();
  const { saveRecord } = useAssessmentHistory();
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [health, setHealth] = useState<(HealthPayload & { base: string }) | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const checkHealth = async () => {
    setHealthLoading(true);
    const response = await getBackendHealth();
    setHealth(response);
    setHealthLoading(false);
  };

  useEffect(() => {
    void checkHealth();
    const interval = window.setInterval(() => {
      void checkHealth();
    }, 5000);
    return () => window.clearInterval(interval);
  }, []);

  const handleSubmit = async (payload: ChildProfile, photo?: File | null) => {
    if (!health?.ok) {
      setNotice("The NutriForge local backend is offline. Start the FastAPI server on port 8000, then tap Retry connection.");
      return;
    }
    try {
      setLoading(true);
      setNotice(null);
      const analysis = await analyzeChild(payload, photo);
      setResult(analysis);
      saveRecord(analysis);
      setTimeout(() => {
        const resultsSection = document.getElementById("results-anchor");
        resultsSection?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch {
      setNotice("NutriForge could not complete the analysis. Please confirm the local backend is still running on 127.0.0.1:8000 and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <LoadingOverlay open={loading} />

      <div className="space-y-6">
        <section className="rounded-[34px] border border-white/60 bg-white/55 p-6 shadow-glass backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">Assessment Workspace</p>
              <h1 className="mt-4 font-display text-4xl font-bold text-ink sm:text-5xl">Child growth assessment</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Welcome back, {user?.name ?? "caregiver"}. Enter the child profile, run local AI analysis, and review a complete outcome with growth risk, projected trajectory, and affordable food actions.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void checkHealth()}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-5 py-3 text-sm font-semibold text-emerald-800"
              >
                <RefreshCcw className="h-4 w-4" />
                Retry connection
              </button>
              <button
                type="button"
                onClick={() => navigate("/history")}
                className="rounded-full border border-emerald-200 bg-white/80 px-5 py-3 text-sm font-semibold text-emerald-800"
              >
                View history
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <StatusCard
            icon={<ServerCog className="h-5 w-5" />}
            label="Backend"
            value={healthLoading ? "Checking..." : health?.ok ? "Connected" : "Offline"}
            tone={health?.ok ? "good" : "warn"}
          />
          <StatusCard
            icon={<Cpu className="h-5 w-5" />}
            label="RAG Store"
            value={healthLoading ? "Checking..." : health?.rag_ready ? "Ready" : "Rebuild Needed"}
            tone={health?.rag_ready ? "good" : "warn"}
          />
          <StatusCard
            icon={<Cpu className="h-5 w-5" />}
            label="Ollama"
            value={healthLoading ? "Checking..." : health?.ollama_reachable ? "Reachable" : "Optional / Offline"}
            tone={health?.ollama_reachable ? "good" : "neutral"}
          />
        </div>

        {health?.ok ? (
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/90 px-5 py-4 text-sm leading-6 text-emerald-800">
            Connected to local backend at <span className="font-semibold">{health.base}</span>.
          </div>
        ) : null}

        {notice ? (
          <div className="rounded-[24px] border border-amber-200 bg-amber-50/90 px-5 py-4 text-sm leading-6 text-amber-800">
            {notice}
          </div>
        ) : null}

        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="space-y-5"
            >
              <ResultsSummaryStrip result={result} />
              <section id="results-anchor" className="grid gap-6 xl:grid-cols-[1.02fr_1.18fr_1.05fr]">
                <InputPanel loading={loading} disabled={!health?.ok} onSubmit={handleSubmit} />
                <HealthStatusCard result={result} />
                <InsightsPanel result={result} />
              </section>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="grid gap-6 xl:grid-cols-[1.02fr_1.18fr_1.05fr]"
            >
              <InputPanel loading={loading} disabled={!health?.ok} onSubmit={handleSubmit} />
              <div className="xl:col-span-2">
                <EmptyStateCard />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function StatusCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "good" | "warn" | "neutral";
}) {
  const toneClass = {
    good: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    neutral: "bg-slate-100 text-slate-600",
  }[tone];

  return (
    <div className="rounded-[26px] border border-white/60 bg-white/65 p-4 shadow-glass backdrop-blur-xl">
      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${toneClass}`}>
        {icon}
        {label}
      </div>
      <p className="mt-4 font-display text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}
