from __future__ import annotations

import json
import random
from typing import Any

from app.models.schemas import ChildProfile, GrowthAssessment, MealSlot, NutritionPlan, PlanAction, RecipeCard
from app.services.food_db import (
    HIGH_PROTEIN_FOODS,
    LOW_COST_FOODS,
    budget_band,
    filter_foods_by_budget,
    foods_for_state,
)
from app.services.json_utils import extract_json_object
from app.services.ollama_client import ollama_service
from app.services.rag import rag_service
from app.services.reason_engine import build_reason_analysis


SYMPTOM_RULES = {
    "diarrhea": "Use soft foods like khichdi, curd rice, banana, and continue fluids.",
    "fever": "Offer small frequent meals with easy-to-digest foods and fluids.",
    "low appetite": "Use smaller, energy-dense meals and 2 extra snack moments.",
    "cough": "Use soft warm foods and avoid long gaps between meals.",
    "swelling": "Urgent clinical review is needed before relying only on food changes.",
}


def _build_context(profile: ChildProfile, risk_status: str, vision_summary: str, contextual_factors: dict[str, Any] | None = None) -> tuple[list[str], list[str], str]:
    state_foods = foods_for_state(profile.state)
    band = budget_band(profile.household_budget_inr)
    filtered_foods = filter_foods_by_budget(state_foods, band)
    shuffled = filtered_foods[:]
    random.SystemRandom().shuffle(shuffled)
    selected = shuffled[:4]
    local_food_names = [item.name for item in selected]
    symptom_text = profile.symptoms.lower() if profile.symptoms else ""
    symptom_rules = [tip for key, tip in SYMPTOM_RULES.items() if key in symptom_text]
    query = (
        f"Indian child nutrition for {profile.state}; risk {risk_status}; age {profile.age_months} months; "
        f"budget {band}; symptoms {profile.symptoms or 'none'}; local foods {' ,'.join(local_food_names)}; vision {vision_summary}; "
        f"context factors {', '.join(contextual_factors.get('factors', [])) if contextual_factors else 'none'}"
    )
    retrieved = rag_service.retrieve(query)
    context_snippets = [f"{chunk.title}: {chunk.content[:220].strip()}..." for chunk in retrieved]
    return local_food_names, context_snippets, symptom_rules[0] if symptom_rules else ""


def _slot_reason(base_reason: str, symptom_tip: str) -> str:
    return f"{base_reason} {symptom_tip}".strip() if symptom_tip else base_reason


def _future_risk_map(risk_status: str) -> dict[str, str]:
    if risk_status == "High Risk":
        return {
            "3_month": "If current diet continues, child may remain high risk within 3 months.",
            "6_month": "If current diet continues, child may stay high risk or worsen within 6 months.",
        }
    if risk_status == "Needs Attention":
        return {
            "3_month": "If current diet continues, child may move to higher risk within 3 months.",
            "6_month": "If current diet continues, child may remain below the healthy band within 6 months.",
        }
    return {
        "3_month": "If the current diet pattern continues, the child is likely to remain stable over 3 months.",
        "6_month": "If the current diet pattern continues, the child is likely to remain in the healthy band over 6 months.",
    }


