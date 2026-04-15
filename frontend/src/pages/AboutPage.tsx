export function AboutPage() {
  return (
    <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#1A7A4A]">About NutriForge</p>
      <h1 className="mt-3 font-display text-4xl font-bold text-[#1C2B2B]">About</h1>
      <div className="mt-6 space-y-4 text-sm leading-7 text-slate-600">
        <p>NutriForge was built to help ASHA workers, caregivers, and public-health teams detect child growth risk early and act with practical nutrition guidance.</p>
        <p>The platform combines a deterministic WHO LMS-based screening engine, NFHS-5 calibrated trajectory projection, and localized meal planning.</p>
        <p>GitHub: private repository available on request for technical review.</p>
        <p>Contact: hello@nutriforge.health</p>
      </div>
    </section>
  );
}
