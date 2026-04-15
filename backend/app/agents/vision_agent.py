from __future__ import annotations

from pathlib import Path
from typing import Optional

from app.models.schemas import VisionAssessment
from app.services.image_analysis import analyze_child_image


def run_vision_agent(image_path: Optional[Path]) -> VisionAssessment:
    return analyze_child_image(image_path)
