from __future__ import annotations

from dataclasses import dataclass

from app.models.schemas import ChildProfile
from app.services.risk_logic import expected_measurements


@dataclass
class ReasonAnalysis:
    risk: str
    issues: list[str]
    nutrient_gaps: list[str]
    priority: str
    why_this_happens: str
    expected_weight_kg: float
    expected_height_cm: float


def build_reason_analysis(profile: ChildProfile) -> ReasonAnalysis:
    expected = expected_measurements(profile.age_months)
    issues: list[str] = []
    nutrient_gaps: list[str] = []

    if profile.weight_kg < expected.min_weight_kg:
        issues.append("Low weight for age")
        nutrient_gaps.append("Calorie deficiency")
    if profile.height_cm < expected.min_height_cm:
        issues.append("Low height for age")
    if profile.weight_kg < expected.min_weight_kg - 0.5:
        nutrient_gaps.append("Protein deficiency")

    symptoms = (profile.symptoms or "").lower()
    if "low appetite" in symptoms:
        issues.append("Reduced appetite")
    if "diarrhea" in symptoms:
        issues.append("Recent poor absorption risk")
    if "fever" in symptoms:
        issues.append("Recent illness may reduce intake")

    if profile.weight_kg < expected.min_weight_kg and profile.height_cm < expected.min_height_cm:
        risk = "Underweight + Stunted"
    elif profile.weight_kg < expected.min_weight_kg:
        risk = "Underweight"
    elif profile.height_cm < expected.min_height_cm:
        risk = "Stunted"
    else:
        risk = "Normal"

    if "Protein deficiency" in nutrient_gaps and "Calorie deficiency" in nutrient_gaps:
        priority = "Increase calorie and protein intake"
    elif "Protein deficiency" in nutrient_gaps:
        priority = "Increase protein intake"
    elif "Calorie deficiency" in nutrient_gaps:
        priority = "Increase calorie intake"
    else:
        priority = "Maintain balanced meals and monthly monitoring"

    if issues:
        why = (
            f"Current weight is {profile.weight_kg} kg versus expected {expected.min_weight_kg} kg, "
            f"and height is {profile.height_cm} cm versus expected {expected.min_height_cm} cm. "
            f"This points to {', '.join(issues[:2]).lower()}."
        )
    else:
        why = "Current measurements are close to the expected band for age, with no strong growth warning signal."

    return ReasonAnalysis(
        risk=risk,
        issues=issues or ["No major growth issue detected"],
        nutrient_gaps=nutrient_gaps or ["No major nutrient gap detected"],
        priority=priority,
        why_this_happens=why,
        expected_weight_kg=expected.min_weight_kg,
        expected_height_cm=expected.min_height_cm,
    )
