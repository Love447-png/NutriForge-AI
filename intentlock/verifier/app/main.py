from __future__ import annotations

import json
import os
import time
from pathlib import Path

import httpx
import structlog
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .semantic import SemanticVerifier


load_dotenv()

logger = structlog.get_logger("intentlock.verifier")

CORE_URL = os.getenv("CORE_URL", "http://localhost:7700")
POLICY_DIR = Path(os.getenv("POLICY_DIR", Path(__file__).resolve().parents[1] / "policies"))
POLICY_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="IntentLock Verifier", version="0.1.0")
start_time = time.time()
verifier = SemanticVerifier()
recent_metrics = []
metrics_limit = 100
stats = {"total": 0, "blocked": 0}


class SemanticVerifyRequest(BaseModel):
    original_intent: str = Field(min_length=1)
    proposed_action: str = Field(min_length=1)


class SemanticVerifyResponse(BaseModel):
    score: float
    decision: str
    explanation: str


class PolicyDocument(BaseModel):
    agent_id: str
    action_type_allowlist: list[str] = []
    forbidden_targets: list[str] = []
    semantic_threshold: float = 0.45
    verification_required_for: list[str] = ["write", "delete", "network"]


DEFAULT_POLICY = {
    "action_type_allowlist": ["email.read", "file.read.local", "http.get"],
    "forbidden_targets": [],
    "semantic_threshold": 0.45,
    "verification_required_for": ["write", "delete", "network"],
}


def configure_logging():
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.add_log_level,
            structlog.processors.JSONRenderer(),
        ]
    )


def policy_path(agent_id):
    return POLICY_DIR / f"{agent_id}.json"


def load_policy(agent_id):
    path = policy_path(agent_id)
    if not path.exists():
        policy = {"agent_id": agent_id, **DEFAULT_POLICY}
        path.write_text(json.dumps(policy, indent=2))
        return policy
    return json.loads(path.read_text())


def save_policy(agent_id, payload):
    document = {"agent_id": agent_id, **payload}
    policy_path(agent_id).write_text(json.dumps(document, indent=2))
    return document


@app.on_event("startup")
async def startup_event():
    configure_logging()
    verifier.load()
    logger.info("verifier_started", model=verifier.model_name, core_url=CORE_URL)


@app.get("/health")
async def health():
    total = stats["total"]
    blocked = stats["blocked"]
    block_rate = (blocked / total) if total else 0.0
    return {
        "status": "ok",
        "service": "intentlock-verifier",
        "model": verifier.model_name,
        "model_loaded": verifier.model is not None,
        "uptime_seconds": round(time.time() - start_time, 2),
        "total_verifications": total,
        "block_rate": block_rate,
    }


@app.post("/verify/semantic", response_model=SemanticVerifyResponse)
async def verify_semantic(payload: SemanticVerifyRequest):
    result = verifier.verify(payload.original_intent, payload.proposed_action)
    stats["total"] += 1
    if result.decision == "BLOCK":
        stats["blocked"] += 1

    event = {
        "timestamp": time.time(),
        "original_intent": payload.original_intent,
        "proposed_action": payload.proposed_action,
        "score": result.score,
        "decision": result.decision,
        "explanation": result.explanation,
        "matched_signal": result.matched_signal,
    }
    recent_metrics.append(event)
    if len(recent_metrics) > metrics_limit:
        del recent_metrics[0 : len(recent_metrics) - metrics_limit]

    logger.info("semantic_verification", **event)
    return SemanticVerifyResponse(
        score=result.score,
        decision=result.decision,
        explanation=result.explanation,
    )


@app.get("/metrics/summary")
async def metrics_summary():
    return {
        "recent_decisions": recent_metrics[-100:],
        "totals": stats,
    }


@app.get("/policy/{agent_id}")
async def get_policy(agent_id: str):
    return load_policy(agent_id)


@app.post("/policy/{agent_id}")
async def update_policy(agent_id: str, policy: PolicyDocument):
    return save_policy(agent_id, policy.model_dump(exclude={"agent_id"}))


@app.get("/core/health")
async def core_health_proxy():
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(f"{CORE_URL}/health")
        if response.is_error:
            raise HTTPException(status_code=502, detail="core service unavailable")
        return response.json()
