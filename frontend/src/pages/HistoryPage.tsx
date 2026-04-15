import { Clock3, MoveRight } from "lucide-react";
import { Link } from "react-router-dom";

import { formatChildName, getRiskDisplay } from "../lib/presentation";
import { useAssessmentHistory } from "../hooks/useAssessmentHistory";

export function HistoryPage() {
  const { records, setCurrentRecord } = useAssessmentHistory();

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#1A7A4A]">Assessment History</p>
            <h1 className="mt-4 font-display text-4xl font-bold text-[#1C2B2B]">Past assessments</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Review saved child assessments, reopen reports, and continue follow-up care.</p>
          </div>
          <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-2xl bg-[#1A7A4A] px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.02]">
            New Assessment
            <MoveRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {records.length === 0 ? (
        <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Clock3 className="h-7 w-7" />
          </div>
          <h2 className="mt-5 font-display text-3xl font-bold text-[#1C2B2B]">No assessments yet</h2>
          <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">Run your first assessment to start building the child growth history on this device.</p>
          <Link to="/dashboard" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#1A7A4A] px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.02]">
            Start First Assessment
            <MoveRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record) => {
            const tone = getRiskDisplay(record.result.risk_status);
            return (
              <article key={record.id} className="rounded-[24px] border border-[#E5E7EB] bg-white p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{new Date(record.createdAt).toLocaleDateString()}</p>
                    <p className="mt-3 font-display text-2xl font-bold text-[#1C2B2B]">
                      {formatChildName(record.result.child.name)} — {record.result.child.age_months} months
                    </p>
                    <p className="mt-2 text-sm text-slate-600">{record.result.child.state}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full px-3 py-2 text-sm font-semibold" style={{ color: tone.color, backgroundColor: tone.bg }}>
                      {tone.label}
                    </span>
                    <Link
                      to="/dashboard"
                      onClick={() => setCurrentRecord(record.result)}
                      className="rounded-2xl border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#1A7A4A]"
                    >
                      View
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
