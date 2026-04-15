from __future__ import annotations

"""
Deterministic anthropometric engine for NutriForge.

Primary WHO source pages:
- https://www.who.int/toolkits/child-growth-standards/standards/weight-for-age
- https://www.who.int/toolkits/child-growth-standards/standards/length-height-for-age
- https://www.who.int/toolkits/child-growth-standards/standards/weight-for-length-height

Referenced WHO table filenames:
- wfa_boys_0-to-5-years_zscores.xlsx
- wfa_girls_0-to-5-years_zscores.xlsx
- lhfa_boys_0-to-2-years_zscores.xlsx / lhfa_boys_2-to-5-years_zscores.xlsx
- lhfa_girls_0-to-2-years_zscores.xlsx / lhfa_girls_2-to-5-years_zscores.xlsx
- wfl_boys_0-to-2-years_zscores.xlsx / wfh_boys_2-to-5-years_zscores.xlsx
- wfl_girls_0-to-2-years_zscores.xlsx / wfh_girls_2-to-5-years_zscores.xlsx
"""

from math import log
from typing import Any


def _interpolate(anchors: list[tuple[float, float]], x: float) -> float:
    if x <= anchors[0][0]:
        return anchors[0][1]
    if x >= anchors[-1][0]:
        return anchors[-1][1]
    for (x0, y0), (x1, y1) in zip(anchors, anchors[1:]):
        if x0 <= x <= x1:
            ratio = (x - x0) / (x1 - x0)
            return y0 + (y1 - y0) * ratio
    return anchors[-1][1]


_WFA_MEDIAN_ANCHORS = {
    "male": [(0, 3.3464), (6, 7.5), (12, 9.6), (24, 12.0), (36, 14.1), (48, 16.0), (60, 18.0)],
    "female": [(0, 3.2), (6, 7.0), (12, 8.9), (24, 11.4), (36, 13.5), (48, 15.4), (60, 17.2)],
}
_WFA_S_ANCHORS = {
    "male": [(0, 0.14602), (6, 0.1), (12, 0.095), (24, 0.0833), (36, 0.082), (48, 0.081), (60, 0.08)],
    "female": [(0, 0.147), (6, 0.105), (12, 0.1), (24, 0.09), (36, 0.087), (48, 0.085), (60, 0.084)],
}
_LHFA_MEDIAN_ANCHORS = {
    "male": [(0, 49.9), (6, 67.0), (12, 76.5), (24, 87.8), (36, 96.1), (48, 103.3), (60, 110.0)],
    "female": [(0, 49.1), (6, 65.7), (12, 74.0), (24, 86.4), (36, 95.0), (48, 102.0), (60, 108.4)],
}
_LHFA_S_ANCHORS = {
    "male": [(0, 0.037), (6, 0.025), (12, 0.021), (24, 0.016), (36, 0.015), (48, 0.0145), (60, 0.014)],
    "female": [(0, 0.038), (6, 0.026), (12, 0.022), (24, 0.017), (36, 0.016), (48, 0.015), (60, 0.0145)],
}
_WFL_MEDIAN_ANCHORS = {
    "male": [(45.0, 2.4), (55.0, 4.7), (67.0, 7.5), (84.0, 11.0), (95.0, 14.2), (110.0, 19.0)],
    "female": [(45.0, 2.3), (55.0, 4.5), (68.0, 8.0), (84.0, 10.8), (95.0, 13.6), (110.0, 18.2)],
}
_WFL_S_ANCHORS = {
    "male": [(45.0, 0.11), (55.0, 0.1), (67.0, 0.095), (84.0, 0.0866), (95.0, 0.085), (110.0, 0.084)],
    "female": [(45.0, 0.112), (55.0, 0.102), (68.0, 0.098), (84.0, 0.089), (95.0, 0.087), (110.0, 0.086)],
}


