from __future__ import annotations

from pathlib import Path
from typing import Any, Optional, TypedDict

from langgraph.graph import END, StateGraph

from app.agents.coordinator_agent import run_coordinator_agent
from app.agents.contextualize_agent import run_contextualize_agent
from app.agents.growth_agent import run_growth_agent
from app.agents.nutrition_agent import run_nutrition_agent
from app.agents.vision_agent import run_vision_agent
from app.models.schemas import AnalysisResponse, ChildProfile, GrowthAssessment, NutritionPlan, VisionAssessment


class ForgeState(TypedDict, total=False):
    profile: ChildProfile
    image_path: Optional[Path]
    growth: GrowthAssessment
    context: dict[str, Any]
    vision: VisionAssessment
    nutrition: NutritionPlan
    response: AnalysisResponse


def assess_node(state: ForgeState) -> ForgeState:
    return {"growth": run_growth_agent(state["profile"])}


def contextualize_node(state: ForgeState) -> ForgeState:
    return {"context": run_contextualize_agent(state["profile"], state["growth"])}


def forge_plan_node(state: ForgeState) -> ForgeState:
    return {
        "nutrition": run_nutrition_agent(
            state["profile"],
            state["growth"],
            state.get("vision", VisionAssessment(available=False, summary="", indicators=[], confidence=0.0)).summary,
            state.get("context"),
        )
    }


def photo_analysis_node(state: ForgeState) -> ForgeState:
    return {"vision": run_vision_agent(state.get("image_path"))}


def coordinator_node(state: ForgeState) -> ForgeState:
    return {
        "response": run_coordinator_agent(
            state["profile"],
            state["growth"],
            state["vision"],
            state["nutrition"],
        )
    }


def build_graph():
    graph = StateGraph(ForgeState)
    graph.add_node("assess", assess_node)
    graph.add_node("contextualize", contextualize_node)
    graph.add_node("forge_plan", forge_plan_node)
    graph.add_node("photo_analysis", photo_analysis_node)
    graph.add_node("coordinator_agent", coordinator_node)
    graph.set_entry_point("assess")
    graph.add_edge("assess", "contextualize")
    graph.add_edge("contextualize", "photo_analysis")
    graph.add_edge("photo_analysis", "forge_plan")
    graph.add_edge("forge_plan", "coordinator_agent")
    graph.add_edge("coordinator_agent", END)
    return graph.compile()


forge_graph = build_graph()
