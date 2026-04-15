from pathlib import Path
import sys

from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.persistence import init_db


client = TestClient(app)


def test_auth_signup_signin_and_assessment_flow() -> None:
    init_db()
    signup_response = client.post(
        "/api/v1/auth/signup",
        json={
            "full_name": "Test User",
            "email": "test-user@example.com",
            "password": "password123",
            "role": "parent",
        },
    )
    assert signup_response.status_code in {200, 409}

    signin_response = client.post(
        "/api/v1/auth/signin",
        json={
            "email": "test-user@example.com",
            "password": "password123",
        },
    )
    assert signin_response.status_code == 200
    tokens = signin_response.json()
    assert tokens["access_token"]
    assert tokens["refresh_token"]

    auth_header = {"Authorization": f"Bearer {tokens['access_token']}"}

    assess_response = client.post(
        "/api/v1/assess",
        headers=auth_header,
        json={
            "child_name": "Child A",
            "age_months": 24,
            "sex": "male",
            "weight_kg": 9.0,
            "height_cm": 84.0,
            "muac_mm": 125.0,
            "state": "Bihar",
            "region": "rural block",
            "budget_inr": 80,
            "notes": "low appetite",
            "photo_base64": None,
            "language": "en",
        },
    )
    assert assess_response.status_code == 200
    assessment = assess_response.json()
    assert assessment["assessment_id"]

    history_response = client.get("/api/v1/assessments", headers=auth_header)
    assert history_response.status_code == 200
    history = history_response.json()
    assert isinstance(history, list)
    assert len(history) >= 1
