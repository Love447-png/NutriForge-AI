from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


RiskLevel = Literal["Healthy", "Needs Attention", "High Risk"]


class ChildProfile(BaseModel):
    name: Optional[str] = None
    age_months: int = Field(ge=1, le=60)
    sex: Literal["male", "female"]
    height_cm: float = Field(gt=30, lt=130)
    weight_kg: float = Field(gt=1, lt=50)
    muac_mm: Optional[float] = Field(default=None, ge=100, le=200)
    state: str = Field(min_length=2, max_length=60)
    region: Optional[str] = Field(default=None, max_length=60)
    symptoms: Optional[str] = None
    household_budget_inr: Optional[int] = Field(default=80, ge=20, le=500)


class RiskSignal(BaseModel):
    label: str
    severity: Literal["low", "moderate", "high"]
    explanation: str


class GrowthProjectionPoint(BaseModel):
    month_offset: int
    projected_height_cm: float
    projected_weight_kg: float
    projected_risk: RiskLevel


class TrajectoryPoint(BaseModel):
    month: int
    weight_kg: float
    height_cm: float
    whz: float
    haz: float
    risk_level: Literal["safe", "monitor", "at_risk", "critical"]


class TrajectoryBundle(BaseModel):
    sex: str
    state: str
    monthly_projections: list[TrajectoryPoint]
    without_intervention: list[TrajectoryPoint]
    with_forge_plan: list[TrajectoryPoint]
    risk_at_3m: str
    risk_at_6m: str
    risk_at_12m: str
    intervention_benefit: str
    intervention_benefit_hi: str


class GrowthAssessment(BaseModel):
    status: RiskLevel
    summary: str
    signals: list[RiskSignal]
    expected_weight_kg: float
    expected_height_cm: float
    weight_ratio: float
    height_ratio: float
    waz: float
    haz: float
    whz: float
    detected_conditions: list[str]
    growth_prediction: str
    trajectory_projection: dict[str, TrajectoryBundle]
    trajectory: list[GrowthProjectionPoint]
    confidence: float = Field(ge=0, le=1)


class VisionAssessment(BaseModel):
    available: bool
    summary: str
    indicators: list[str]
    confidence: float = Field(ge=0, le=1)


class PlanAction(BaseModel):
    title: str
    detail: str
    cost_inr: int


class MealSlot(BaseModel):
    meal: str
    cost: str
    reason: str
    quantity: Optional[str] = None
    nutrients: list[str] = Field(default_factory=list)
    name_hi: Optional[str] = None
    name_en: Optional[str] = None


class RecipeCard(BaseModel):
    name: str
    ingredients: list[str]
    instructions: str
    cost_inr: int
    frequency: str
    reason: str


class NutritionPlan(BaseModel):
    status: RiskLevel
    source: str = "ai"
    summary: str
    why_this_happens: str
    budget_band: str
    key_issues: list[str]
    growth_prediction: str
    future_risk: dict[str, str]
    priority: str
    confidence_score: str
    daily_plan: dict[str, MealSlot]
    daily_actions: list[PlanAction]
    weekly_plan: list[PlanAction]
    weekly_focus: list[str]
    recipes: list[RecipeCard]
    estimated_daily_cost_inr: int
    retrieved_context: list[str]


class AnalysisResponse(BaseModel):
    assessment_id: Optional[str] = None
    child: ChildProfile
    risk_status: RiskLevel
    coordinator_summary: str
    growth: GrowthAssessment
    vision: VisionAssessment
    nutrition: NutritionPlan
    alerts: list[str]
    referral_required: bool = False
    medical_disclaimer: str = (
        "For reference only. This tool supports child growth screening and does not replace clinical judgment."
    )
    execution_trace: list[str] = Field(default_factory=list)
    fallback_message: Optional[str] = None


class HealthResponse(BaseModel):
    ok: bool
    app: str
    rag_ready: bool
    ollama_reachable: bool


class AssessmentInput(BaseModel):
    child_name: Optional[str] = Field(default=None, max_length=120)
    age_months: int = Field(ge=1, le=60)
    sex: Literal["male", "female"]
    weight_kg: float = Field(ge=1.0, le=50.0)
    height_cm: float = Field(ge=30.0, le=130.0)
    muac_mm: Optional[float] = Field(default=None, ge=100.0, le=200.0)
    state: str = Field(min_length=2, max_length=60)
    region: Literal["urban", "semi-urban", "rural block", "tribal"]
    budget_inr: int = Field(ge=20, le=500)
    notes: Optional[str] = Field(default=None, max_length=500)
    photo_base64: Optional[str] = None
    language: Literal["hi", "en"] = "en"


class AssessmentRecord(BaseModel):
    id: str
    result: AnalysisResponse
    created_at: datetime


class FeedbackInput(BaseModel):
    assessment_id: str
    was_helpful: bool
    asha_worker_id: Optional[str] = None


class SwapMealInput(BaseModel):
    assessment_id: str
    meal_slot: Literal["morning", "lunch", "evening", "dinner"]
    reason: str = Field(min_length=2, max_length=200)


class SwapMealResponse(BaseModel):
    alternative_hi: str
    alternative_en: str
    cost_inr: int
    nutrients: list[str]


class UserSignupInput(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    role: Literal["parent", "asha_worker", "ngo_staff"] = "parent"
    asha_worker_id: Optional[str] = Field(default=None, max_length=120)


class UserSigninInput(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class RefreshTokenInput(BaseModel):
    refresh_token: str = Field(min_length=20)


class SessionUser(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    asha_worker_id: Optional[str] = None
    state: Optional[str] = None
    language_preference: str = "en"


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: SessionUser
