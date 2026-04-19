import { Activity, CalendarClock, ClipboardCheck, Home, MapPin, Siren, Utensils } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { formatChildName, getRiskDisplay } from "../lib/presentation";
import type { AnalysisResponse } from "../types/api";

const FOOD_INVENTORY = [
  "Rice",
  "Dal",
  "Sattu",
  "Chana",
  "Ragi",
  "Groundnut",
  "Banana",
  "Egg",
  "Milk",
  "Seasonal greens",
  "Curd",
  "Potato",
];

const CHECKLIST = [
  "Morning meal completed",
  "Lunch completed",
  "Evening snack completed",
  "Dinner completed",
  "No vomiting today",
  "Child was active/playful",
];

type InterventionHubProps = {
  result: AnalysisResponse | null;
};

export function InterventionHub({ result }: InterventionHubProps) {
  const storageKey = result?.assessment_id ? `nutriforge-adherence-${result.assessment_id}` : "nutriforge-adherence-draft";
  const inventoryKey = result?.assessment_id ? `nutriforge-foods-${result.assessment_id}` : "nutriforge-foods-draft";
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [foods, setFoods] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      setChecks(JSON.parse(localStorage.getItem(storageKey) || "{}") as Record<string, boolean>);
      setFoods(JSON.parse(localStorage.getItem(inventoryKey) || "{}") as Record<string, boolean>);
    } catch {
      setChecks({});
      setFoods({});
    }
  }, [inventoryKey, storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(checks));
  }, [checks, storageKey]);

  useEffect(() => {
    localStorage.setItem(inventoryKey, JSON.stringify(foods));
  }, [foods, inventoryKey]);

  const adherence = Math.round((Object.values(checks).filter(Boolean).length / CHECKLIST.length) * 100);
  const recoveryScore = useMemo(() => calculateRecoveryScore(result, adherence), [adherence, result]);
  const childName = formatChildName(result?.child.name);
  const selectedFoods = FOOD_INVENTORY.filter((item) => foods[item]);
  const nextActions = buildFollowUpActions(result);
  const swaps = buildFoodInventoryRecommendations(result, selectedFoods);

  if (!result) {
    return (
      <section className="rounded-[28px] border border-dashed border-[#CBD5E1] bg-white p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-[#1A7A4A]">
          <Activity className="h-8 w-8" />
        </div>
        <h2 className="mt-5 font-display text-3xl font-bold text-[#1C2B2B]">Intervention Hub unlocks after assessment</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          After analysis, NutriForge creates a recovery score, follow-up schedule, food inventory swaps, and ASHA action plan for the same child.
        </p>
      </section>
    );
  }

  const risk = getRiskDisplay(result.risk_status);

  return (
    <section className="space-y-6">
      <div className="rounded-[30px] border border-[#D1FAE5] bg-[linear-gradient(135deg,#071f15_0%,#0f3d2e_50%,#1A7A4A_100%)] p-6 text-white shadow-[0_30px_90px_rgba(15,23,42,0.16)]">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#F5A623]">Recovery command center</p>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em]">{childName}'s next 30 days</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
              This section turns the assessment into a care pathway: daily adherence, follow-up checks, household food swaps, and referral safeguards.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <CommandMetric label="Recovery Score" value={`${recoveryScore}/100`} helper="Updates with adherence" />
            <CommandMetric label="Adherence" value={`${adherence}%`} helper="Today’s care checklist" />
            <CommandMetric label="Risk" value={risk.label} helper={result.child.state} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[28px] border border-[#E5E7EB] bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0FDF4] text-[#1A7A4A]">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-[#1C2B2B]">Today’s adherence tracker</p>
              <p className="text-sm text-slate-500">Tick what actually happened at home.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {CHECKLIST.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setChecks((current) => ({ ...current, [item]: !current[item] }))}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  checks[item] ? "border-[#1A7A4A] bg-[#F0FDF4] text-[#166534]" : "border-[#E5E7EB] bg-[#F9FAFB] text-[#1C2B2B]"
                }`}
              >
                <span>{item}</span>
                <span>{checks[item] ? "Done" : "Pending"}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-[#E5E7EB] bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-[#F5A623]">
              <CalendarClock className="h-6 w-6" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-[#1C2B2B]">Follow-up protocol</p>
              <p className="text-sm text-slate-500">Clear next steps for parent and ASHA worker.</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3">
            {nextActions.map((action, index) => (
              <div key={action.title} className="grid gap-4 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 sm:grid-cols-[72px_1fr]">
                <div className="rounded-2xl bg-white px-3 py-2 text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Day</p>
                  <p className="font-display text-2xl font-bold text-[#1A7A4A]">{index === 0 ? "0" : index === 1 ? "7" : index === 2 ? "14" : "30"}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#1C2B2B]">{action.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{action.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[28px] border border-[#E5E7EB] bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0FDF4] text-[#1A7A4A]">
              <Home className="h-6 w-6" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-[#1C2B2B]">Family food inventory</p>
              <p className="text-sm text-slate-500">Select foods already available at home.</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {FOOD_INVENTORY.map((food) => (
              <button
                key={food}
                type="button"
                onClick={() => setFoods((current) => ({ ...current, [food]: !current[food] }))}
                className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                  foods[food] ? "border-[#1A7A4A] bg-[#1A7A4A] text-white" : "border-[#E5E7EB] bg-[#F9FAFB] text-slate-600"
                }`}
              >
                {food}
              </button>
            ))}
          </div>
          <div className="mt-6 grid gap-3">
            {swaps.map((swap) => (
              <div key={swap.title} className="rounded-2xl bg-[#F9FAFB] p-4">
                <p className="font-semibold text-[#1C2B2B]">{swap.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{swap.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-[28px] border p-6 ${result.referral_required || result.risk_status === "High Risk" ? "border-red-200 bg-red-50" : "border-[#E5E7EB] bg-white"}`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${result.referral_required || result.risk_status === "High Risk" ? "bg-red-100 text-red-700" : "bg-blue-50 text-blue-700"}`}>
              {result.referral_required || result.risk_status === "High Risk" ? <Siren className="h-6 w-6" /> : <MapPin className="h-6 w-6" />}
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-[#1C2B2B]">{result.referral_required || result.risk_status === "High Risk" ? "Referral workflow" : "Safety checkpoints"}</p>
              <p className="text-sm text-slate-500">Decision support for escalation.</p>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
            {(result.referral_required || result.risk_status === "High Risk"
              ? [
                  "Take the child to the nearest NRC or PHC today.",
                  "Carry this report and recent measurements.",
                  "Recheck MUAC and appetite before referral handoff.",
                  "Call ASHA supervisor if transport or family consent is delayed.",
                ]
              : [
                  "Recheck weight, height, and MUAC at next visit.",
                  "Escalate if appetite drops, swelling appears, or fever/vomiting persists.",
                  "Review meal completion and adjust plan using household foods.",
                  "Repeat assessment in 14 to 30 days based on progress.",
                ]
            ).map((item) => (
              <div key={item} className="rounded-2xl bg-white/80 px-4 py-3">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CommandMetric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-white/65">{helper}</p>
    </div>
  );
}

function calculateRecoveryScore(result: AnalysisResponse | null, adherence: number) {
  if (!result) return 0;
  const riskPenalty = result.risk_status === "High Risk" ? 34 : result.risk_status === "Needs Attention" ? 18 : 4;
  const signalPenalty = Math.min(24, result.growth.detected_conditions.length * 8);
  const muacBonus = result.child.muac_mm && result.child.muac_mm >= 125 ? 6 : 0;
  return Math.max(8, Math.min(96, 76 - riskPenalty - signalPenalty + Math.round(adherence * 0.22) + muacBonus));
}

function buildFollowUpActions(result: AnalysisResponse | null) {
  if (!result) return [];
  const highRisk = result.referral_required || result.risk_status === "High Risk";
  return [
    {
      title: highRisk ? "Escalate today" : "Start forge plan today",
      detail: highRisk ? "Contact PHC/NRC pathway and confirm transport or supervisor handoff." : "Begin the planned meals and mark completion in the adherence tracker.",
    },
    {
      title: "Check appetite and meal completion",
      detail: "Ask caregiver how many meal slots were completed and whether vomiting, fever, or diarrhea appeared.",
    },
    {
      title: "Repeat MUAC and weight",
      detail: "Compare measurements with this assessment and update the recovery score.",
    },
    {
      title: "Reassess growth trend",
      detail: "Run a new assessment and compare whether risk has improved, stayed stable, or worsened.",
    },
  ];
}

function buildFoodInventoryRecommendations(result: AnalysisResponse | null, selectedFoods: string[]) {
  if (!result) return [];
  if (selectedFoods.length === 0) {
    return [
      { title: "No foods selected yet", detail: "Choose what the family already has to generate practical swaps for the plan." },
    ];
  }
  const protein = selectedFoods.find((food) => ["Dal", "Sattu", "Chana", "Egg", "Milk", "Groundnut", "Curd"].includes(food));
  const energy = selectedFoods.find((food) => ["Rice", "Banana", "Potato", "Ragi"].includes(food));
  const greens = selectedFoods.find((food) => ["Seasonal greens", "Ragi"].includes(food));
  return [
    {
      title: protein ? `Protein anchor: ${protein}` : "Protein gap",
      detail: protein ? `Use ${protein.toLowerCase()} in one extra snack or meal slot today.` : "Add dal, chana, sattu, egg, milk, or groundnut if available in the market.",
    },
    {
      title: energy ? `Energy base: ${energy}` : "Calorie gap",
      detail: energy ? `Pair ${energy.toLowerCase()} with dal/chana/sattu so the child gets calories plus protein.` : "Add rice, banana, ragi, or potato to make the meal more energy dense.",
    },
    {
      title: greens ? `Micronutrient support: ${greens}` : "Micronutrient check",
      detail: greens ? `Use a small soft portion of ${greens.toLowerCase()} with lunch or dinner.` : "If possible, add seasonal greens or ragi 2–3 times a week.",
    },
  ];
}