def _rule_based_payload(profile: ChildProfile, growth: GrowthAssessment, local_food_names: list[str], symptom_tip: str, contextual_factors: dict[str, Any] | None = None) -> dict[str, Any]:
    budget = profile.household_budget_inr or 80
    band = budget_band(budget)
    reason = build_reason_analysis(profile)
    risk_status = growth.status
    protein_candidates = [food for food in local_food_names if food in HIGH_PROTEIN_FOODS] or local_food_names[:2]
    low_cost_candidates = [food for food in local_food_names if food in LOW_COST_FOODS] or local_food_names[1:]
    if len(local_food_names) < 4:
        local_food_names = (local_food_names + protein_candidates + low_cost_candidates + local_food_names)[:4]

    issue_list = list(dict.fromkeys([*reason.issues, *reason.nutrient_gaps]))
    if budget < 50:
        issue_list.append("Very limited budget")

    morning_food = protein_candidates[0]
    lunch_food = local_food_names[1]
    evening_food = low_cost_candidates[-1]
    dinner_food = protein_candidates[-1] if len(protein_candidates) > 1 else local_food_names[0]

    daily_plan = {
        "morning": {
            "meal": morning_food.title(),
            "cost": "Rs 8" if band == "ultra_low" else "Rs 12",
            "reason": _slot_reason("High protein and cheap, helps weight gain early in the day.", symptom_tip if "appetite" in symptom_tip.lower() else ""),
        },
        "lunch": {
            "meal": lunch_food.title(),
            "cost": "Rs 10" if band == "ultra_low" else "Rs 16",
            "reason": "Main calorie meal using local staples to reduce low-weight risk.",
        },
        "evening": {
            "meal": evening_food.title(),
            "cost": "Rs 6" if band == "ultra_low" else "Rs 10",
            "reason": _slot_reason("Prevents long hunger gaps and supports better daily intake.", symptom_tip),
        },
        "dinner": {
            "meal": dinner_food.title(),
            "cost": "Rs 8" if band == "ultra_low" else "Rs 14",
            "reason": "Adds one more protein-focused feeding chance before sleep.",
        },
    }

    daily_actions = [
        {"title": "Morning meal", "detail": f"Start with {protein_candidates[0]} to improve protein intake early in the day.", "cost_inr": 8 if band == "ultra_low" else 12},
        {"title": "Midday energy meal", "detail": f"Use {local_food_names[1]} or {low_cost_candidates[0]} with a spoon of oil or ghee.", "cost_inr": 10 if band == "ultra_low" else 14},
        {"title": "Snack support", "detail": f"Add {low_cost_candidates[-1]} as a snack to reduce long gaps between meals.", "cost_inr": 6 if band == "ultra_low" else 10},
    ]
    if symptom_tip:
        daily_actions.append({"title": "Symptom support", "detail": symptom_tip, "cost_inr": 0})

    weekly_plan = [
        {"title": "Protein frequency", "detail": f"Use {protein_candidates[0]} or {protein_candidates[-1]} at least 5 days this week.", "cost_inr": 0},
        {"title": "Weight follow-up", "detail": "Check weight once this week and compare appetite and energy level.", "cost_inr": 0},
        {"title": "Diet variety", "detail": f"Rotate between {', '.join(local_food_names[:3])} to avoid repeating the same meal every day.", "cost_inr": 0},
    ]
    weekly_focus = [
        reason.priority,
        "Track appetite and meal completion every evening.",
        "Use the cheapest local protein at least 5 times this week.",
    ]

    meals = [
        {
            "name": f"{morning_food.title()} breakfast",
            "ingredients": [morning_food, local_food_names[1], "1 tsp oil"],
            "cost": "Rs 8" if band == "ultra_low" else "Rs 12",
            "frequency": "Daily",
            "reason": "Adds protein and calories using foods already common in the household.",
        },
        {
            "name": f"{lunch_food.title()} lunch",
            "ingredients": [lunch_food, local_food_names[-1]],
            "cost": "Rs 6" if band == "ultra_low" else "Rs 10",
            "frequency": "Daily",
            "reason": "Keeps the midday meal calorie-dense without crossing the family budget.",
        },
        {
            "name": f"{evening_food.title()} evening",
            "ingredients": [evening_food, protein_candidates[-1]],
            "cost": "Rs 7" if band == "ultra_low" else "Rs 11",
            "frequency": "Evening snack",
            "reason": "Supports catch-up growth and helps reduce overnight hunger.",
        },
        {
            "name": f"{dinner_food.title()} dinner",
            "ingredients": [dinner_food, local_food_names[0]],
            "cost": "Rs 8" if band == "ultra_low" else "Rs 12",
            "frequency": "Night meal",
            "reason": "Provides one more protein-focused meal before sleep.",
        },
    ]

    return {
        "risk_level": risk_status,
        "summary": f"{risk_status} based on measurements, symptoms, and household context in {profile.state}.",
        "why_this_happens": reason.why_this_happens,
        "growth_prediction": growth.growth_prediction,
        "future_risk": _future_risk_map(risk_status),
        "key_issues": issue_list,
        "daily_plan": daily_plan,
        "daily_actions": daily_actions,
        "weekly_plan": weekly_plan,
        "weekly_focus": weekly_focus,
        "meals": meals,
        "budget_band": band,
        "priority": reason.priority,
        "confidence_score": "0.88" if risk_status != "Healthy" else "0.80",
        "contextual_factors": contextual_factors or {},
    }


