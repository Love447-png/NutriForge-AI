export function PrivacyPage() {
  return (
    <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#1A7A4A]">Privacy Policy</p>
      <h1 className="mt-3 font-display text-4xl font-bold text-[#1C2B2B]">Privacy Policy</h1>
      <div className="mt-6 space-y-4 text-sm leading-7 text-slate-600">
        <p>NutriForge stores all data locally on your device by default.</p>
        <p>When you enable cloud sync, data is encrypted and stored on Supabase servers located in India or Singapore.</p>
        <p>We never sell, share, or analyze your personal data.</p>
        <p>Child health data is encrypted at rest.</p>
        <p>You can delete all your data at any time from Settings.</p>
      </div>
    </section>
  );
}
