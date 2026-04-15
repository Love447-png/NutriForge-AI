from __future__ import annotations

import base64
import json
import shutil
import tempfile
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile

from app.core.trajectory import project_trajectory
from app.core.zscore_engine import WHO_TABLES, calculate_confidence, calculate_zscore, classify_nutrition_status
from app.core.config import DATA_DIR, settings
from app.api.deps import get_current_user, require_roles
from app.db.models import User
from app.models.schemas import (
    AnalysisResponse,
    AssessmentInput,
    AssessmentRecord,
    ChildProfile,
    FeedbackInput,
    GrowthAssessment,
    HealthResponse,
    MealSlot,
    NutritionPlan,
    PlanAction,
    RecipeCard,
    SwapMealInput,
    SwapMealResponse,
    VisionAssessment,
)
from app.persistence import get_assessment, init_db, is_assessment_owned_by, list_assessments, save_assessment, save_feedback
from app.services.ollama_client import ollama_service
from app.services.rag import rag_service
from app.services.food_db import foods_for_state
from app.core.pdf_generator import generate_assessment_pdf


router = APIRouter()
UPLOAD_DIR = DATA_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

FALLBACK_FORGE_PLANS: dict[str, dict[str, dict[str, object]]] = {
    "bihar": {
        "morning": {"name_hi": "सत्तू ड्रिंक", "name_en": "Sattu Drink", "cost_inr": 8, "quantity": "2 tbsp sattu in 200ml water", "benefit": "Affordable protein and calories", "nutrients": ["Protein", "Calories"]},
        "lunch": {"name_hi": "खिचड़ी", "name_en": "Khichdi", "cost_inr": 12, "quantity": "50g rice + 30g dal", "benefit": "Soft meal for catch-up feeding", "nutrients": ["Protein", "Calories", "Iron"]},
        "evening": {"name_hi": "भुना चना", "name_en": "Roasted Chana", "cost_inr": 5, "quantity": "30g", "benefit": "Low-cost protein snack", "nutrients": ["Protein", "Iron"]},
        "dinner": {"name_hi": "रोटी और दाल", "name_en": "Roti with Dal", "cost_inr": 10, "quantity": "2 rotis + 100ml dal", "benefit": "Balanced evening meal", "nutrients": ["Protein", "Calories"]},
    },
    "uttar pradesh": {
        "morning": {"name_hi": "दूध और केला", "name_en": "Milk and Banana", "cost_inr": 10, "quantity": "150ml milk + 1 banana", "benefit": "Energy-dense morning start", "nutrients": ["Calories", "Potassium"]},
        "lunch": {"name_hi": "दाल चावल", "name_en": "Dal Rice", "cost_inr": 12, "quantity": "60g rice + 30g dal", "benefit": "Protein and energy support", "nutrients": ["Protein", "Calories"]},
        "evening": {"name_hi": "भुना चना", "name_en": "Roasted Chana", "cost_inr": 5, "quantity": "25g", "benefit": "Protein snack", "nutrients": ["Protein", "Iron"]},
        "dinner": {"name_hi": "रोटी सब्ज़ी", "name_en": "Roti Sabzi", "cost_inr": 11, "quantity": "2 rotis + 1 katori sabzi", "benefit": "Routine family meal under budget", "nutrients": ["Calories", "Fiber"]},
    },
    "maharashtra": {
        "morning": {"name_hi": "पोहे", "name_en": "Poha", "cost_inr": 9, "quantity": "1 small bowl", "benefit": "Light morning calories with household ingredients", "nutrients": ["Calories", "Iron"]},
        "lunch": {"name_hi": "दाल भात", "name_en": "Dal Rice", "cost_inr": 14, "quantity": "1 katori dal + 1 katori rice", "benefit": "Balanced staple meal for catch-up growth", "nutrients": ["Protein", "Calories"]},
        "evening": {"name_hi": "मूंगफली", "name_en": "Groundnuts", "cost_inr": 6, "quantity": "25g", "benefit": "Low-cost energy dense snack", "nutrients": ["Protein", "Calories"]},
        "dinner": {"name_hi": "उपमा", "name_en": "Upma", "cost_inr": 10, "quantity": "1 medium bowl", "benefit": "Easy evening meal when appetite is low", "nutrients": ["Calories"]},
    },
    "madhya pradesh": {
        "morning": {"name_hi": "सत्तू पेय", "name_en": "Sattu Drink", "cost_inr": 8, "quantity": "2 tbsp in water", "benefit": "Cheap protein start", "nutrients": ["Protein", "Calories"]},
        "lunch": {"name_hi": "दाल रोटी", "name_en": "Dal Roti", "cost_inr": 12, "quantity": "2 small rotis + 100ml dal", "benefit": "Sustained calories and protein", "nutrients": ["Protein", "Calories"]},
        "evening": {"name_hi": "केला", "name_en": "Banana", "cost_inr": 5, "quantity": "1 medium", "benefit": "Quick snack for better intake", "nutrients": ["Calories", "Potassium"]},
        "dinner": {"name_hi": "खिचड़ी", "name_en": "Khichdi", "cost_inr": 10, "quantity": "1 bowl", "benefit": "Soft meal for recovery feeding", "nutrients": ["Protein", "Calories"]},
    },
    "rajasthan": {
        "morning": {"name_hi": "दूध दलिया", "name_en": "Milk Porridge", "cost_inr": 10, "quantity": "1 small bowl", "benefit": "Soft calorie support", "nutrients": ["Calories", "Protein"]},
        "lunch": {"name_hi": "बाजरा खिचड़ी", "name_en": "Bajra Khichdi", "cost_inr": 13, "quantity": "1 bowl", "benefit": "Local grain plus dal support", "nutrients": ["Iron", "Calories"]},
        "evening": {"name_hi": "भुना चना", "name_en": "Roasted Chana", "cost_inr": 5, "quantity": "25g", "benefit": "Cheap protein snack", "nutrients": ["Protein", "Iron"]},
        "dinner": {"name_hi": "रोटी दाल", "name_en": "Roti Dal", "cost_inr": 11, "quantity": "2 rotis + 100ml dal", "benefit": "Reliable family meal", "nutrients": ["Protein", "Calories"]},
    },
    "jharkhand": {
        "morning": {"name_hi": "सत्तू ड्रिंक", "name_en": "Sattu Drink", "cost_inr": 8, "quantity": "2 tbsp in water", "benefit": "Protein support on low budget", "nutrients": ["Protein", "Calories"]},
        "lunch": {"name_hi": "चावल दाल", "name_en": "Rice with Dal", "cost_inr": 12, "quantity": "1 katori each", "benefit": "Staple growth meal", "nutrients": ["Protein", "Calories"]},
        "evening": {"name_hi": "केला", "name_en": "Banana", "cost_inr": 5, "quantity": "1 medium", "benefit": "Simple evening energy", "nutrients": ["Calories"]},
        "dinner": {"name_hi": "चूड़ा-दूध", "name_en": "Flattened Rice with Milk", "cost_inr": 10, "quantity": "1 bowl", "benefit": "Soft and acceptable for small children", "nutrients": ["Calories", "Protein"]},
    },
    "odisha": {
        "morning": {"name_hi": "सूजी उपमा", "name_en": "Suji Upma", "cost_inr": 9, "quantity": "1 bowl", "benefit": "Easy calories for morning feeding", "nutrients": ["Calories"]},
        "lunch": {"name_hi": "दालमा भात", "name_en": "Dalma Rice", "cost_inr": 13, "quantity": "1 plate", "benefit": "Local dal and vegetable support", "nutrients": ["Protein", "Fiber"]},
        "evening": {"name_hi": "भुना मूंग", "name_en": "Roasted Moong", "cost_inr": 6, "quantity": "25g", "benefit": "Protein snack", "nutrients": ["Protein", "Iron"]},
        "dinner": {"name_hi": "खिचड़ी", "name_en": "Khichdi", "cost_inr": 10, "quantity": "1 bowl", "benefit": "Soft dinner for catch-up intake", "nutrients": ["Protein", "Calories"]},
    },
    "gujarat": {
        "morning": {"name_hi": "खाखरा दूध", "name_en": "Khakhra with Milk", "cost_inr": 10, "quantity": "1 khakhra + 150ml milk", "benefit": "Easy morning energy", "nutrients": ["Calories", "Protein"]},
        "lunch": {"name_hi": "खिचू-दाल", "name_en": "Khichu with Dal", "cost_inr": 13, "quantity": "1 bowl + 100ml dal", "benefit": "Local soft meal", "nutrients": ["Calories", "Protein"]},
        "evening": {"name_hi": "मूंगफली", "name_en": "Groundnuts", "cost_inr": 6, "quantity": "25g", "benefit": "Energy dense snack", "nutrients": ["Protein", "Calories"]},
        "dinner": {"name_hi": "रोटी शाक", "name_en": "Roti Sabzi", "cost_inr": 11, "quantity": "2 rotis + 1 katori sabzi", "benefit": "Routine household meal", "nutrients": ["Calories", "Fiber"]},
    },
    "west bengal": {
        "morning": {"name_hi": "सूजी खीर", "name_en": "Suji Porridge", "cost_inr": 9, "quantity": "1 small bowl", "benefit": "Soft breakfast for younger children", "nutrients": ["Calories"]},
        "lunch": {"name_hi": "भात दाल", "name_en": "Rice and Dal", "cost_inr": 12, "quantity": "1 katori each", "benefit": "Protein-calorie staple", "nutrients": ["Protein", "Calories"]},
        "evening": {"name_hi": "केला", "name_en": "Banana", "cost_inr": 5, "quantity": "1 medium", "benefit": "Quick evening energy", "nutrients": ["Calories"]},
        "dinner": {"name_hi": "सब्ज़ी खिचुड़ी", "name_en": "Vegetable Khichuri", "cost_inr": 11, "quantity": "1 bowl", "benefit": "Soft local dinner", "nutrients": ["Protein", "Fiber"]},
    },
    "assam": {
        "morning": {"name_hi": "चावल का दलिया", "name_en": "Rice Porridge", "cost_inr": 8, "quantity": "1 bowl", "benefit": "Easy feeding on low appetite days", "nutrients": ["Calories"]},
        "lunch": {"name_hi": "दाल भात", "name_en": "Dal Rice", "cost_inr": 12, "quantity": "1 plate", "benefit": "Core protein meal", "nutrients": ["Protein", "Calories"]},
        "evening": {"name_hi": "उबला चना", "name_en": "Boiled Chana", "cost_inr": 6, "quantity": "25g", "benefit": "Affordable snack", "nutrients": ["Protein", "Iron"]},
        "dinner": {"name_hi": "खिचड़ी", "name_en": "Khichdi", "cost_inr": 10, "quantity": "1 bowl", "benefit": "Soft dinner option", "nutrients": ["Protein", "Calories"]},
    },
    "karnataka": {
        "morning": {"name_hi": "रागी पोरिज", "name_en": "Ragi Porridge", "cost_inr": 9, "quantity": "1 bowl", "benefit": "Iron-rich breakfast support", "nutrients": ["Iron", "Calories"]},
        "lunch": {"name_hi": "अन्ना सारु", "name_en": "Rice with Sambar", "cost_inr": 13, "quantity": "1 plate", "benefit": "Balanced local staple", "nutrients": ["Protein", "Calories"]},
        "evening": {"name_hi": "मूंगफली", "name_en": "Groundnuts", "cost_inr": 6, "quantity": "25g", "benefit": "Compact energy snack", "nutrients": ["Protein", "Calories"]},
        "dinner": {"name_hi": "उपमा", "name_en": "Upma", "cost_inr": 10, "quantity": "1 bowl", "benefit": "Soft evening option", "nutrients": ["Calories"]},
    },
    "tamil nadu": {
        "morning": {"name_hi": "रागी कंजी", "name_en": "Ragi Kanji", "cost_inr": 9, "quantity": "1 bowl", "benefit": "Local soft breakfast", "nutrients": ["Iron", "Calories"]},
        "lunch": {"name_hi": "सांभर चावल", "name_en": "Sambar Rice", "cost_inr": 13, "quantity": "1 plate", "benefit": "Dal and rice support for growth", "nutrients": ["Protein", "Calories"]},
        "evening": {"name_hi": "उबला चना", "name_en": "Boiled Chana", "cost_inr": 6, "quantity": "25g", "benefit": "Protein snack", "nutrients": ["Protein", "Iron"]},
        "dinner": {"name_hi": "इडली सांभर", "name_en": "Idli with Sambar", "cost_inr": 11, "quantity": "2 idlis + 100ml sambar", "benefit": "Soft dinner for younger children", "nutrients": ["Protein", "Calories"]},
    },
}


