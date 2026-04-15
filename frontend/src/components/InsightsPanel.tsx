import { Eye, Sparkles, Utensils } from "lucide-react";
import type { ReactNode } from "react";

import type { AnalysisResponse } from "../types/api";
import { GrowthChart } from "./GrowthChart";
import { Panel } from "./Panel";

export function InsightsPanel({ result }: { result: AnalysisResponse | null }) {
  if (!result) {
    return (
      <div className="space-y-4">
        <Panel title="Insights" subtitle="Visual review, forecast, and forge plan will appear here.">
          <p className="text-sm text-slate-500">Run the first assessment to populate charts, risk signals, and localized recommendations.</p>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <GrowthChart trajectory={result.growth.trajectory_projection} child={result.child} />

      <Panel title="Photo Insight" subtitle="Vision agent output from optional local image review.">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-ocean/15 p-3 text-ocean">
            <Eye className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm leading-6 text-slate-700">{result.vision.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {result.vision.indicators.map((indicator) => (
                <span key={indicator} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {indicator}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Forge Plan" subtitle="Daily actions, weekly structure, and budget-aware recipes.">
        <div className="space-y-3">
          {result.nutrition.daily_actions.map((action) => (
            <CardRow key={action.title} icon={<Sparkles className="h-4 w-4" />} title={action.title} detail={`${action.detail} ${action.cost_inr ? `(Rs ${action.cost_inr})` : ""}`} />
          ))}
          {result.nutrition.weekly_plan.map((action) => (
            <CardRow key={action.title} icon={<Utensils className="h-4 w-4" />} title={action.title} detail={`${action.detail} ${action.cost_inr ? `(Rs ${action.cost_inr})` : ""}`} />
          ))}
          {result.nutrition.recipes.map((recipe) => (
            <div key={recipe.name} className="rounded-3xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-lg font-semibold text-ink">{recipe.name}</p>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">Rs {recipe.cost_inr}</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">{recipe.ingredients.join(" • ")}</p>
              <p className="mt-3 text-sm text-slate-700">{recipe.instructions}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Knowledge Context" subtitle="RAG snippets used to ground the nutrition advice.">
        <div className="space-y-3 text-sm text-slate-600">
          {result.nutrition.retrieved_context.map((item) => (
            <div key={item} className="rounded-2xl bg-white/60 p-3">
              {item}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function CardRow({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <div className="flex gap-3 rounded-3xl bg-slate-50 p-4">
      <div className="mt-0.5 rounded-2xl bg-white p-2 text-ink">{icon}</div>
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <p className="mt-1 text-sm text-slate-600">{detail}</p>
      </div>
    </div>
  );
}
