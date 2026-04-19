import { AlertTriangle, ClipboardList, MapPinned, MoveRight, Plus, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { formatChildName, getRiskDisplay } from "../lib/presentation";
import { useAssessmentHistory } from "../hooks/useAssessmentHistory";

export function FieldPage() {
  const { records, setCurrentRecord } = useAssessmentHistory();
  const urgent = records.filter((record) => record.result.referral_required || record.result.risk_status === "High Risk");
  const followUps = records.filter((record) => record.result.risk_status === "Needs Attention");
  const safe = records.filter((record) => record.result.risk_status === "Healthy");

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-[#E5E7EB] bg-[linear-gradient(135deg,#071f15_0%,#0f3d2e_52%,#1A7A4A_100%)] p-6 text-white sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#F5A623]">ASHA Field Mode</p>
            <h1 className="mt-4 font-display text-5xl font-bold tracking-[-0.05em]">Today’s village nutrition queue</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/75">
              A simplified operating view for field visits: urgent referrals first, follow-ups next, and recent assessments ready to reopen.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <FieldMetric icon={<AlertTriangle className="h-5 w-5" />} label="Urgent" value={`${urgent.length}`} />
            <FieldMetric icon={<ClipboardList className="h-5 w-5" />} label="Follow-up" value={`${followUps.length}`} />
            <FieldMetric icon={<UsersRound className="h-5 w-5" />} label="Safe" value={`${safe.length}`} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <section className="rounded-[28px] border border-[#E5E7EB] bg-white p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0FDF4] text-[#1A7A4A]">
            <MapPinned className="h-7 w-7" />
          </div>
          <h2 className="mt-5 font-display text-3xl font-bold text-[#1C2B2B]">Visit protocol</h2>
          <div className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
            {[
              "Open urgent cases and confirm referral handoff first.",
              "For follow-ups, recheck weight, MUAC, appetite, and meal completion.",
              "If no internet is available, continue assessments and sync later.",
              "End each visit by giving one clear parent action in Hindi.",
            ].map((item) => (
              <div key={item} className="rounded-2xl bg-[#F9FAFB] px-4 py-3">
                {item}
              </div>
            ))}
          </div>
          <Link to="/dashboard" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1A7A4A] px-5 py-4 text-sm font-semibold text-white transition hover:scale-[1.02]">
            <Plus className="h-4 w-4" />
            New Assessment
          </Link>
        </section>

        <section className="rounded-[28px] border border-[#E5E7EB] bg-white p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#1A7A4A]">Case Queue</p>
              <h2 className="mt-2 font-display text-3xl font-bold text-[#1C2B2B]">Last assessments</h2>
            </div>
            <p className="text-sm text-slate-500">{records.length} saved on this device/account</p>
          </div>

          {records.length === 0 ? (
            <div className="mt-8 rounded-[24px] border border-dashed border-[#CBD5E1] bg-[#F9FAFB] p-8 text-center">
              <h3 className="font-display text-2xl font-bold text-[#1C2B2B]">No field cases yet</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Run an assessment to start building today’s queue.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-3">
              {records.slice(0, 8).map((record) => {
                const risk = getRiskDisplay(record.result.risk_status);
                return (
                  <article key={record.id} className="rounded-[24px] border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-2xl px-3 py-1 text-xs font-semibold" style={{ color: risk.color, backgroundColor: risk.bg }}>
                            {risk.label}
                          </span>
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{record.result.child.state}</span>
                        </div>
                        <p className="mt-3 font-display text-2xl font-bold text-[#1C2B2B]">
                          {formatChildName(record.result.child.name)} · {record.result.child.age_months} months
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {record.result.growth.detected_conditions.length > 0 ? record.result.growth.detected_conditions.join(", ") : "No active risk flags"}
                        </p>
                      </div>
                      <Link
                        to="/dashboard"
                        onClick={() => setCurrentRecord(record.result)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold text-[#1A7A4A]"
                      >
                        Open
                        <MoveRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function FieldMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
      <div className="flex items-center gap-2 text-white/70">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-[0.2em]">{label}</span>
      </div>
      <p className="mt-3 font-display text-4xl font-bold">{value}</p>
    </div>
  );
}
