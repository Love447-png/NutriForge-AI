from __future__ import annotations

from app.models.schemas import ChildProfile, GrowthAssessment
from app.nutriforge.trajectory import project_growth_trajectory
from app.nutriforge.zscore_engine import calculate_haz, calculate_waz, calculate_whz, classify_nutrition_status
from app.services.risk_logic import compute_risk_signals, future_prediction_text, project_growth


def run_growth_agent(profile: ChildProfile) -> GrowthAssessment:
    status, signals, conditions, expected, weight_ratio, height_ratio = compute_risk_signals(profile)
    waz = calculate_waz(profile.weight_kg, profile.age_months, profile.sex)
    haz = calculate_haz(profile.height_cm, profile.age_months, profile.sex)
    whz = calculate_whz(profile.weight_kg, profile.height_cm, profile.sex)
    nutrition_classification = classify_nutrition_status(waz, haz, whz)
    status = nutrition_classification["status"] if nutrition_classification["status"] != "Healthy" or status == "Healthy" else status
    conditions = list(dict.fromkeys([*conditions, *nutrition_classification["flags"]]))
    trajectory = project_growth(profile, status)
    prediction = future_prediction_text(status, trajectory)
    trajectory_projection = project_growth_trajectory(profile.age_months, profile.state, waz, haz, whz, status)
    summary = {
        "Healthy": "Weight and height ratios are within the safe rule-based range for age.",
        "Needs Attention": "Weight or height ratio has fallen below the safe range, so the child needs a targeted feeding plan and closer follow-up.",
        "High Risk": "Weight ratio is severely below the expected range, so the child needs urgent follow-up and immediate feeding support.",
    }[status]
    confidence = min(0.93, 0.68 + (0.05 * len(signals)))
    return GrowthAssessment(
        status=status,
        summary=summary,
        signals=signals,
        expected_weight_kg=expected.min_weight_kg,
        expected_height_cm=expected.min_height_cm,
        weight_ratio=weight_ratio,
        height_ratio=height_ratio,
        waz=waz,
        haz=haz,
        whz=whz,
        detected_conditions=conditions,
        growth_prediction=prediction,
        trajectory_projection=trajectory_projection,
        trajectory=trajectory,
        confidence=confidence,
    )
