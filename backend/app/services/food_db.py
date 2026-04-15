from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class FoodItem:
    name: str
    tags: tuple[str, ...]
    cost_band: str
    protein_score: int
    est_cost_inr: int


FOOD_DB: dict[str, list[FoodItem]] = {
    "bihar": [
        FoodItem("sattu drink", ("local", "protein", "snack"), "ultra_low", 5, 8),
        FoodItem("roti + dal", ("meal", "protein"), "moderate", 5, 12),
        FoodItem("roasted chana", ("snack", "protein"), "ultra_low", 4, 6),
        FoodItem("khichdi", ("meal", "soft"), "ultra_low", 3, 10),
        FoodItem("banana", ("fruit", "energy"), "ultra_low", 1, 6),
    ],
    "uttar pradesh": [
        FoodItem("dal rice", ("meal", "protein"), "moderate", 4, 14),
        FoodItem("roti sabzi", ("meal", "local"), "ultra_low", 2, 10),
        FoodItem("milk", ("drink", "protein"), "moderate", 4, 14),
        FoodItem("banana", ("fruit", "energy"), "ultra_low", 1, 6),
        FoodItem("roasted chana", ("snack", "protein"), "ultra_low", 4, 6),
    ],
    "maharashtra": [
        FoodItem("poha", ("meal", "local"), "ultra_low", 2, 10),
        FoodItem("upma", ("meal", "local"), "ultra_low", 2, 12),
        FoodItem("dal rice", ("meal", "protein"), "moderate", 4, 14),
        FoodItem("matki usal", ("meal", "protein"), "moderate", 5, 16),
        FoodItem("banana", ("fruit", "energy"), "ultra_low", 1, 6),
    ],
    "default": [
        FoodItem("roti + dal", ("meal", "protein"), "moderate", 5, 12),
        FoodItem("khichdi", ("meal", "soft"), "ultra_low", 3, 10),
        FoodItem("roasted chana", ("snack", "protein"), "ultra_low", 4, 6),
        FoodItem("banana", ("fruit", "energy"), "ultra_low", 1, 6),
        FoodItem("curd rice", ("meal", "soft"), "moderate", 3, 12),
    ],
}

LOW_COST_FOODS = ["roasted chana", "banana", "khichdi", "poha", "roti sabzi", "sattu drink"]
HIGH_PROTEIN_FOODS = ["roti + dal", "dal rice", "matki usal", "sattu drink", "roasted chana", "milk"]


def normalize_state(state: str) -> str:
    return state.strip().lower()


def budget_band(budget_inr: int | None) -> str:
    value = budget_inr or 80
    if value < 50:
        return "ultra_low"
    if value <= 100:
        return "moderate"
    return "flexible"


def foods_for_state(state: str) -> list[FoodItem]:
    return FOOD_DB.get(normalize_state(state), FOOD_DB["default"])


def filter_foods_by_budget(items: list[FoodItem], band: str) -> list[FoodItem]:
    if band == "flexible":
        return items
    allowed_bands = {"ultra_low"} if band == "ultra_low" else {"ultra_low", "moderate"}
    filtered = [item for item in items if item.cost_band in allowed_bands]
    return filtered or items
