from __future__ import annotations

from app.models.schemas import AnalysisResponse, ChildProfile, GrowthAssessment, NutritionPlan, VisionAssessment


def run_coordinator_agent(
    profile: ChildProfile,
    growth: GrowthAssessment,
    vision: VisionAssessment,
    nutrition: NutritionPlan,
) -> AnalysisResponse:
    alerts: list[str] = []
    if growth.status == "High Risk":
        alerts.append("Urgent follow-up recommended with PHC/Anganwadi for anthropometry review.")
    if "swelling" in (profile.symptoms or "").lower():
        alerts.append("Reported swelling needs in-person medical assessment.")
    if not vision.available:
        alerts.append("Photo insight unavailable, so final confidence is based on growth rules only.")

    coordinator_summary = nutrition.summary
    return AnalysisResponse(
        child=profile,
        risk_status=growth.status,
        coordinator_summary=coordinator_summary,
        growth=growth,
        vision=vision,
        nutrition=nutrition,
        alerts=alerts,
    )