def _fallback_meal_plan(state: str) -> dict[str, dict[str, object]]:
    state_key = state.strip().lower()
    if state_key in FALLBACK_FORGE_PLANS:
        return FALLBACK_FORGE_PLANS[state_key]
    default_state = "bihar" if state_key not in {"uttar pradesh"} else state_key
    return FALLBACK_FORGE_PLANS[default_state]


def _build_growth(profile: ChildProfile) -> tuple[GrowthAssessment, dict[str, object], dict[str, object]]:
    waz = calculate_zscore(profile.weight_kg, profile.age_months, profile.sex, "wfa")
    haz = calculate_zscore(profile.height_cm, profile.age_months, profile.sex, "lhfa")
    whz = calculate_zscore(profile.weight_kg, profile.height_cm, profile.sex, "wfl")
    status = classify_nutrition_status(waz, haz, whz, profile.muac_mm)
    confidence = calculate_confidence(
        waz=waz,
        haz=haz,
        whz=whz,
        has_photo=False,
        notes_length=len(profile.symptoms or ""),
        age_months=profile.age_months,
    )
    without_plan = project_trajectory(
        current_whz=whz,
        current_haz=haz,
        current_weight_kg=profile.weight_kg,
        current_height_cm=profile.height_cm,
        age_months=profile.age_months,
        sex=profile.sex,
        state=profile.state,
        intervention=False,
    )
    with_plan = project_trajectory(
        current_whz=whz,
        current_haz=haz,
        current_weight_kg=profile.weight_kg,
        current_height_cm=profile.height_cm,
        age_months=profile.age_months,
        sex=profile.sex,
        state=profile.state,
        intervention=True,
    )
    risk_status = "High Risk" if status["referral_required"] else "Needs Attention" if status["mam_flag"] or any(flag != "Normal growth pattern" for flag in status["flags"]) else "Healthy"
    growth = GrowthAssessment(
        status=risk_status,
        summary=status["summary_en"],
        signals=[],
        expected_weight_kg=WHO_TABLES[f"wfa_{'boys' if profile.sex == 'male' else 'girls'}"][profile.age_months]["M"],
        expected_height_cm=WHO_TABLES[f"lhfa_{'boys' if profile.sex == 'male' else 'girls'}"][profile.age_months]["M"],
        weight_ratio=round(profile.weight_kg / WHO_TABLES[f"wfa_{'boys' if profile.sex == 'male' else 'girls'}"][profile.age_months]["M"], 2),
        height_ratio=round(profile.height_cm / WHO_TABLES[f"lhfa_{'boys' if profile.sex == 'male' else 'girls'}"][profile.age_months]["M"], 2),
        waz=waz,
        haz=haz,
        whz=whz,
        detected_conditions=status["flags"],
        growth_prediction=with_plan["intervention_benefit"],
        trajectory_projection={"without_intervention": without_plan, "with_forge_plan": with_plan},
        trajectory=[
            {
                "month_offset": 0,
                "projected_height_cm": profile.height_cm,
                "projected_weight_kg": profile.weight_kg,
                "projected_risk": risk_status,
            },
            *[
                {
                    "month_offset": point["month"],
                    "projected_height_cm": point["height_cm"],
                    "projected_weight_kg": point["weight_kg"],
                    "projected_risk": "High Risk" if point["risk_level"] == "critical" else "Needs Attention" if point["risk_level"] in {"at_risk", "monitor"} else "Healthy",
                }
                for point in with_plan["with_forge_plan"]
            ],
        ],
        confidence=confidence["score"],
    )
    return growth, status, confidence