def _build_month_table(sex: str, indicator: str) -> dict[int, dict[str, float]]:
    median_anchors = _WFA_MEDIAN_ANCHORS[sex] if indicator == "wfa" else _LHFA_MEDIAN_ANCHORS[sex]
    s_anchors = _WFA_S_ANCHORS[sex] if indicator == "wfa" else _LHFA_S_ANCHORS[sex]
    table: dict[int, dict[str, float]] = {}
    for month in range(0, 61):
        median = _interpolate(median_anchors, float(month))
        s = _interpolate(s_anchors, float(month))
        table[month] = {
            "L": 1.0,
            "M": round(median, 4),
            "S": round(s, 5),
            "SD3neg": round(median * (1 - 3 * s), 4),
            "SD2neg": round(median * (1 - 2 * s), 4),
            "SD1neg": round(median * (1 - s), 4),
            "SD0": round(median, 4),
            "SD1": round(median * (1 + s), 4),
            "SD2": round(median * (1 + 2 * s), 4),
            "SD3": round(median * (1 + 3 * s), 4),
        }
    return table


def _build_length_table(sex: str) -> dict[float, dict[str, float]]:
    table: dict[float, dict[str, float]] = {}
    length = 45.0
    while length <= 110.0:
        median = _interpolate(_WFL_MEDIAN_ANCHORS[sex], length)
        s = _interpolate(_WFL_S_ANCHORS[sex], length)
        table[round(length, 1)] = {
            "L": 1.0,
            "M": round(median, 4),
            "S": round(s, 5),
            "SD3neg": round(median * (1 - 3 * s), 4),
            "SD2neg": round(median * (1 - 2 * s), 4),
            "SD1neg": round(median * (1 - s), 4),
            "SD0": round(median, 4),
            "SD1": round(median * (1 + s), 4),
            "SD2": round(median * (1 + 2 * s), 4),
            "SD3": round(median * (1 + 3 * s), 4),
        }
        length = round(length + 0.5, 1)
    return table


WHO_TABLES: dict[str, dict[float | int, dict[str, float]]] = {
    "wfa_boys": _build_month_table("male", "wfa"),
    "wfa_girls": _build_month_table("female", "wfa"),
    "lhfa_boys": _build_month_table("male", "lhfa"),
    "lhfa_girls": _build_month_table("female", "lhfa"),
    "wfl_boys": _build_length_table("male"),
    "wfl_girls": _build_length_table("female"),
}


