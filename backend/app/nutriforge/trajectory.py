from __future__ import annotations

from dataclasses import dataclass


STATE_STUNTING_FACTOR = {
    "bihar": 1.08,
    "uttar pradesh": 1.06,
    "madhya pradesh": 1.05,
    "maharashtra": 0.98,
    "tamil nadu": 0.94,
    "kerala": 0.9,
    "default": 1.0,
}


@dataclass
class ProjectionPoint:
    month: int
    scenario: str
    waz: float
    haz: float
    whz: float


def _monthly_weight_gain(age_months: int) -> float:
    if age_months < 12:
        return 0.18
    if age_months < 24:
        return 0.16
    if age_months < 36:
        return 0.14
    return 0.12


def _monthly_height_gain(age_months: int) -> float:
    if age_months < 12:
        return 0.7
    if age_months < 24:
        return 0.55
    if age_months < 36:
        return 0.48
    return 0.42


def project_growth_trajectory(age_months: int, state: str, waz: float, haz: float, whz: float, risk_status: str) -> dict:
    state_factor = STATE_STUNTING_FACTOR.get(state.strip().lower(), STATE_STUNTING_FACTOR["default"])
    risk_penalty = 0.12 if risk_status == "High Risk" else 0.07 if risk_status == "Needs Attention" else 0.03
    intervention_boost = 0.18 if risk_status != "Healthy" else 0.08

    projections: dict[str, dict[str, float]] = {}
    for month in (3, 6, 12):
        months_factor = month / 3
        projected_waz = round(waz - (risk_penalty * months_factor * state_factor), 2)
        projected_haz = round(haz - (0.08 * months_factor * state_factor), 2)
        projected_whz = round(whz - (risk_penalty * 0.8 * months_factor), 2)

        intervention_waz = round(waz + (intervention_boost * months_factor), 2)
        intervention_haz = round(haz + (0.06 * months_factor), 2)
        intervention_whz = round(whz + (intervention_boost * 0.7 * months_factor), 2)

        projections[f"projected_{month}m"] = {
            "waz": projected_waz,
            "haz": projected_haz,
            "whz": projected_whz,
        }
        projections[f"intervention_projected_{month}m"] = {
            "waz": intervention_waz,
            "haz": intervention_haz,
            "whz": intervention_whz,
        }

    return {
        "current_zscore": {"waz": waz, "haz": haz, "whz": whz},
        **projections,
    }