def _forge_plan_from_fallback(profile: ChildProfile, growth: GrowthAssessment) -> NutritionPlan:
    plan = _fallback_meal_plan(profile.state)
    daily_plan = {
        slot: MealSlot(
            meal=f"{item['name_hi']} ({item['name_en']})",
            cost=f"₹{item['cost_inr']}",
            reason=str(item["benefit"]),
            quantity=str(item["quantity"]),
            nutrients=[str(n) for n in item["nutrients"]],
            name_hi=str(item["name_hi"]),
            name_en=str(item["name_en"]),
        )
        for slot, item in plan.items()
    }
    total_cost = sum(int(item["cost_inr"]) for item in plan.values())
    return NutritionPlan(
        status=growth.status,
        source="fallback",
        summary=f"AI plan unavailable. Showing standard plan for {profile.state}.",
        why_this_happens=growth.summary,
        budget_band="ultra_low" if (profile.household_budget_inr or 50) < 50 else "moderate",
        key_issues=growth.detected_conditions,
        growth_prediction=growth.growth_prediction,
        future_risk={
            "3_month": growth.trajectory_projection["without_intervention"].risk_at_3m,
            "6_month": growth.trajectory_projection["without_intervention"].risk_at_6m,
            "12_month": growth.trajectory_projection["without_intervention"].risk_at_12m,
        },
        priority="Improve calorie and protein intake",
        confidence_score=f"{int(growth.confidence * 100)}%",
        daily_plan=daily_plan,
        daily_actions=[PlanAction(title="Morning feeding", detail="Use the fallback state meal plan as shown.", cost_inr=0)],
        weekly_plan=[PlanAction(title="7-day rotation", detail="Repeat the meal slots with small household variation.", cost_inr=0)],
        weekly_focus=["Track appetite", "Repeat MUAC if available", "Watch meal completion"],
        recipes=[
            RecipeCard(
                name=f"{slot.title()} meal",
                ingredients=[str(item["name_en"])],
                instructions=str(item["quantity"]),
                cost_inr=int(item["cost_inr"]),
                frequency="Daily",
                reason=str(item["benefit"]),
            )
            for slot, item in plan.items()
        ],
        estimated_daily_cost_inr=total_cost,
        retrieved_context=[food.name for food in foods_for_state(profile.state)],
    )