def _llm_structured_refinement(profile: ChildProfile, rule_payload: dict[str, Any], local_food_names: list[str], context_snippets: list[str]) -> dict[str, Any] | None:
    prompt = f"""
You are a pediatric nutrition AI.

DO NOT give generic answers.
Use:
- child data
- detected risk
- local foods

Child data:
{json.dumps(profile.model_dump(), ensure_ascii=True)}

Detected risk:
{json.dumps(rule_payload, ensure_ascii=True)}

Available local foods:
{", ".join(local_food_names)}

Knowledge context:
{json.dumps(context_snippets, ensure_ascii=True)}

OUTPUT STRICTLY IN JSON:
{{
  "risk_level": "",
  "summary": "",
  "why_this_happens": "",
  "growth_prediction": "",
  "future_risk": {{"3_month": "", "6_month": ""}},
  "key_issues": [],
  "daily_plan": {{
    "morning": {{"meal": "", "cost": "", "reason": ""}},
    "lunch": {{"meal": "", "cost": "", "reason": ""}},
    "evening": {{"meal": "", "cost": "", "reason": ""}},
    "dinner": {{"meal": "", "cost": "", "reason": ""}}
  }},
  "daily_actions": [{{"title": "", "detail": "", "cost_inr": 0}}],
  "weekly_plan": [{{"title": "", "detail": "", "cost_inr": 0}}],
  "weekly_focus": [],
  "meals": [
    {{
      "name": "",
      "ingredients": [],
      "cost": "",
      "frequency": "",
      "reason": ""
    }}
  ]
}}

RULES:
- Do NOT repeat same meals
- Use local foods only
- Respect budget:
  <50 -> ultra cheap meals
  50-100 -> moderate
- Add reasoning for each meal
- Keep plans practical and specific
"""
    raw = ollama_service.generate(prompt=prompt, system="You return strict JSON only.")
    return extract_json_object(raw)


def _to_nutrition_plan(structured: dict[str, Any], context_snippets: list[str]) -> NutritionPlan:
    meals = structured.get("meals", [])
    recipes = [
        RecipeCard(
            name=item.get("name", "Meal"),
            ingredients=[str(part) for part in item.get("ingredients", [])],
            instructions=item.get("reason", "Support growth with local low-cost foods."),
            cost_inr=int("".join(ch for ch in str(item.get("cost", "0")) if ch.isdigit()) or 0),
            frequency=item.get("frequency", "Daily"),
            reason=item.get("reason", "Support growth with local low-cost foods."),
        )
        for item in meals[:3]
    ]
    daily_plan = {
        key: MealSlot(
            meal=value.get("meal", ""),
            cost=value.get("cost", ""),
            reason=value.get("reason", ""),
        )
        for key, value in structured.get("daily_plan", {}).items()
        if isinstance(value, dict)
    }
    daily_actions = [
        PlanAction(
            title=item.get("title", "Daily action"),
            detail=item.get("detail", ""),
            cost_inr=int(item.get("cost_inr", 0)),
        )
        for item in structured.get("daily_actions", [])[:4]
    ]
    weekly_actions = [
        PlanAction(
            title=item.get("title", "Weekly action"),
            detail=item.get("detail", ""),
            cost_inr=int(item.get("cost_inr", 0)),
        )
        for item in structured.get("weekly_plan", [])[:4]
    ]
    estimated_daily_cost = sum(action.cost_inr for action in daily_actions if action.cost_inr) or sum(recipe.cost_inr for recipe in recipes[:2])
    return NutritionPlan(
        status=structured.get("risk_level", "Needs Attention"),
        summary=structured.get("summary", ""),
        why_this_happens=structured.get("why_this_happens", ""),
        budget_band=structured.get("budget_band", "moderate"),
        key_issues=[str(item) for item in structured.get("key_issues", [])],
        growth_prediction=structured.get("growth_prediction", ""),
        future_risk={str(key): str(value) for key, value in structured.get("future_risk", {}).items()},
        priority=structured.get("priority", "Improve calorie and protein intake"),
        confidence_score=str(structured.get("confidence_score", "0.80")),
        daily_plan=daily_plan,
        daily_actions=daily_actions,
        weekly_plan=weekly_actions,
        weekly_focus=[str(item) for item in structured.get("weekly_focus", [])],
        recipes=recipes,
        estimated_daily_cost_inr=estimated_daily_cost,
        retrieved_context=context_snippets,
    )


def run_nutrition_agent(profile: ChildProfile, growth: GrowthAssessment, vision_summary: str, contextual_factors: dict[str, Any] | None = None) -> NutritionPlan:
    local_food_names, context_snippets, symptom_tip = _build_context(profile, growth.status, vision_summary, contextual_factors)
    structured = _rule_based_payload(profile, growth, local_food_names, symptom_tip, contextual_factors)
    refined = _llm_structured_refinement(profile, structured, local_food_names, context_snippets)
    final_structured = structured
    if refined:
        final_structured = {
            **structured,
            **{key: value for key, value in refined.items() if value},
            "budget_band": structured["budget_band"],
        }
    return _to_nutrition_plan(final_structured, context_snippets)
