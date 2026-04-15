export type RiskLevel = "Healthy" | "Needs Attention" | "High Risk";

export type ChildProfile = {
  name?: string | null;
  age_months: number;
  sex: "male" | "female";
  height_cm: number;
  weight_kg: number;
  muac_mm?: number | null;
  state: string;
  region?: string | null;
  symptoms?: string | null;
  household_budget_inr?: number | null;
};

export type RiskSignal = {
  label: string;
  severity: "low" | "moderate" | "high";
  explanation: string;
};

export type GrowthProjectionPoint = {
  month_offset: number;
  projected_height_cm: number;
  projected_weight_kg: number;
  projected_risk: RiskLevel;
};

export type TrajectoryPoint = {
  month: number;
  weight_kg: number;
  height_cm: number;
  whz: number;
  haz: number;
  risk_level: "safe" | "monitor" | "at_risk" | "critical";
};

export type TrajectoryBundle = {
  sex: string;
  state: string;
  monthly_projections: TrajectoryPoint[];
  without_intervention: TrajectoryPoint[];
  with_forge_plan: TrajectoryPoint[];
  risk_at_3m: string;
  risk_at_6m: string;
  risk_at_12m: string;
  intervention_benefit: string;
  intervention_benefit_hi: string;
};

export type AnalysisResponse = {
  assessment_id?: string | null;
  child: ChildProfile;
  risk_status: RiskLevel;
  coordinator_summary: string;
  referral_required?: boolean;
  medical_disclaimer?: string;
  execution_trace?: string[];
  fallback_message?: string | null;
  growth: {
    status: RiskLevel;
    summary: string;
    signals: RiskSignal[];
    expected_weight_kg: number;
    expected_height_cm: number;
    weight_ratio: number;
    height_ratio: number;
    waz?: number;
    haz?: number;
    whz?: number;
    detected_conditions: string[];
    growth_prediction: string;
    trajectory_projection: {
      without_intervention: TrajectoryBundle;
      with_forge_plan: TrajectoryBundle;
    };
    trajectory: GrowthProjectionPoint[];
    confidence: number;
  };
  vision: {
    available: boolean;
    summary: string;
    indicators: string[];
    confidence: number;
  };
  nutrition: {
    status: RiskLevel;
    source?: string;
    summary: string;
    why_this_happens: string;
    budget_band: string;
    key_issues: string[];
    growth_prediction: string;
    future_risk: Record<string, string>;
    priority: string;
    confidence_score: string;
    daily_plan: Record<string, { meal: string; cost: string; reason: string; quantity?: string | null; nutrients?: string[]; name_hi?: string | null; name_en?: string | null }>;
    daily_actions: { title: string; detail: string; cost_inr: number }[];
    weekly_plan: { title: string; detail: string; cost_inr: number }[];
    weekly_focus: string[];
    recipes: { name: string; ingredients: string[]; instructions: string; cost_inr: number; frequency: string; reason: string }[];
    estimated_daily_cost_inr: number;
    retrieved_context: string[];
  };
  alerts: string[];
};

export type AssessmentInput = {
  child_name?: string | null;
  age_months: number;
  sex: "male" | "female";
  weight_kg: number;
  height_cm: number;
  muac_mm?: number | null;
  state: string;
  region: "urban" | "semi-urban" | "rural block" | "tribal";
  budget_inr: number;
  notes?: string | null;
  photo_base64?: string | null;
  language?: "hi" | "en";
};
