import { AlertTriangle, Cpu, ShieldCheck, Sparkles, Stethoscope, TrendingUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { ForgePlan } from "../components/ForgePlan";
import { GrowthChart } from "../components/GrowthChart";
import { InputCard } from "../components/InputCard";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { Panel } from "../components/Panel";
import { analyzeChild, getBackendHealth, type HealthPayload } from "../lib/api";
import { formatChildName, getHeroAssessmentCopy, getRiskDisplay } from "../lib/presentation";
import type { AnalysisResponse, ChildProfile } from "../types/api";
import { useAssessmentHistory } from "../hooks/useAssessmentHistory";

export function DashboardPage() {
  const { saveRecord, getCurrentRecord } = useAssessmentHistory();
  const [result, setResult] = useState<AnalysisResponse | null>(() => getCurrentRecord());
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<(HealthPayload & { base: string }) | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Running WHO growth assessment...");

  const engineReady = Boolean(health?.ok);

  useEffect(() => {
    const run = async () => setHealth(await getBackendHealth());
    void run();
    const timer = window.setInterval(() => void run(), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const handleSubmit = async (payload: ChildProfile, photo?: File | null) => {
    setError(null);
    setResult(null);
    setLoading(true);
    setLoadingMessage("Running WHO growth assessment...");
    const stageTwo = window.setTimeout(() => setLoadingMessage("Calculating trajectory..."), 2000);
    const stageThree = window.setTimeout(() => setLoadingMessage("Generating forge plan..."), 5000);
    try {
      if (!engineReady) {
        throw new Error("Assessment engine offline. Check that the NutriForge backend is running.");
      }
      const analysis = await analyzeChild(payload, photo);
      setResult(analysis);
      saveRecord(analysis);
      window.setTimeout(() => document.getElementById("dashboard-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unknown assessment error";
      setError(message);
    } finally {
      window.clearTimeout(stageTwo);
      window.clearTimeout(stageThree);
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    if (!result?.assessment_id || !health?.base) return;
    setExporting(true);
    try {
      const token = localStorage.getItem("nutriforge-access-token");
      const response = await fetch(`${health.base}/v1/export/${result.assessment_id}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `NutriForge_${result.assessment_id}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const heroMessage = useMemo(() => {
    if (loading) return loadingMessage;
    if (error) return error;
    return getHeroAssessmentCopy(result);
  }, [error, loading, loadingMessage, result]);

  const riskDisplay = getRiskDisplay(result?.risk_status);
  const riskMeterPosition = Math.max(6, Math.min(94, (result?.growth.confidence ?? 0.4) * 100));

  return (
    <>
      <LoadingOverlay open={loading} message={loadingMessage} />

      {result?.referral_required ? (
        <div className="sticky top-3 z-30 mb-6 rounded-2xl bg-[#DC2626] px-5 py-4 text-white shadow-md">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <p className="text-lg font-bold">IMMEDIATE REFERRAL REQUIRED</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-white/95">
                This child shows signs of Severe Acute Malnutrition. Take to the nearest Nutrition Rehabilitation Centre (NRC) or Primary Health Centre (PHC) today.
              </p>
              <p className="mt-2 text-sm leading-6 text-white/95">यह बच्चा गंभीर कुपोषण के लक्षण दिखा रहा है। आज ही नज़दीकी NRC या PHC ले जाएं।</p>
            </div>
            <button
              type="button"
              onClick={() => window.alert("Contact your local ASHA supervisor or PHC")}
              className="rounded-2xl border border-white/80 px-4 py-3 text-sm font-semibold text-white transition hover:scale-[1.02]"
            >
              Find Nearest NRC →
            </button>
          </div>
        </div>
      ) : null}

      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/90 px-5 py-4 text-sm leading-6 text-amber-900">
        For reference only — not a medical diagnosis. Consult a doctor or ANM for medical decisions.
        <br />
        केवल संदर्भ हेतु — चिकित्सीय निदान नहीं। चिकित्सा निर्णय के लिए डॉक्टर या एएनएम से सलाह लें।
      </div>

      <section className="mb-6 rounded-[28px] border border-[#E5E7EB] bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1A7A4A]">Health Status</p>
            <h1 className="mt-3 font-display text-4xl font-bold text-[#1C2B2B] sm:text-5xl">Is my child safe?</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[#4B5563]">{heroMessage}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {[
                { icon: <ShieldCheck className="h-4 w-4" />, label: "WHO-aligned" },
                { icon: <TrendingUp className="h-4 w-4" />, label: "12-month trajectory" },
                { icon: <Stethoscope className="h-4 w-4" />, label: "Localized care plan" },
              ].map((item) => (
                <div key={item.label} className="inline-flex items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm font-medium text-[#4B5563]">
                  {item.icon}
                  {item.label}
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatusPill icon={<ShieldCheck className="h-4 w-4" />} label="Assessment" value={engineReady ? "Ready" : "Offline"} />
            <StatusPill icon={<Cpu className="h-4 w-4" />} label="Guidance" value={health?.ollama_reachable ? "Enhanced" : "Standard"} />
            <StatusPill icon={<Sparkles className="h-4 w-4" />} label="Status" value={result ? "Result Ready" : loading ? "Assessing" : "Awaiting Input"} />
          </div>
        </div>
      </section>

      <section id="dashboard-results" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <InputCard loading={loading} engineReady={engineReady} onPhotoPreviewChange={setPhotoPreview} onSubmit={handleSubmit} />

        <motion.section whileHover={{ y: -2 }} className="rounded-[24px] border border-[#E5E7EB] bg-white p-6 lg:col-span-1">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#1A7A4A]">Health Status</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-[#1C2B2B]">Is my child safe?</h2>
            </div>
            {result ? (
              <div className="rounded-2xl px-4 py-2 text-sm font-semibold" style={{ color: riskDisplay.color, backgroundColor: riskDisplay.bg }}>
                {riskDisplay.label}
              </div>
            ) : null}
          </div>

          <div className="flex min-h-[360px] flex-col justify-between gap-6">
            {loading ? (
              <LoadingState message={loadingMessage} />
            ) : error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-left">
                <h3 className="text-[20px] font-bold text-red-700">Assessment failed: {error}</h3>
                <p className="mt-3 text-sm leading-6 text-red-700">Assessment engine offline. Check that the NutriForge backend is running.</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-4 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:scale-[1.02]"
                >
                  Retry
                </button>
              </div>
            ) : result ? (
              <>
                <div className={`rounded-[24px] border border-[#E5E7EB] p-5 ${result.risk_status === "High Risk" ? "bg-[linear-gradient(180deg,#ffffff_0%,#FFF1F2_100%)]" : result.risk_status === "Needs Attention" ? "bg-[linear-gradient(180deg,#ffffff_0%,#FFFBEB_100%)]" : "bg-[linear-gradient(180deg,#ffffff_0%,#F0FDF4_100%)]"}`}>
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${result.risk_status === "High Risk" ? "bg-red-100 text-red-600" : result.risk_status === "Needs Attention" ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}`}>
                      {result.risk_status === "High Risk" ? "✕" : result.risk_status === "Needs Attention" ? "⚠" : "✓"}
                    </div>
                    <div>
                      <p className="text-[32px] font-bold leading-none text-[#1C2B2B]">
                        {result.risk_status === "High Risk" ? "Critical — Refer Now" : result.risk_status === "Needs Attention" ? "Needs Attention" : "Child is Safe"}
                      </p>
                      <p className="mt-3 text-base leading-7 text-slate-700">{result.growth.summary}</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="relative h-3 rounded-full bg-gradient-to-r from-[#16A34A] via-[#CA8A04] to-[#DC2626]">
                      <div
                        className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-[#1A7A4A] bg-white shadow-sm transition-all duration-700 ease-out"
                        style={{ left: `${riskMeterPosition}%`, transform: "translate(-50%, -50%)" }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Safe</span>
                      <span>Needs Attention</span>
                      <span>Critical</span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric label="Confidence" value={result.nutrition.confidence_score} tooltip="Confidence reflects how clear the measurement signals are and how complete the child profile is." />
                  <Metric label="Daily Cost" value={`₹${result.nutrition.estimated_daily_cost_inr}`} />
                  <Metric label="Signals" value={`${result.growth.detected_conditions.length}`} />
                </div>

                <div className="rounded-2xl border-l-4 border-[#1A7A4A] bg-[#F9FAFB] p-5 text-[#1C2B2B]">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#1A7A4A]">Quick Guidance</p>
                  <p className="mt-3 text-lg font-semibold leading-8">{result.coordinator_summary}</p>
                  <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
                    {[result.nutrition.why_this_happens, ...result.growth.detected_conditions.slice(0, 2)].map((item) => (
                      <li key={item} className="rounded-2xl bg-white px-3 py-2">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2">
                  {result.growth.detected_conditions.map((condition) => {
                    const tone = condition.toLowerCase().includes("severe") ? getRiskDisplay("critical") : condition.toLowerCase().includes("under") || condition.toLowerCase().includes("stunt") ? getRiskDisplay("at_risk") : getRiskDisplay("monitor");
                    return (
                      <span key={condition} className="rounded-full px-3 py-1 text-xs font-semibold" style={{ color: tone.color, backgroundColor: tone.bg }}>
                        {condition}
                      </span>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={downloadReport}
                  disabled={exporting || !result?.assessment_id}
                  className="rounded-2xl bg-[#1A7A4A] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:scale-[1.02] disabled:opacity-60"
                >
                  {exporting ? "Exporting..." : "Export Official Report"}
                </button>
              </>
            ) : (
              <EmptyCenterState />
            )}
          </div>
        </motion.section>

        <div className="space-y-4 lg:col-span-2 2xl:col-span-1">
          <Panel title="Growth Chart" subtitle="Current measurement, WHO reference range, and projected trajectories.">
            <GrowthChart trajectory={result?.growth.trajectory_projection ?? null} child={result?.child ?? { age_months: 0, sex: "female", height_cm: 0, weight_kg: 0, state: "", region: "", household_budget_inr: 50 }} />
          </Panel>

          <ForgePlan result={result} />

          <Panel title="Future Risk" subtitle="Projected warning window if the current diet pattern continues.">
            {result ? (
              <div className="space-y-3">
                {Object.entries({
                  "3 Month": result.growth.trajectory_projection.without_intervention.risk_at_3m,
                  "6 Month": result.growth.trajectory_projection.without_intervention.risk_at_6m,
                  "12 Month": result.growth.trajectory_projection.without_intervention.risk_at_12m,
                }).map(([key, value]) => {
                  const display = getRiskDisplay(value);
                  return (
                    <div key={key} className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                      <div className="inline-flex items-center gap-2" style={{ color: display.color }}>
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em]">{key}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold" style={{ color: display.color }}>{display.label}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[22px] bg-slate-50 p-5 text-sm leading-6 text-slate-500">Future risk timelines will appear after the first assessment.</div>
            )}
          </Panel>

          <Panel title="Photo Insight" subtitle="Visual analysis is supplementary and appears after upload.">
            <div className="overflow-hidden rounded-[24px] bg-gradient-to-br from-emerald-50 via-white to-sky-50">
              <div className="relative p-4">
                <div className="mb-4 flex h-44 items-center justify-center rounded-[24px] bg-white/90 shadow-inner">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Uploaded child" className="h-full w-full rounded-[24px] object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-center text-slate-500">
                      <svg width="86" height="86" viewBox="0 0 86 86" fill="none" aria-hidden="true">
                        <circle cx="43" cy="22" r="12" fill="#E5F5EC" stroke="#1A7A4A" strokeWidth="2" />
                        <path d="M25 68C25 54 33 44 43 44C53 44 61 54 61 68" fill="#E5F5EC" stroke="#1A7A4A" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      <p className="max-w-52 text-sm">Upload photo for visual analysis</p>
                    </div>
                  )}
                </div>
                <div className="rounded-[22px] bg-white/90 p-4 shadow-[0_10px_25px_rgba(15,23,42,0.06)]">
                  <p className="text-sm leading-6 text-slate-700">{result ? result.vision.summary : "Visual assessment will appear here after a child photo is added and the assessment is complete."}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(result ? result.vision.indicators : ["Photo optional", "Offline-ready", "Supports local review"]).map((indicator) => (
                      <span key={indicator} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {indicator}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </section>

      <AnimatePresence>
        {!engineReady ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/90 px-5 py-4 text-sm leading-6 text-amber-800">
            Assessment engine offline. Check that the NutriForge backend is running.
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function EmptyCenterState() {
  return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-[28px] bg-[#F9FAFB] px-8 text-center">
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true" className="text-[#1A7A4A]">
        <rect x="14" y="14" width="52" height="52" rx="12" fill="currentColor" fillOpacity="0.08" />
        <path d="M24 52L34 41L42 47L56 31" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 58H58" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <circle cx="34" cy="41" r="3" fill="currentColor" />
        <circle cx="42" cy="47" r="3" fill="currentColor" />
        <circle cx="56" cy="31" r="3" fill="currentColor" />
      </svg>
      <h3 className="mt-6 text-[20px] font-bold text-[#1C2B2B]">Ready to assess</h3>
      <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">Complete the child profile and click Start Assessment to see the health status here.</p>
      <button type="button" onClick={() => document.getElementById("dashboard-results")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="mt-6 rounded-2xl bg-[#1A7A4A] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:scale-[1.02]">
        Start Assessment
      </button>
    </div>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-[28px] bg-[#F9FAFB] px-8 text-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-100 border-t-[#1A7A4A]" />
      <h3 className="mt-6 text-[20px] font-bold text-[#1C2B2B]">{message}</h3>
      <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">NutriForge is using the form values you entered to calculate growth, risk, and the plan.</p>
    </div>
  );
}

function StatusPill({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 transition hover:shadow-md">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-[0.2em]">{label}</span>
      </div>
      <p className="mt-2 font-display text-xl font-bold text-[#1C2B2B]">{value}</p>
    </div>
  );
}

function Metric({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
  return (
    <div className="group relative rounded-2xl border border-[#E5E7EB] bg-white p-4 transition hover:shadow-md">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-[#1C2B2B]">{value}</p>
      {tooltip ? (
        <div className="pointer-events-none absolute left-4 top-full z-10 mt-2 hidden w-56 rounded-2xl bg-[#1C2B2B] px-3 py-2 text-xs leading-5 text-white shadow-xl group-hover:block group-focus-within:block">
          {tooltip}
        </div>
      ) : null}
    </div>
  );
}