def _build_professional_alerts(profile: ChildProfile, status: dict[str, object], growth: GrowthAssessment, confidence: dict[str, object], nutrition: NutritionPlan) -> tuple[str, list[str]]:
    child_name = profile.name or "This child"
    if status["referral_required"]:
        summary = f"{child_name} has severe nutrition risk and needs same-day referral plus supervised nutrition follow-up."
    elif status["mam_flag"]:
        summary = f"{child_name} is below the healthy growth range and needs a structured feeding plan with close follow-up over the next 4 to 8 weeks."
    else:
        summary = f"{child_name} is currently within the monitored growth range; continue age-appropriate feeding and routine follow-up."

    alerts = [
        status["summary_hi"],
        f"Confidence factors: {', '.join(confidence['contributing_factors'][:3])}.",
        f"Primary focus: {nutrition.priority}.",
    ]
    if profile.muac_mm is not None:
        alerts.append(f"MUAC recorded at {profile.muac_mm:.0f} mm.")
    if "diarrhea" in (profile.symptoms or "").lower():
        alerts.append("Continue feeding during diarrhea and prioritize fluids, soft meals, and follow-up if symptoms persist.")
    if "fever" in (profile.symptoms or "").lower():
        alerts.append("During fever, offer smaller frequent feeds and reassess intake after recovery.")
    return summary, alerts


