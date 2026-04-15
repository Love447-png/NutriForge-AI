import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useLocalAuth } from "../hooks/useLocalAuth";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useLocalAuth();
  const [name, setName] = useState("NutriForge User");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"parent" | "asha_worker" | "ngo_staff">("asha_worker");
  const [error, setError] = useState<string | null>(null);

  const target = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-[24px] border border-[#E5E7EB] bg-white p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#1A7A4A]">Welcome Back</p>
        <h1 className="mt-3 font-display text-5xl font-bold text-[#1C2B2B]">Sign In</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
          Sign in to access your assessments, saved child records, and export history.
        </p>

        <form
          className="mt-8 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            void login({ name, email, password, role })
              .then(() => navigate(target))
              .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to sign in"));
          }}
        >
          <Field label="Email">
            <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" />
          </Field>
          <Field label="Password">
            <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" />
          </Field>
          <Field label="Profile">
            <div className="grid grid-cols-3 gap-2">
              {[
                ["parent", "Parent"],
                ["asha_worker", "ASHA"],
                ["ngo_staff", "NGO"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value as "parent" | "asha_worker" | "ngo_staff")}
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${role === value ? "border-[#1A7A4A] bg-emerald-50 text-[#1A7A4A]" : "border-[#E5E7EB] bg-white text-slate-600"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
          <button type="button" className="flex w-full items-center justify-center rounded-2xl border border-[#E5E7EB] px-5 py-3 text-sm font-semibold text-[#1C2B2B] transition hover:scale-[1.02]">
            Sign in with Google
          </button>
          {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <div className="text-right text-sm">
            <button type="button" className="font-semibold text-[#1A7A4A]">Forgot password?</button>
          </div>
          <button type="submit" className="w-full rounded-2xl bg-[#1A7A4A] px-5 py-4 text-sm font-semibold text-white transition hover:scale-[1.02]">
            Sign In
          </button>
        </form>
        <p className="mt-5 text-sm text-slate-500">
          New to NutriForge? <Link to="/signup" className="font-semibold text-[#1A7A4A]">Create account</Link>
        </p>
      </motion.div>

      <div className="rounded-[24px] border border-[#E5E7EB] bg-[linear-gradient(180deg,#0f3d2e_0%,#1A7A4A_100%)] p-8 text-white">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h2 className="mt-6 font-display text-3xl font-bold">Government-demo ready workflow</h2>
        <p className="mt-4 text-base leading-7 text-white/80">
          Save assessments, reopen reports, and keep continuity across follow-up visits without losing the local-first flow.
        </p>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#1C2B2B]">{label}</span>
      {children}
    </label>
  );
}