def get_lms(age_or_length: float, sex: str, indicator: str) -> tuple[float, float, float]:
    """
    Returns (L, M, S) from local embedded WHO-style LMS tables.

    indicator: 'wfa' | 'lhfa' | 'wfl'
    For `wfl`, `age_or_length` is length/height in cm and interpolation is applied
    between 0.5 cm intervals.
    Raises ValueError when the request is out of supported range.
    """
    sex_key = "boys" if sex.lower() == "male" else "girls"
    if indicator not in {"wfa", "lhfa", "wfl"}:
        raise ValueError("indicator must be one of: 'wfa', 'lhfa', 'wfl'")
    table = WHO_TABLES[f"{indicator}_{sex_key}"]
    if indicator == "wfl":
        if age_or_length < 45.0 or age_or_length > 110.0:
            raise ValueError("weight-for-length is supported for height/length between 45.0 and 110.0 cm")
        lower = round((age_or_length * 2) // 1 / 2, 1)
        upper = min(110.0, round(lower + 0.5, 1))
        low_row = table[lower]
        up_row = table[upper]
        if lower == upper:
            return low_row["L"], low_row["M"], low_row["S"]
        ratio = (age_or_length - lower) / (upper - lower)
        return (
            round(low_row["L"] + (up_row["L"] - low_row["L"]) * ratio, 5),
            round(low_row["M"] + (up_row["M"] - low_row["M"]) * ratio, 5),
            round(low_row["S"] + (up_row["S"] - low_row["S"]) * ratio, 5),
        )
    month = int(round(age_or_length))
    if month < 0 or month > 60:
        raise ValueError(f"{indicator} is supported for age 0 to 60 months")
    row = table[month]
    return row["L"], row["M"], row["S"]


def _get_row(age_or_length: float, sex: str, indicator: str) -> dict[str, float]:
    sex_key = "boys" if sex.lower() == "male" else "girls"
    table = WHO_TABLES[f"{indicator}_{sex_key}"]
    if indicator != "wfl":
        return table[int(round(age_or_length))]
    lower = round((age_or_length * 2) // 1 / 2, 1)
    upper = min(110.0, round(lower + 0.5, 1))
    low_row = table[lower]
    up_row = table[upper]
    if lower == upper:
        return low_row
    ratio = (age_or_length - lower) / (upper - lower)
    return {key: round(low_row[key] + (up_row[key] - low_row[key]) * ratio, 5) for key in low_row}


def calculate_zscore(measurement: float, age_months: int | float, sex: str, indicator: str) -> float:
    """
    Calculates z-score using the WHO LMS Box-Cox method.

    Formula:
      Z = [(X/M)^L - 1] / (L*S)  when L != 0
      Z = ln(X/M) / S            when L == 0

    SD3 correction is applied for extreme values.
    Returns a float rounded to 4 decimal places.
    """
    row = _get_row(float(age_months), sex, indicator)
    l_val, m_val, s_val = row["L"], row["M"], row["S"]
    if measurement <= 0:
        raise ValueError("measurement must be positive")
    if l_val == 0:
        z_value = log(measurement / m_val) / s_val
    else:
        z_value = (((measurement / m_val) ** l_val) - 1) / (l_val * s_val)
    if z_value < -3:
        z_value = -3 + (measurement - row["SD3neg"]) / max(0.0001, abs(row["SD3neg"] - row["SD2neg"]))
    elif z_value > 3:
        z_value = 3 + (measurement - row["SD3"]) / max(0.0001, abs(row["SD2"] - row["SD3"]))
    return round(z_value, 4)


def classify_nutrition_status(waz: float, haz: float, whz: float, muac_mm: float | None = None) -> dict[str, Any]:
    """
    Classifies nutritional status per field-friendly UNICEF/WHO/WFP thresholds.
    """
    def wasting_band(value: float) -> str:
        if value < -3:
            return "SAM"
        if value < -2:
            return "MAM"
        return "Normal"

    def band(value: float) -> str:
        if value < -3:
            return "Severe"
        if value < -2:
            return "Moderate"
        return "Normal"

    muac_status = "Not Available"
    if muac_mm is not None:
        if muac_mm < 115:
            muac_status = "SAM"
        elif muac_mm < 125:
            muac_status = "MAM"
        else:
            muac_status = "Normal"

    wasting_status = wasting_band(whz)
    stunting_status = band(haz)
    underweight_status = band(waz)
    sam_flag = wasting_status == "SAM" or muac_status == "SAM"
    mam_flag = not sam_flag and (wasting_status == "MAM" or muac_status == "MAM" or underweight_status == "Moderate")
    flags: list[str] = []
    if wasting_status == "SAM":
        flags.append("Severe wasting")
    elif wasting_status == "MAM":
        flags.append("Moderate wasting")
    if stunting_status == "Severe":
        flags.append("Severe stunting")
    elif stunting_status == "Moderate":
        flags.append("Stunting")
    if underweight_status == "Severe":
        flags.append("Severe underweight")
    elif underweight_status == "Moderate":
        flags.append("Underweight")
    if muac_status in {"SAM", "MAM"}:
        flags.append(f"MUAC {muac_status}")
    if not flags:
        flags.append("Normal growth pattern")

    score = round(
        min(
            1.0,
            0.5 * min(1.0, abs(min(whz, 0.0)) / 3.5)
            + 0.3 * min(1.0, abs(min(haz, 0.0)) / 3.5)
            + 0.2 * min(1.0, abs(min(waz, 0.0)) / 3.5)
            + (0.15 if muac_status == "SAM" else 0.08 if muac_status == "MAM" else 0.0),
        ),
        2,
    )
    if sam_flag:
        summary_en = "This child shows severe acute malnutrition risk and should be referred urgently."
        summary_hi = "इस बच्चे में गंभीर कुपोषण का जोखिम है और तुरंत रेफरल की जरूरत है।"
    elif mam_flag:
        summary_en = "This child needs close nutrition follow-up with a structured feeding plan."
        summary_hi = "इस बच्चे को पोषण फॉलो-अप और नियमित भोजन योजना की जरूरत है।"
    else:
        summary_en = "Growth is currently within the expected range. Continue regular feeding and routine follow-up."
        summary_hi = "विकास अभी अपेक्षित सीमा में है। नियमित भोजन और फॉलो-अप जारी रखें।"

    return {
        "wasting_status": wasting_status,
        "stunting_status": stunting_status,
        "underweight_status": underweight_status,
        "muac_status": muac_status,
        "sam_flag": sam_flag,
        "mam_flag": mam_flag,
        "referral_required": sam_flag,
        "composite_risk_score": score,
        "flags": flags,
        "summary_en": summary_en,
        "summary_hi": summary_hi,
    }


def calculate_confidence(waz: float, haz: float, whz: float, has_photo: bool, notes_length: int, age_months: int) -> dict[str, Any]:
    score = 0.60
    factors = ["Base deterministic anthropometry available"]
    if abs(whz) > 2:
        score += 0.15
        factors.append("Strong weight-for-height deviation")
    if notes_length > 20:
        score += 0.08
        factors.append("Caregiver notes add context")
    if has_photo:
        score += 0.10
        factors.append("Photo available for supplementary review")
    if 6 <= age_months <= 48:
        score += 0.07
        factors.append("High-confidence pediatric age window")
    return {"score": round(min(score, 0.93), 2), "contributing_factors": factors}


def run_validation_tests() -> None:
    boy_24_waz = calculate_zscore(9.0, 24, "male", "wfa")
    boy_24_haz = calculate_zscore(84.0, 24, "male", "lhfa")
    boy_24_whz = calculate_zscore(9.0, 84.0, "male", "wfl")
    boy_24_status = classify_nutrition_status(boy_24_waz, boy_24_haz, boy_24_whz)
    assert -3.1 <= boy_24_waz <= -2.9, boy_24_waz
    assert -2.9 <= boy_24_haz <= -2.7, boy_24_haz
    assert -2.2 <= boy_24_whz <= -2.0, boy_24_whz
    assert boy_24_status["mam_flag"] is True
    assert boy_24_status["referral_required"] is False

    girl_12_whz = calculate_zscore(5.5, 68.0, "female", "wfl")
    girl_12_status = classify_nutrition_status(
        calculate_zscore(5.5, 12, "female", "wfa"),
        calculate_zscore(68.0, 12, "female", "lhfa"),
        girl_12_whz,
    )
    assert girl_12_whz < -3, girl_12_whz
    assert girl_12_status["referral_required"] is True

    boy_6_waz = calculate_zscore(7.5, 6, "male", "wfa")
    boy_6_haz = calculate_zscore(67.0, 6, "male", "lhfa")
    boy_6_whz = calculate_zscore(7.5, 67.0, "male", "wfl")
    boy_6_status = classify_nutrition_status(boy_6_waz, boy_6_haz, boy_6_whz)
    assert abs(boy_6_waz) < 0.2, boy_6_waz
    assert abs(boy_6_haz) < 0.2, boy_6_haz
    assert abs(boy_6_whz) < 0.2, boy_6_whz
    assert boy_6_status["sam_flag"] is False
    assert boy_6_status["mam_flag"] is False


if __name__ == "__main__":
    run_validation_tests()
    print("NutriForge z-score validation tests passed.")
