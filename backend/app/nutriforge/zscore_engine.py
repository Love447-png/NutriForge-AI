from __future__ import annotations

import json
from pathlib import Path


REFERENCE_PATH = Path(__file__).resolve().parents[1] / "data" / "reference" / "who_growth_reference.json"
REFERENCE_DATA = json.loads(REFERENCE_PATH.read_text(encoding="utf-8"))


def _sex_key(sex: str) -> str:
    return "male" if sex.lower() == "male" else "female"


def _month_reference(age_months: int, sex: str) -> dict:
    month = max(0, min(60, int(round(age_months))))
    return REFERENCE_DATA[_sex_key(sex)][month]


def calculate_waz(weight_kg: float, age_months: int, sex: str) -> float:
    ref = _month_reference(age_months, sex)["weight"]
    return round((weight_kg - ref["median"]) / ref["sd"], 2)


def calculate_haz(height_cm: float, age_months: int, sex: str) -> float:
    ref = _month_reference(age_months, sex)["height"]
    return round((height_cm - ref["median"]) / ref["sd"], 2)


def calculate_whz(weight_kg: float, height_cm: float, sex: str) -> float:
    age_proxy = max(0, min(60, int(round((height_cm - 50) / 2 if height_cm < 77 else ((height_cm - 77) / 6) * 12))))
    ref = _month_reference(age_proxy, sex)["weight"]
    return round((weight_kg - ref["median"]) / ref["sd"], 2)


def classify_nutrition_status(waz: float, haz: float, whz: float) -> dict:
    flags: list[str] = []
    severity = "normal"

    if waz <= -3 or whz <= -3:
        status = "High Risk"
        severity = "severe"
    elif waz <= -2 or whz <= -2 or haz <= -2:
        status = "Needs Attention"
        severity = "moderate"
    else:
        status = "Healthy"

    if waz <= -2:
        flags.append("Underweight")
    if haz <= -2:
        flags.append("Stunted")
    if whz <= -2:
        flags.append("Wasted")

    return {
        "status": status,
        "severity": severity,
        "flags": flags or ["Normal"],
    }
