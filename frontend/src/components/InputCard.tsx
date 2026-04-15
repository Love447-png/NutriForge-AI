import { Camera, Mic, Wallet } from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import { motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { formatChildName, getLifeStageLabel } from "../lib/presentation";
import type { ChildProfile } from "../types/api";

type InputCardProps = {
  loading: boolean;
  engineReady: boolean;
  onPhotoPreviewChange?: (preview: string | null) => void;
  onSubmit: (payload: ChildProfile, photo?: File | null) => Promise<void>;
};

type InputFormState = {
  name: string;
  age_months: string;
  sex: ChildProfile["sex"];
  height_cm: string;
  weight_kg: string;
  muac_mm: string;
  state: string;
  region: string;
  symptoms: string;
  household_budget_inr: string;
};

const defaultForm: InputFormState = {
  name: "",
  age_months: "",
  sex: "female",
  height_cm: "",
  weight_kg: "",
  muac_mm: "",
  state: "Bihar",
  region: "Rural block",
  symptoms: "",
  household_budget_inr: "50",
};

const symptomChips = ["Low Appetite", "Fever", "Vomiting", "Fatigue", "Swelling", "Diarrhea"] as const;
const validRegions = ["urban", "semi-urban", "rural block", "tribal"] as const;
type ValidationErrors = Partial<Record<keyof InputFormState | "physiology", string>>;

function sanitizeNumericInput(raw: string, maxLength: number): string {
  const digitsOnly = raw.replace(/\D/g, "").slice(0, maxLength);
  if (!digitsOnly) return "";
  if (digitsOnly === "0") return "0";
  return digitsOnly.replace(/^0+/, "") || "0";
}

export function InputCard({ loading, engineReady, onPhotoPreviewChange, onSubmit }: InputCardProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<InputFormState>(defaultForm);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loadingLabel, setLoadingLabel] = useState("Running WHO assessment...");
  const dropRef = useRef<HTMLLabelElement | null>(null);
  const speechSupported = useMemo(() => "webkitSpeechRecognition" in window || "SpeechRecognition" in window, []);
  const numericAge = Number(form.age_months || 0);
  const numericHeight = Number(form.height_cm || 0);
  const numericWeight = Number(form.weight_kg || 0);
  const bmi = numericHeight && numericWeight ? numericWeight / ((numericHeight / 100) * (numericHeight / 100)) : null;
  const expectedWeight = numericAge ? (numericAge <= 12 ? numericAge / 2 + 4 : (numericAge / 12) * 2 + 8) : null;

  const validate = (state: InputFormState): ValidationErrors => {
    const nextErrors: ValidationErrors = {};
    const age = Number(state.age_months);
    const height = Number(state.height_cm);
    const weight = Number(state.weight_kg);
    const muac = state.muac_mm ? Number(state.muac_mm) : null;
    const budget = Number(state.household_budget_inr);

    if (!state.age_months || age < 1 || age > 60) nextErrors.age_months = "NutriForge supports 0–5 years.";
    if (!state.height_cm || height < 30 || height > 130) nextErrors.height_cm = "Height must be between 30 and 130 cm.";
    if (!state.weight_kg || weight < 1 || weight > 50) nextErrors.weight_kg = "Weight must be between 1.0 and 50.0 kg.";
    if (state.muac_mm && (muac === null || muac < 100 || muac > 200)) nextErrors.muac_mm = "MUAC must be between 100 and 200 mm.";
    if (!state.household_budget_inr || budget < 20 || budget > 500) nextErrors.household_budget_inr = "Budget must be between ₹20 and ₹500.";
    if (!state.state.trim()) nextErrors.state = "State is required.";
    if (!validRegions.includes(state.region.trim().toLowerCase() as (typeof validRegions)[number])) {
      nextErrors.region = "Choose urban, semi-urban, rural block, or tribal.";
    }

    if (height && weight) {
      const bmi = weight / ((height / 100) * (height / 100));
      if (bmi < 8 || bmi > 30) {
        nextErrors.physiology = "This weight/height combination is unusual. Please verify measurements.";
      }
    }

    return nextErrors;
  };

  const syncForm = (nextForm: InputFormState) => {
    setForm(nextForm);
    setErrors(validate(nextForm));
  };

  const formReady = Boolean(
    form.age_months &&
      form.height_cm &&
      form.weight_kg &&
      form.household_budget_inr &&
      form.state.trim() &&
      Object.keys(errors).filter((key) => key !== "physiology").length === 0,
  );

  const updateNumericField = (field: keyof Pick<InputFormState, "age_months" | "height_cm" | "weight_kg" | "household_budget_inr">, maxLength: number) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = sanitizeNumericInput(event.target.value, maxLength);
      const nextForm = { ...form, [field]: value };
      syncForm(nextForm);
    };

  const startVoiceInput = () => {
    const speechWindow = window as Window & {
      webkitSpeechRecognition?: new () => {
        lang: string;
        onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onerror?: (() => void) | null;
        onend?: (() => void) | null;
        start: () => void;
      };
      SpeechRecognition?: new () => {
        lang: string;
        onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onerror?: (() => void) | null;
        onend?: (() => void) | null;
        start: () => void;
      };
    };
    const Recognition = speechWindow.webkitSpeechRecognition ?? speechWindow.SpeechRecognition;
    if (!Recognition) {
      setVoiceMessage(t("voiceUnavailable"));
      return;
    }
    const recognition = new Recognition();
    setRecording(true);
    setVoiceMessage(null);
    recognition.lang = "en-IN";
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      syncForm({ ...form, symptoms: form.symptoms ? `${form.symptoms}, ${transcript}` : transcript });
      setRecording(false);
    };
    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);
    recognition.start();
  };

  const setPhotoFile = (file: File | null) => {
    setPhoto(file);
    if (!file) {
      setPhotoPreview(null);
      onPhotoPreviewChange?.(null);
      return;
    }
    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);
    onPhotoPreviewChange?.(preview);
  };

  const toggleSymptomChip = (chip: string) => {
    setSelectedSymptoms((current) => {
      const nextSelected = current.includes(chip) ? current.filter((item) => item !== chip) : [...current, chip];
      const manualEntries = form.symptoms
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item) => !symptomChips.includes(item as (typeof symptomChips)[number]));
      const nextSymptoms = [...manualEntries, ...nextSelected].join(", ");
      syncForm({ ...form, symptoms: nextSymptoms });
      return nextSelected;
    });
  };

  return (
    <motion.section
      whileHover={{ y: -4 }}
      className="rounded-[28px] border border-white/70 bg-white/60 p-5 shadow-glass backdrop-blur-2xl"
    >
        <div className="mb-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="rounded-2xl bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#1A7A4A]">Step 1 of 3</span>
        </div>
        <div className="mb-4 flex items-center gap-2">
          {["Child Info", "Measurements", "Symptoms"].map((step, index) => (
            <div key={step} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${index === 0 ? "bg-[#1A7A4A]" : "bg-slate-200"}`} />
              <span className="text-xs font-medium text-slate-500">{step}</span>
            </div>
          ))}
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#1A7A4A]">{t("childProfile")}</p>
        <h2 className="mt-2 font-display text-2xl font-bold text-ink">Assessment form</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">Capture the child profile and start a guided local assessment.</p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!formReady) return;
          setLoadingLabel("Running WHO assessment...");
          window.setTimeout(() => setLoadingLabel("Generating forge plan..."), 1000);
          void onSubmit(
            {
              name: form.name.trim() || undefined,
              age_months: Number(form.age_months),
              sex: form.sex,
              height_cm: Number(form.height_cm),
              weight_kg: Number(form.weight_kg),
              muac_mm: form.muac_mm ? Number(form.muac_mm) : undefined,
              state: form.state.trim(),
              region: form.region.trim().toLowerCase() || undefined,
              symptoms: form.symptoms.trim() || undefined,
              household_budget_inr: Number(form.household_budget_inr),
            },
            photo,
          );
        }}
      >
        <fieldset disabled={loading} className="space-y-4 disabled:cursor-not-allowed disabled:opacity-75">
        <Field label="Child name">
          <input className="input" type="text" placeholder="Enter child's name" value={form.name} onChange={(event) => syncForm({ ...form, name: formatChildName(event.target.value) === "Child" ? "" : formatChildName(event.target.value) })} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Age (months)">
            <input className="input" type="text" inputMode="numeric" placeholder="Enter age" value={form.age_months} onChange={updateNumericField("age_months", 2)} />
            {numericAge ? <p className="mt-2 text-xs text-slate-500">{numericAge} months · {getLifeStageLabel(numericAge)}</p> : null}
            {errors.age_months ? <p className="mt-2 text-xs text-red-600">{errors.age_months}</p> : null}
          </Field>
          <Field label="Sex">
            <div className="grid grid-cols-2 gap-2">
              {(["female", "male"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => syncForm({ ...form, sex: option })}
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${form.sex === option ? "border-[#1A7A4A] bg-emerald-50 text-[#1A7A4A]" : "border-slate-200 bg-white text-slate-600"}`}
                >
                  {option === "female" ? "Female" : "Male"}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Height (cm)">
            <input className="input" type="text" inputMode="numeric" placeholder="Enter height" value={form.height_cm} onChange={updateNumericField("height_cm", 3)} />
            {errors.height_cm ? <p className="mt-2 text-xs text-red-600">{errors.height_cm}</p> : null}
          </Field>
          <Field label="Weight (kg)">
            <input className="input" type="text" inputMode="numeric" placeholder="Enter weight" value={form.weight_kg} onChange={updateNumericField("weight_kg", 3)} />
            {expectedWeight ? <p className="mt-2 text-xs text-slate-500">Based on WHO standards, expected weight for this age: ~{expectedWeight.toFixed(1)}kg</p> : null}
            {errors.weight_kg ? <p className="mt-2 text-xs text-red-600">{errors.weight_kg}</p> : null}
          </Field>
        </div>

        {bmi ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            BMI: {bmi.toFixed(1)}
            {expectedWeight ? ` • Expected weight: ~${expectedWeight.toFixed(1)}kg` : ""}
          </div>
        ) : null}

        <Field label="MUAC (mm)">
          <input className="input" type="text" inputMode="numeric" placeholder="Optional MUAC measurement" value={form.muac_mm} onChange={(event) => syncForm({ ...form, muac_mm: sanitizeNumericInput(event.target.value, 3) })} />
          <p className="mt-2 text-xs text-slate-500">Mid-upper arm circumference at the midpoint of the upper arm.</p>
          {errors.muac_mm ? <p className="mt-2 text-xs text-red-600">{errors.muac_mm}</p> : null}
        </Field>

        <Field label="State">
          <input className="input" value={form.state} onChange={(event) => syncForm({ ...form, state: event.target.value })} />
          {errors.state ? <p className="mt-2 text-xs text-red-600">{errors.state}</p> : null}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Region">
            <div className="grid grid-cols-2 gap-2">
              {(["urban", "semi-urban", "rural block", "tribal"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => syncForm({ ...form, region: option })}
                  className={`rounded-2xl border px-3 py-3 text-xs font-semibold capitalize ${form.region.toLowerCase() === option ? "border-[#1A7A4A] bg-emerald-50 text-[#1A7A4A]" : "border-slate-200 bg-white text-slate-600"}`}
                >
                  {option}
                </button>
              ))}
            </div>
            {errors.region ? <p className="mt-2 text-xs text-red-600">{errors.region}</p> : null}
          </Field>
          <Field label="Budget">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                  <Wallet className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">Daily Budget</span>
                </div>
                <span className="text-sm font-semibold text-[#1A7A4A]">₹{form.household_budget_inr}/day</span>
              </div>
              <input
                className="w-full accent-[#1A7A4A]"
                type="range"
                min="20"
                max="300"
                step="5"
                value={form.household_budget_inr}
                onChange={(event) => syncForm({ ...form, household_budget_inr: event.target.value })}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">Meals will be planned within this budget.</p>
            {errors.household_budget_inr ? <p className="mt-2 text-xs text-red-600">{errors.household_budget_inr}</p> : null}
          </Field>
        </div>

        <Field label={t("symptoms")}>
          <textarea
            className="input min-h-28 resize-none"
            placeholder="Low appetite, tiredness, recent illness..."
            value={form.symptoms}
            onChange={(event) => {
              const value = event.target.value;
              syncForm({ ...form, symptoms: value });
              const parsedSelected = symptomChips.filter((chip) =>
                value
                  .split(",")
                  .map((item) => item.trim())
                  .includes(chip),
              );
              setSelectedSymptoms(parsedSelected as string[]);
            }}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          {symptomChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => toggleSymptomChip(chip)}
              className={`cursor-pointer rounded-full border border-[#d1d5db] px-3 py-1 text-[12px] ${
                selectedSymptoms.includes(chip) ? "bg-[#1A7A4A] text-white" : "bg-white text-slate-600"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        {errors.physiology ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {errors.physiology}
          </div>
        ) : null}

        <label
          ref={dropRef}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            setPhotoFile(event.dataTransfer.files?.[0] ?? null);
          }}
          className="flex cursor-pointer flex-col gap-3 rounded-[22px] border border-dashed border-emerald-200 bg-emerald-50/60 p-4 text-sm text-slate-600 transition hover:bg-emerald-50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-700">
              <Camera className="h-5 w-5" />
            </div>
            <span>{photo ? photo.name : t("uploadPhoto")}</span>
          </div>
          {photoPreview ? (
            <div className="flex items-center gap-3">
              <img src={photoPreview} alt="Preview" className="h-16 w-16 rounded-2xl object-cover" />
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  setPhotoFile(null);
                }}
                className="rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-600"
              >
                Remove
              </button>
            </div>
          ) : null}
          <input type="file" accept="image/*" className="hidden" onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)} />
        </label>

        {speechSupported ? (
          <button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600" onClick={startVoiceInput}>
            <span className={`relative flex h-4 w-4 items-center justify-center ${recording ? "text-red-500" : ""}`}>
              <Mic className="h-4 w-4" />
              {recording ? <span className="absolute inline-flex h-4 w-4 animate-ping rounded-full bg-red-400/60" /> : null}
            </span>
            Voice notes
          </button>
        ) : <p className="text-sm text-slate-500">{t("voiceUnavailable")}</p>}
        {voiceMessage ? <p className="text-sm text-slate-500">{voiceMessage}</p> : null}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading || !formReady}
          className="w-full rounded-[22px] bg-[#22c55e] px-5 py-4 text-base font-semibold text-white shadow-[0_20px_40px_rgba(34,197,94,0.3)] transition disabled:cursor-not-allowed disabled:opacity-80"
        >
          {loading ? loadingLabel : engineReady ? "Start Assessment" : "Start Assessment"}
        </motion.button>
        </fieldset>
      </form>
    </motion.section>
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
