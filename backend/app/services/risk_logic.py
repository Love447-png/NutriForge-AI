from __future__ import annotations

from typing import Optional

from app.core.config import settings
from app.models.schemas import ChildProfile, GrowthProjectionPoint, RiskSignal


class ExpectedMeasurements:
    def __init__(self, min_weight_kg: float, min_height_cm: float) -> None:
        self.min_weight_kg = min_weight_kg
        self.min_height_cm = min_height_cm


def expected_measurements(age_months: int) -> ExpectedMeasurements:
    age_years = age_months / 12
    if age_months <= 12:
        expected_weight = (age_months / 2) + 4
    else:
        expected_weight = (age_years * 2) + 8

    if age_years < 1:
        expected_height = 50 + (age_months * 2)
    else:
        expected_height = (age_years * 6) + 77

    return ExpectedMeasurements(
        min_weight_kg=round(expected_weight, 1),
        min_height_cm=round(expected_height, 1),
    )


def _severity_rank(risk: str) -> int:
    return {"Healthy": 0, "Needs Attention": 1, "High Risk": 2}[risk]


def compute_risk_signals(profile: ChildProfile) -> tuple[str, list[RiskSignal], list[str], ExpectedMeasurements, float, float]:
    threshold = expected_measurements(profile.age_months)
    signals: list[RiskSignal] = []
    conditions: list[str] = []
    weight_ratio = round(profile.weight_kg / threshold.min_weight_kg, 2) if threshold.min_weight_kg else 1.0
    height_ratio = round(profile.height_cm / threshold.min_height_cm, 2) if threshold.min_height_cm else 1.0

    weight_risk = "Healthy"
    if weight_ratio < 0.75:
        weight_risk = "High Risk"
        conditions.append("Underweight")
        signals.append(
            RiskSignal(
                label="Low weight for age",
                severity="high",
                explanation=f"Weight ratio is {weight_ratio}, which is below the 0.75 severe threshold.",
            )
        )
    elif weight_ratio < 0.9:
        weight_risk = "Needs Attention"
        conditions.append("Underweight")
        signals.append(
            RiskSignal(
                label="Low weight for age",
                severity="moderate",
                explanation=f"Weight ratio is {weight_ratio}, which is below the 0.90 attention threshold.",
            )
        )

    height_risk = "Healthy"
    if height_ratio < 0.9:
        height_risk = "Needs Attention"
        conditions.append("Stunted")
        signals.append(
            RiskSignal(
                label="Low height for age",
                severity="moderate",
                explanation=f"Height ratio is {height_ratio}, which is below the 0.90 stunting threshold.",
            )
        )

    bmi = profile.weight_kg / ((profile.height_cm / 100) ** 2)
    if bmi < 13.5:
        conditions.append("Low body reserve")
        signals.append(
            RiskSignal(
                label="Low body reserve",
                severity="moderate",
                explanation="Body mass is low for size, which can suggest wasting or recent poor intake.",
            )
        )

    final_risk = weight_risk if _severity_rank(weight_risk) >= _severity_rank(height_risk) else height_risk
    if final_risk == "Healthy" and bmi < 13.5:
        final_risk = "Needs Attention"

    return final_risk, signals, (conditions or ["Normal"]), threshold, weight_ratio, height_ratio


def project_growth(profile: ChildProfile, base_status: str, months: Optional[list[int]] = None) -> list[GrowthProjectionPoint]:
    months = months or [0, 3, 6, 9, 12]
    trajectory: list[GrowthProjectionPoint] = []
    for month in months:
        projected_height = round(profile.height_cm + settings.default_monthly_growth_cm * month, 1)
        projected_weight = round(profile.weight_kg + settings.default_monthly_weight_gain_kg * month, 1)
        projected_status = base_status
        future_threshold = expected_measurements(min(60, profile.age_months + month))
        future_weight_ratio = projected_weight / future_threshold.min_weight_kg if future_threshold.min_weight_kg else 1.0
        future_height_ratio = projected_height / future_threshold.min_height_cm if future_threshold.min_height_cm else 1.0
        if future_weight_ratio < 0.75:
            projected_status = "High Risk"
        elif future_weight_ratio < 0.9 or future_height_ratio < 0.9:
            projected_status = "Needs Attention"
        else:
            projected_status = "Healthy"
        trajectory.append(
            GrowthProjectionPoint(
                month_offset=month,
                projected_height_cm=projected_height,
                projected_weight_kg=projected_weight,
                projected_risk=projected_status,
            )
        )
    return trajectory


def future_prediction_text(status: str, trajectory: list[GrowthProjectionPoint]) -> str:
    if status == "Healthy":
        return "If current feeding continues, the child is likely to stay in the healthy band over the next 6 to 12 months."
    for point in trajectory[1:]:
        if point.projected_risk == "High Risk":
            return f"If no changes are made, child may move to higher risk in {point.month_offset} months."
    return "If no changes are made, the child may continue in the current risk band over the next 6 months."
