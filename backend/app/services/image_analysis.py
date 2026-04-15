from __future__ import annotations

from pathlib import Path
from typing import Optional

from PIL import Image, ImageStat

from app.models.schemas import VisionAssessment
from app.services.ollama_client import ollama_service


def analyze_child_image(image_path: Optional[Path]) -> VisionAssessment:
    if not image_path or not image_path.exists():
        return VisionAssessment(
            available=False,
            summary="No child photo provided. Nutrition assessment is based on profile and growth data only.",
            indicators=[],
            confidence=0.0,
        )

    prompt = (
        "You are helping an ASHA worker. Review this child photo for visible nutrition-related cues only. "
        "List a few cautious observations such as thinness, facial puffiness, skin pallor, alertness, or poor image quality. "
        "Do not diagnose. Keep it under 80 words."
    )
    llm_result = ollama_service.analyze_image(image_path, prompt)
    if llm_result:
        return VisionAssessment(
            available=True,
            summary=llm_result.strip(),
            indicators=[
                "AI-assisted local image review",
                "Interpret with growth and clinical context",
            ],
            confidence=0.72,
        )

    image = Image.open(image_path).convert("RGB")
    stat = ImageStat.Stat(image)
    brightness = sum(stat.mean) / len(stat.mean)
    contrast = sum(stat.stddev) / len(stat.stddev)
    indicators: list[str] = []

    if brightness < 85:
        indicators.append("Low-light photo reduces visual confidence")
    if contrast < 35:
        indicators.append("Image appears soft; body-frame cues may be limited")
    if brightness > 170:
        indicators.append("Bright exposure may wash out skin-tone detail")

    if not indicators:
        indicators.append("Image quality acceptable for a basic visual check")

    return VisionAssessment(
        available=True,
        summary="Fallback visual analysis found no strong automated cues, so the system is relying mostly on growth data and reported measurements.",
        indicators=indicators,
        confidence=0.35,
    )
