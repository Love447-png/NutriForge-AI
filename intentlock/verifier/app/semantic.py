from __future__ import annotations

import os
from dataclasses import dataclass

import numpy as np
from sentence_transformers import SentenceTransformer

from .injection_detector import detect_injection_signal


@dataclass
class SemanticDecision:
    score: float
    decision: str
    explanation: str
    matched_signal: str | None = None


class SemanticVerifier:
    def __init__(self, model_name="all-MiniLM-L6-v2", cache_dir=None):
        self.model_name = model_name
        self.cache_dir = cache_dir or os.getenv("MODEL_CACHE_DIR")
        self.model = None

    def load(self):
        if self.model is None:
            self.model = SentenceTransformer(self.model_name, cache_folder=self.cache_dir)
        return self.model

    def verify(self, original_intent, proposed_action):
        matched_signal = detect_injection_signal(proposed_action)
        if matched_signal:
            return SemanticDecision(
                score=0.0,
                decision="BLOCK",
                explanation=f"Prompt injection pattern detected: {matched_signal}",
                matched_signal=matched_signal,
            )

        model = self.load()
        embeddings = model.encode([original_intent, proposed_action], normalize_embeddings=True)
        score = float(np.dot(embeddings[0], embeddings[1]))

        if score >= 0.65:
            return SemanticDecision(
                score=score,
                decision="ALLOW",
                explanation="High semantic alignment",
            )
        if score >= 0.45:
            return SemanticDecision(
                score=score,
                decision="ALLOW",
                explanation="Moderate alignment — proceed with caution",
            )
        return SemanticDecision(
            score=score,
            decision="BLOCK",
            explanation="Low semantic alignment — possible prompt injection detected",
        )

