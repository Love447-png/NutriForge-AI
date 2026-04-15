import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-8 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#1A7A4A]">404</p>
      <h1 className="mt-3 font-display text-4xl font-bold text-[#1C2B2B]">Page not found</h1>
      <p className="mt-4 text-sm leading-7 text-slate-600">This page does not exist in NutriForge. Return to the dashboard to continue the assessment flow.</p>
      <Link to="/dashboard" className="mt-6 inline-flex rounded-2xl bg-[#1A7A4A] px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.02]">
        Go to Dashboard
      </Link>
    </section>
  );
}