def _attempt_ai_plan(profile: ChildProfile, growth: GrowthAssessment, status: dict[str, object]) -> Optional[NutritionPlan]:
    if not ollama_service.ping():
        return None
    prompt = (
        "You are a pediatric nutritionist for rural India. Return JSON only. "
        f"Child: {profile.age_months} months, {profile.sex}, state {profile.state}, budget ₹{profile.household_budget_inr or 50}. "
        f"Flags: {status['flags']}. Local foods: {[food.name for food in foods_for_state(profile.state)]}. "
        "Return keys: daily_cost_inr, daily_plan, key_message_en, asha_action."
    )
    raw = ollama_service.generate(prompt=prompt, system="Return only JSON.")
    if not raw:
        return None
    try:
        payload = json.loads(raw)
    except Exception:  # noqa: BLE001
        return None
    fallback = _forge_plan_from_fallback(profile, growth)
    for slot, item in payload.get("daily_plan", {}).items():
        if slot in fallback.daily_plan and isinstance(item, dict):
            fallback.daily_plan[slot] = MealSlot(
                meal=f"{item.get('name_hi', fallback.daily_plan[slot].name_hi)} ({item.get('name_en', fallback.daily_plan[slot].name_en)})",
                cost=f"₹{item.get('cost_inr', 0)}",
                reason=str(item.get("benefit", fallback.daily_plan[slot].reason)),
                quantity=str(item.get("quantity", fallback.daily_plan[slot].quantity or "")),
                nutrients=[str(n) for n in item.get("nutrients", fallback.daily_plan[slot].nutrients)],
                name_hi=item.get("name_hi", fallback.daily_plan[slot].name_hi),
                name_en=item.get("name_en", fallback.daily_plan[slot].name_en),
            )
    fallback.source = "ai"
    fallback.summary = payload.get("key_message_en", fallback.summary)
    fallback.daily_actions = [PlanAction(title="ASHA action", detail=str(payload.get("asha_action", "Monitor weight and MUAC at next visit.")), cost_inr=0)]
    fallback.estimated_daily_cost_inr = int(payload.get("daily_cost_inr", fallback.estimated_daily_cost_inr))
    return fallback


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(
        ok=True,
        app=settings.app_name,
        rag_ready=rag_service.ready(),
        ollama_reachable=ollama_service.ping(),
    )


