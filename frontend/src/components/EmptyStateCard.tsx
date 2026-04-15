export function EmptyStateCard() {
  return (
    <div className="rounded-[30px] border border-white/60 bg-white/60 p-8 shadow-glass backdrop-blur-xl">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">Ready To Begin</p>
      <h3 className="mt-3 font-display text-3xl font-bold text-ink">Assessment results will appear here</h3>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
        Start with age, height, weight, and state details. NutriForge will generate a risk view, future growth forecast, and a low-cost food plan grounded in local guidance.
      </p>
    </div>
  );
}
