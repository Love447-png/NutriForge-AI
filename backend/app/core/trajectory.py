from __future__ import annotations

"""
NFHS-5 calibrated trajectory projection for NutriForge.

Source references:
- NFHS-5 India report: http://rchiips.org/nfhs/NFHS-5_FCTS/India.pdf
- WHO child growth and velocity guidance used for monthly gain heuristics.

The goal of this module is deterministic trend projection for field decision
support. It returns both a no-action curve and an intervention curve so the UI
and PDF can compare likely outcomes over 3, 6, and 12 months.
"""

from typing import Any


NFHS5_STATE_DATA: dict[str, dict[str, float]] = {
    "bihar": {"stunting_rate": 42.9, "wasting_rate": 22.9, "underweight_rate": 41.0, "avg_wt_gain_per_month_6_24m": 0.18, "avg_ht_gain_per_month_6_24m": 0.72, "cmam_recovery_rate": 0.62},
    "uttar pradesh": {"stunting_rate": 39.7, "wasting_rate": 17.3, "underweight_rate": 32.1, "avg_wt_gain_per_month_6_24m": 0.18, "avg_ht_gain_per_month_6_24m": 0.71, "cmam_recovery_rate": 0.6},
    "madhya pradesh": {"stunting_rate": 35.7, "wasting_rate": 19.0, "underweight_rate": 33.0, "avg_wt_gain_per_month_6_24m": 0.17, "avg_ht_gain_per_month_6_24m": 0.69, "cmam_recovery_rate": 0.58},
    "rajasthan": {"stunting_rate": 31.8, "wasting_rate": 16.8, "underweight_rate": 27.6, "avg_wt_gain_per_month_6_24m": 0.17, "avg_ht_gain_per_month_6_24m": 0.68, "cmam_recovery_rate": 0.59},
    "jharkhand": {"stunting_rate": 39.6, "wasting_rate": 29.6, "underweight_rate": 39.4, "avg_wt_gain_per_month_6_24m": 0.17, "avg_ht_gain_per_month_6_24m": 0.69, "cmam_recovery_rate": 0.57},
    "odisha": {"stunting_rate": 31.0, "wasting_rate": 18.1, "underweight_rate": 29.7, "avg_wt_gain_per_month_6_24m": 0.17, "avg_ht_gain_per_month_6_24m": 0.7, "cmam_recovery_rate": 0.6},
    "gujarat": {"stunting_rate": 39.0, "wasting_rate": 25.1, "underweight_rate": 39.7, "avg_wt_gain_per_month_6_24m": 0.17, "avg_ht_gain_per_month_6_24m": 0.68, "cmam_recovery_rate": 0.57},
    "maharashtra": {"stunting_rate": 35.2, "wasting_rate": 25.6, "underweight_rate": 36.1, "avg_wt_gain_per_month_6_24m": 0.18, "avg_ht_gain_per_month_6_24m": 0.69, "cmam_recovery_rate": 0.61},
    "west bengal": {"stunting_rate": 33.8, "wasting_rate": 20.3, "underweight_rate": 31.8, "avg_wt_gain_per_month_6_24m": 0.18, "avg_ht_gain_per_month_6_24m": 0.7, "cmam_recovery_rate": 0.6},
    "assam": {"stunting_rate": 35.3, "wasting_rate": 21.7, "underweight_rate": 32.8, "avg_wt_gain_per_month_6_24m": 0.17, "avg_ht_gain_per_month_6_24m": 0.68, "cmam_recovery_rate": 0.58},
    "karnataka": {"stunting_rate": 30.8, "wasting_rate": 19.5, "underweight_rate": 28.1, "avg_wt_gain_per_month_6_24m": 0.18, "avg_ht_gain_per_month_6_24m": 0.7, "cmam_recovery_rate": 0.62},
    "tamil nadu": {"stunting_rate": 25.0, "wasting_rate": 14.8, "underweight_rate": 22.0, "avg_wt_gain_per_month_6_24m": 0.18, "avg_ht_gain_per_month_6_24m": 0.71, "cmam_recovery_rate": 0.66},
    "national average": {"stunting_rate": 35.5, "wasting_rate": 19.3, "underweight_rate": 32.1, "avg_wt_gain_per_month_6_24m": 0.17, "avg_ht_gain_per_month_6_24m": 0.69, "cmam_recovery_rate": 0.6},
}


