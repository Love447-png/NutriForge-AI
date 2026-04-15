import type { AnalysisResponse } from "../types/api";

export type RiskDisplay = {
  label: string;
  color: string;
  bg: string;
};

const RISK_DISPLAY_MAP: Record<string, RiskDisplay> = {
  critical: { label: "Critical Risk", color: "#DC2626", bg: "#FEF2F2" },
  at_risk: { label: "At Risk", color: "#D97706", bg: "#FFFBEB" },
  monitor: { label: "Monitor", color: "#CA8A04", bg: "#FEFCE8" },
  safe: { label: "Safe", color: "#16A34A", bg: "#F0FDF4" },
  normal: { label: "Normal", color: "#16A34A", bg: "#F0FDF4" },
  healthy: { label: "Safe", color: "#16A34A", bg: "#F0FDF4" },
  "needs attention": { label: "Needs Attention", color: "#D97706", bg: "#FFFBEB" },
  "high risk": { label: "Critical Risk", color: "#DC2626", bg: "#FEF2F2" },
};

export function getRiskDisplay(level?: string | null): RiskDisplay {
  if (!level) return RISK_DISPLAY_MAP.monitor;
  return RISK_DISPLAY_MAP[level.toLowerCase()] ?? { label: toTitleCase(level), color: "#475569", bg: "#F8FAFC" };
}

export function formatChildName(name?: string | null) {
  const trimmed = name?.trim();
  if (!trimmed) return "Child";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function toTitleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getHeroAssessmentCopy(result: AnalysisResponse | null) {
  if (!result) {
    return "Complete the child profile to see a clear risk signal, a growth projection, and a localized forge plan.";
  }
  if (result.referral_required || result.risk_status === "High Risk") {
    return "Immediate action required — this child needs medical attention today.";
  }
  if (result.risk_status === "Needs Attention") {
    return "This child needs nutritional support. The forge plan below can help recover growth within 3–6 months.";
  }
  return "Growth is on track. Continue current feeding and schedule the next check-up in 3 months.";
}

export function getLifeStageLabel(ageMonths: number) {
  if (ageMonths <= 3) return "Early infancy";
  if (ageMonths <= 12) return "Weaning period";
  if (ageMonths <= 24) return "Critical growth window";
  return "Preschool age";
}