def _decode_photo(photo_base64: Optional[str]) -> Optional[Path]:
    if not photo_base64:
        return None
    try:
        payload = photo_base64.split(",", 1)[-1]
        raw = base64.b64decode(payload)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Invalid photo payload: {exc}") from exc
    temp = Path(tempfile.gettempdir()) / f"nutriforge-{uuid4().hex}.jpg"
    temp.write_bytes(raw)
    return temp


def _run_assessment(profile: ChildProfile, image_path: Optional[Path]) -> AnalysisResponse:
    trace = [
        "anthropometry_node: rule-based growth assessment completed",
        "trajectory_node: future growth projection completed",
        f"vision_node: {'photo analyzed' if image_path else 'skipped'}",
        "context_node: local context assembled",
        "forge_plan_node: structured meal plan generated",
    ]
    growth, status, confidence = _build_growth(profile)
    nutrition = _attempt_ai_plan(profile, growth, status) or _forge_plan_from_fallback(profile, growth)
    vision = VisionAssessment(
        available=bool(image_path),
        summary="Visual review is supplementary only and was not required for deterministic growth classification.",
        indicators=["Supplementary visual review only"] if image_path else [],
        confidence=0.4 if image_path else 0.0,
    )
    fallback_message = None if nutrition.source == "ai" else f"AI plan unavailable. Showing standard plan for {profile.state}."
    coordinator_summary, alerts = _build_professional_alerts(profile, status, growth, confidence, nutrition)
    result = AnalysisResponse(
        child=profile,
        risk_status=growth.status,
        coordinator_summary=coordinator_summary,
        growth=growth,
        vision=vision,
        nutrition=nutrition,
        alerts=alerts,
        referral_required=bool(status["referral_required"]),
        execution_trace=trace,
        fallback_message=fallback_message,
    )
    return result


