import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useLocalAuth } from "../hooks/useLocalAuth";

export function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useLocalAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"parent" | "asha_worker" | "ngo_staff">("parent");
  const [ashaWorkerId, setAshaWorkerId] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#1A7A4A]">Create Account</p>
        <h1 className="mt-3 font-display text-5xl font-bold text-[#1C2B2B]">Create Free Account</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
          Create a NutriForge account to save assessments, revisit history, and carry your preferred state and language into each visit.
        </p>

        <form
          className="mt-8 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!accepted) return;
            setError(null);
            void signup({
              name: name || "NutriForge User",
              email,
              password,
              role,
              ashaWorkerId: ashaWorkerId || null,
            })
              .then(() => navigate("/dashboard"))
              .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to create account"));
          }}
        >
          <Field label="Full Name">
            <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" />
          </Field>
          <Field label="Email">
            <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" />
          </Field>
          <Field label="Password">
            <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Create password" />
          </Field>
          <Field label="I am a">
            <div className="grid grid-cols-3 gap-2">
              {[
                ["parent", "Parent"],
                ["asha_worker", "ASHA Worker"],
                ["ngo_staff", "NGO Staff"],
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
          {role === "asha_worker" ? (
            <Field label="ASHA Worker ID">
              <input className="input" value={ashaWorkerId} onChange={(event) => setAshaWorkerId(event.target.value)} placeholder="Optional worker ID" />
            </Field>
          ) : null}
          <button type="button" className="flex w-full items-center justify-center rounded-2xl border border-[#E5E7EB] px-5 py-3 text-sm font-semibold text-[#1C2B2B] transition hover:scale-[1.02]">
            Sign up with Google
          </button>
          <label className="flex items-start gap-3 text-sm text-slate-600">
            <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
            <span>I understand this is not a medical device.</span>
          </label>
          {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <button type="submit" className="w-full rounded-2xl bg-[#1A7A4A] px-5 py-4 text-sm font-semibold text-white transition hover:scale-[1.02]">
            Create Free Account
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-500">
          Already have an account? <Link to="/signin" className="font-semibold text-[#1A7A4A]">Sign in</Link>
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-[24px] border border-[#E5E7EB] bg-[linear-gradient(180deg,#0f3d2e_0%,#1A7A4A_100%)] p-8 text-white">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h2 className="mt-6 font-display text-3xl font-bold">Built for responsible field use</h2>
        <p className="mt-4 text-base leading-7 text-white/80">
          Accounts unlock saved assessments and continuity of care, while guest mode still lets families and ASHA workers assess immediately.
        </p>
      </motion.div>
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
