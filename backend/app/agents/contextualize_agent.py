from __future__ import annotations

import json
from typing import Any

from app.models.schemas import ChildProfile, GrowthAssessment
from app.services.food_db import filter_foods_by_budget, foods_for_state, budget_band
from app.services.json_utils import extract_json_object
from app.services.ollama_client import ollama_service


def run_contextualize_agent(profile: ChildProfile, growth: GrowthAssessment) -> dict[str, Any]:
    state_foods = [item.name for item in filter_foods_by_budget(foods_for_state(profile.state), budget_band(profile.household_budget_inr))]
    prompt = f"""
Given the following child profile and rule-engine assessment, identify 2-3 local nutrition context factors.
Return JSON only:
{{"factors": [], "local_foods": [], "risks": []}}

Profile: {json.dumps(profile.model_dump(), ensure_ascii=True)}
Assessment: {json.dumps({
    "status": growth.status,
    "waz": growth.waz,
    "haz": growth.haz,
    "whz": growth.whz,
    "conditions": growth.detected_conditions,
}, ensure_ascii=True)}
Available foods: {json.dumps(state_foods[:6], ensure_ascii=True)}
"""
    raw = ollama_service.generate(prompt=prompt, system="Return strict JSON only and stay practical.")
    parsed = extract_json_object(raw)
    if parsed:
        return parsed
    return {
        "factors": [f"Budget band: {budget_band(profile.household_budget_inr)}", f"State context: {profile.state}"],
        "local_foods": state_foods[:6],
        "risks": growth.detected_conditions[:3],
    }