def _state_data(state: str) -> dict[str, float]:
    return NFHS5_STATE_DATA.get(state.strip().lower(), NFHS5_STATE_DATA["national average"])


def _risk_level(whz: float, haz: float) -> str:
    if whz < -3 or haz < -3:
        return "critical"
    if whz < -2 or haz < -2:
        return "at_risk"
    if whz < -1 or haz < -1:
        return "monitor"
    return "safe"


def _age_factor(age_months: int) -> float:
    if age_months < 12:
        return 1.0
    if age_months < 24:
        return 0.9
    if age_months < 36:
        return 0.75
    return 0.62


def _build_curve(
    current_whz: float,
    current_haz: float,
    current_weight_kg: float,
    current_height_cm: float,
    age_months: int,
    state: str,
    intervention: bool,
) -> list[dict[str, Any]]:
    state_data = _state_data(state)
    age_adjustment = _age_factor(age_months)
    base_wt_gain = state_data["avg_wt_gain_per_month_6_24m"] * age_adjustment
    base_ht_gain = state_data["avg_ht_gain_per_month_6_24m"] * age_adjustment
    stunting_drag = state_data["stunting_rate"] / 100.0 * 0.04
    recovery_boost = 1 + state_data["cmam_recovery_rate"] * 0.45

    projections: list[dict[str, Any]] = []
    weight = current_weight_kg
    height = current_height_cm
    whz = current_whz
    haz = current_haz

    for month in range(1, 13):
        if intervention:
            weight += base_wt_gain * (recovery_boost + 0.18)
            height += base_ht_gain * (1 + state_data["cmam_recovery_rate"] * 0.34)
            whz = min(0.0, whz + 0.28 * recovery_boost)
            haz = min(0.0, haz + 0.21 * recovery_boost)
        else:
            weight += base_wt_gain * max(0.55, 1 - state_data["underweight_rate"] / 100.0)
            height += max(0.18, base_ht_gain - stunting_drag)
            whz -= 0.08 + state_data["wasting_rate"] / 1000.0
            haz -= 0.04 + state_data["stunting_rate"] / 1500.0

        projections.append(
            {
                "month": month,
                "weight_kg": round(weight, 2),
                "height_cm": round(height, 2),
                "whz": round(whz, 2),
                "haz": round(haz, 2),
                "risk_level": _risk_level(whz, haz),
            }
        )
    return projections


def project_trajectory(
    current_whz: float,
    current_haz: float,
    current_weight_kg: float,
    current_height_cm: float,
    age_months: int,
    sex: str,
    state: str,
    intervention: bool = False,
) -> dict[str, Any]:
    """
    Projects monthly weight, height, and z-score trend for 12 months.

    Returns both without-intervention and with-forge-plan curves on every call.
    """

    without_intervention = _build_curve(
        current_whz=current_whz,
        current_haz=current_haz,
        current_weight_kg=current_weight_kg,
        current_height_cm=current_height_cm,
        age_months=age_months,
        state=state,
        intervention=False,
    )
    with_forge_plan = _build_curve(
        current_whz=current_whz,
        current_haz=current_haz,
        current_weight_kg=current_weight_kg,
        current_height_cm=current_height_cm,
        age_months=age_months,
        state=state,
        intervention=True,
    )

    selected = with_forge_plan if intervention else without_intervention
    risk_at_3m = without_intervention[2]["risk_level"]
    risk_at_6m = without_intervention[5]["risk_level"]
    risk_at_12m = without_intervention[11]["risk_level"]
    improved_month = next((point["month"] for point in with_forge_plan if point["risk_level"] in {"safe", "monitor"}), 12)
    benefit_en = f"Child could improve toward a safer range by month {improved_month} with the forge plan."
    benefit_hi = f"फोर्ज प्लान के साथ बच्चा माह {improved_month} तक सुरक्षित श्रेणी के करीब आ सकता है।"

    return {
        "sex": sex,
        "state": state,
        "monthly_projections": selected,
        "without_intervention": without_intervention,
        "with_forge_plan": with_forge_plan,
        "risk_at_3m": risk_at_3m,
        "risk_at_6m": risk_at_6m,
        "risk_at_12m": risk_at_12m,
        "intervention_benefit": benefit_en,
        "intervention_benefit_hi": benefit_hi,
    }