@router.post("/knowledge/rebuild")
def rebuild_knowledge(_: User = Depends(require_roles("ngo_staff"))) -> dict[str, str]:
    rag_service.rebuild()
    return {"status": "rebuilt"}


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_child(
    name: Optional[str] = Form(default=None),
    age_months: int = Form(...),
    sex: str = Form(...),
    height_cm: float = Form(...),
    weight_kg: float = Form(...),
    state: str = Form(...),
    region: Optional[str] = Form(default=None),
    symptoms: Optional[str] = Form(default=None),
    household_budget_inr: Optional[int] = Form(default=80),
    photo: Optional[UploadFile] = File(default=None),
    current_user: User = Depends(get_current_user),
) -> AnalysisResponse:
    image_path: Optional[Path] = None
    if photo and photo.filename:
        suffix = Path(photo.filename).suffix or ".jpg"
        image_path = UPLOAD_DIR / f"{uuid4().hex}{suffix}"
        with image_path.open("wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)

    profile = ChildProfile(
        name=name,
        age_months=age_months,
        sex=sex,
        height_cm=height_cm,
        weight_kg=weight_kg,
        muac_mm=None,
        state=state,
        region=region,
        symptoms=symptoms,
        household_budget_inr=household_budget_inr,
    )
    response = _run_assessment(profile, image_path)
    assessment_id = uuid4().hex
    response.assessment_id = assessment_id
    save_assessment(assessment_id, response, user_id=current_user.id)
    return response


@router.post("/v1/assess", response_model=AnalysisResponse)
async def assess_child(payload: AssessmentInput, current_user: User = Depends(get_current_user)) -> AnalysisResponse:
    image_path = _decode_photo(payload.photo_base64)
    profile = ChildProfile(
        name=payload.child_name,
        age_months=payload.age_months,
        sex=payload.sex,
        height_cm=payload.height_cm,
        weight_kg=payload.weight_kg,
        muac_mm=payload.muac_mm,
        state=payload.state,
        region=payload.region,
        symptoms=payload.notes,
        household_budget_inr=payload.budget_inr,
    )
    response = _run_assessment(profile, image_path)
    assessment_id = uuid4().hex
    response.assessment_id = assessment_id
    save_assessment(assessment_id, response, user_id=current_user.id)
    return response


@router.get("/v1/assessment/{assessment_id}", response_model=AssessmentRecord)
def fetch_assessment(assessment_id: str, current_user: User = Depends(get_current_user)) -> AssessmentRecord:
    record = get_assessment(assessment_id)
    if not record:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if not is_assessment_owned_by(assessment_id, current_user.id):
        raise HTTPException(status_code=403, detail="Assessment access denied")
    return record


@router.get("/v1/assessments", response_model=list[AssessmentRecord])
def fetch_assessments(limit: int = 25, current_user: User = Depends(get_current_user)) -> list[AssessmentRecord]:
    return list_assessments(current_user.id, limit=min(max(limit, 1), 100))


@router.get("/v1/who-reference/{sex}/{age_months}")
def who_reference(sex: str, age_months: int) -> dict[str, object]:
    sex_key = "boys" if sex.lower() == "male" else "girls"
    if age_months < 0 or age_months > 60:
        raise HTTPException(status_code=400, detail="age_months must be between 0 and 60")
    month_data = {
        "weight": WHO_TABLES[f"wfa_{sex_key}"][age_months],
        "height": WHO_TABLES[f"lhfa_{sex_key}"][age_months],
    }
    return {"sex": sex_key, "age_months": age_months, "reference": month_data}


@router.post("/v1/forge-swap", response_model=SwapMealResponse)
def forge_swap(payload: SwapMealInput, current_user: User = Depends(get_current_user)) -> SwapMealResponse:
    record = get_assessment(payload.assessment_id)
    if not record:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if not is_assessment_owned_by(payload.assessment_id, current_user.id):
        raise HTTPException(status_code=403, detail="Assessment access denied")
    state_foods = [food.name for food in foods_for_state(record.result.child.state)]
    suggestions = [food for food in state_foods if food.lower() not in payload.reason.lower()]
    chosen = suggestions[0] if suggestions else "khichdi"
    return SwapMealResponse(
        alternative_hi=chosen.title(),
        alternative_en=f"{chosen.title()} alternative",
        cost_inr=10,
        nutrients=["Protein", "Calories"],
    )


@router.post("/v1/feedback")
def feedback(payload: FeedbackInput, current_user: User = Depends(get_current_user)) -> dict[str, str]:
    if not is_assessment_owned_by(payload.assessment_id, current_user.id):
        raise HTTPException(status_code=403, detail="Assessment access denied")
    save_feedback(payload, user_id=current_user.id)
    return {"status": "recorded"}


@router.get("/v1/export/{assessment_id}/pdf")
def export_pdf(assessment_id: str, current_user: User = Depends(get_current_user)) -> Response:
    record = get_assessment(assessment_id)
    if not record:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if not is_assessment_owned_by(assessment_id, current_user.id):
        raise HTTPException(status_code=403, detail="Assessment access denied")
    pdf_bytes = generate_assessment_pdf(assessment_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=NutriForge_{assessment_id}.pdf"},
    )
