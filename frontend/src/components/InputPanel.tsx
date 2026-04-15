import { Mic, UploadCloud } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import type { ChildProfile } from "../types/api";
import { Panel } from "./Panel";

type InputPanelProps = {
  loading: boolean;
  disabled?: boolean;
  onSubmit: (payload: ChildProfile, photo?: File | null) => Promise<void>;
};

const defaultProfile: ChildProfile = {
  age_months: 24,
  sex: "female",
  height_cm: 80,
  weight_kg: 9.8,
  state: "Bihar",
  region: "Rural block",
  symptoms: "",
  household_budget_inr: 75,
};

export function InputPanel({ loading, disabled = false, onSubmit }: InputPanelProps) {
  const [form, setForm] = useState<ChildProfile>(defaultProfile);
  const [photo, setPhoto] = useState<File | null>(null);

  const speechSupported = useMemo(() => "webkitSpeechRecognition" in window || "SpeechRecognition" in window, []);

  const startVoiceInput = () => {
    const speechWindow = window as Window & {
      webkitSpeechRecognition?: new () => {
        lang: string;
        onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        start: () => void;
      };
      SpeechRecognition?: new () => {
        lang: string;
        onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        start: () => void;
      };
    };
    const Recognition = speechWindow.webkitSpeechRecognition ?? speechWindow.SpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = "en-IN";
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setForm((current) => ({ ...current, symptoms: transcript }));
    };
    recognition.start();
  };

  return (
    <Panel title="Child Intake" subtitle="Capture anthropometry, local context, and an optional photo." className="h-full">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit(form, photo);
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age (months)">
            <input className="input" type="number" value={form.age_months} onChange={(event) => setForm({ ...form, age_months: Number(event.target.value) })} />
          </Field>
          <Field label="Sex">
            <select className="input" value={form.sex} onChange={(event) => setForm({ ...form, sex: event.target.value as ChildProfile["sex"] })}>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Height (cm)">
            <input className="input" type="number" step="0.1" value={form.height_cm} onChange={(event) => setForm({ ...form, height_cm: Number(event.target.value) })} />
          </Field>
          <Field label="Weight (kg)">
            <input className="input" type="number" step="0.1" value={form.weight_kg} onChange={(event) => setForm({ ...form, weight_kg: Number(event.target.value) })} />
          </Field>
        </div>

        <Field label="State">
          <input className="input" value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Region">
            <input className="input" value={form.region ?? ""} onChange={(event) => setForm({ ...form, region: event.target.value })} />
          </Field>
          <Field label="Daily Budget (Rs)">
            <input className="input" type="number" value={form.household_budget_inr ?? 80} onChange={(event) => setForm({ ...form, household_budget_inr: Number(event.target.value) })} />
          </Field>
        </div>

        <Field label="Symptoms / Notes">
          <textarea
            className="input min-h-28 resize-none"
            placeholder="Low appetite, recent diarrhea, low energy..."
            value={form.symptoms ?? ""}
            onChange={(event) => setForm({ ...form, symptoms: event.target.value })}
          />
        </Field>

        <div className="rounded-3xl border border-dashed border-slate-300/80 bg-white/60 p-4">
          <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-600">
            <UploadCloud className="h-5 w-5 text-ocean" />
            <span>{photo ? photo.name : "Upload child photo for local visual screening"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} />
          </label>
        </div>

        {speechSupported ? (
          <button type="button" className="flex items-center gap-2 text-sm font-semibold text-ink" onClick={startVoiceInput}>
            <Mic className="h-4 w-4" />
            Dictate symptoms
          </button>
        ) : null}

        <button
          type="submit"
          disabled={loading || disabled}
          className="w-full rounded-2xl bg-ink px-4 py-3 font-semibold text-white transition hover:translate-y-[-1px] hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Analyzing..." : disabled ? "Backend offline" : "Run NutriForge"}
        </button>
      </form>
    </Panel>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
