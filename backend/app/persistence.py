from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.core.config import DATA_DIR
from app.db import Base
from app.db.models import Assessment, Feedback
from app.db.session import SessionLocal, engine
from app.models.schemas import AnalysisResponse, AssessmentRecord, FeedbackInput


DB_PATH = DATA_DIR / "nutriforge.sqlite3"


def init_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    if engine.url.get_backend_name() == "sqlite":
        _run_sqlite_compat_migrations()


def _run_sqlite_compat_migrations() -> None:
    with sqlite3.connect(DB_PATH) as connection:
        columns = [row[1] for row in connection.execute("PRAGMA table_info(assessments)").fetchall()]
        if columns and "user_id" not in columns:
            connection.execute("ALTER TABLE assessments ADD COLUMN user_id TEXT")
        feedback_columns = [row[1] for row in connection.execute("PRAGMA table_info(feedback)").fetchall()]
        if feedback_columns and "user_id" not in feedback_columns:
            connection.execute("ALTER TABLE feedback ADD COLUMN user_id TEXT")
        connection.commit()


def save_assessment(assessment_id: str, result: AnalysisResponse, user_id: Optional[str] = None) -> None:
    payload = result.model_dump(mode="json")
    with SessionLocal() as db:
        record = db.get(Assessment, assessment_id)
        if record:
            record.payload = json.dumps(payload)
            record.user_id = user_id or record.user_id
        else:
            db.add(
                Assessment(
                    id=assessment_id,
                    payload=json.dumps(payload),
                    user_id=user_id,
                    created_at=datetime.now(timezone.utc),
                )
            )
        db.commit()


def list_assessments(user_id: str, limit: int = 25) -> list[AssessmentRecord]:
    with SessionLocal() as db:
        rows = (
            db.query(Assessment)
            .filter(Assessment.user_id == user_id)
            .order_by(Assessment.created_at.desc())
            .limit(limit)
            .all()
        )
    return [
        AssessmentRecord(
            id=row.id,
            result=AnalysisResponse.model_validate(json.loads(row.payload)),
            created_at=row.created_at,
        )
        for row in rows
    ]


def get_assessment(assessment_id: str) -> Optional[AssessmentRecord]:
    with SessionLocal() as db:
        row = db.get(Assessment, assessment_id)
    if not row:
        return None
    return AssessmentRecord(
        id=row.id,
        result=AnalysisResponse.model_validate(json.loads(row.payload)),
        created_at=row.created_at,
    )


def is_assessment_owned_by(assessment_id: str, user_id: str) -> bool:
    with SessionLocal() as db:
        row = db.get(Assessment, assessment_id)
    return bool(row and row.user_id == user_id)


def save_feedback(payload: FeedbackInput, user_id: Optional[str] = None) -> None:
    with SessionLocal() as db:
        db.add(
            Feedback(
                assessment_id=payload.assessment_id,
                was_helpful=payload.was_helpful,
                asha_worker_id=payload.asha_worker_id,
                user_id=user_id,
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()


def database_path() -> Path:
    return DB_PATH
