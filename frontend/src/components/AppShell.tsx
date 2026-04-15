import type { PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";

import { useLocalAuth } from "../hooks/useLocalAuth";
import { Navbar } from "./Navbar";

export function AppShell({ children }: PropsWithChildren) {
  const { needsOnboarding, completeOnboarding, user } = useLocalAuth();

  return (
    <div className="min-h-screen bg-[#F7F9F7] text-[#1C2B2B]">
      <Navbar />

      <div className="mx-auto w-full max-w-[1320px] px-4 pb-10 sm:px-6 lg:px-8">{children}</div>

      <nav className="fixed bottom-3 left-1/2 z-40 flex w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white px-3 py-2 shadow-md md:hidden">
        {(user
          ? [
              ["/", "Home"],
              ["/dashboard", "Assess"],
              ["/history", "History"],
              ["/about", "About"],
            ]
          : [
              ["/", "Home"],
              ["/about", "About"],
              ["/signin", "Sign In"],
              ["/signup", "Start"],
            ]
        ).map(([to, label]) => (
          <NavLink key={`${to}-${label}`} to={to} className={({ isActive }) => `rounded-2xl px-3 py-2 text-xs font-semibold ${isActive ? "bg-[#1A7A4A] text-white" : "text-slate-500"}`}>
            {label}
          </NavLink>
        ))}
      </nav>

      {needsOnboarding ? <OnboardingModal onComplete={completeOnboarding} /> : null}
    </div>
  );
}

function OnboardingModal({ onComplete }: { onComplete: (payload: { state: string; languagePreference: "en" | "hi" }) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C2B2B]/40 p-4">
      <div className="w-full max-w-xl rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-md">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#1A7A4A]">Welcome to NutriForge</p>
        <h2 className="mt-3 font-display text-3xl font-bold">Set your defaults</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">Choose your state and preferred language so the dashboard starts in the right context.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">State</span>
            <select id="onboarding-state" className="input" defaultValue="Bihar">
              {["Bihar", "Uttar Pradesh", "Maharashtra", "Madhya Pradesh", "Rajasthan", "Jharkhand"].map((state) => (
                <option key={state}>{state}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Language</span>
            <select id="onboarding-language" className="input" defaultValue="en">
              <option value="en">English</option>
              <option value="hi">Hindi</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={() =>
            onComplete({
              state: (document.getElementById("onboarding-state") as HTMLSelectElement | null)?.value || "Bihar",
              languagePreference: (((document.getElementById("onboarding-language") as HTMLSelectElement | null)?.value || "en") as "en" | "hi"),
            })
          }
          className="mt-6 rounded-2xl bg-[#1A7A4A] px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.02]"
        >
          Done — Start Assessing →
        </button>
      </div>
    </div>
  );
}
