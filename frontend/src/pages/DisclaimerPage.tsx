export function DisclaimerPage() {
  return (
    <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#1A7A4A]">Medical Disclaimer</p>
      <h1 className="mt-3 font-display text-4xl font-bold text-[#1C2B2B]">Medical Disclaimer</h1>
      <div className="mt-6 space-y-4 text-sm leading-7 text-slate-600">
        <p>NutriForge is a decision-support tool for child growth screening and nutrition planning.</p>
        <p>It uses WHO child growth standards and trajectory modeling to support field decisions, but it does not replace a qualified medical professional.</p>
        <p>Always consult a doctor, ANM, or pediatric specialist for medical care and referral decisions.</p>
        <p>WHO standards are used as a reference layer; this product is not a medical device.</p>
      </div>
    </section>
  );
}
