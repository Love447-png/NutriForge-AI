from __future__ import annotations

from collections import defaultdict, deque
from datetime import datetime, timezone
import time

from fastapi import APIRouter, Depends, HTTPException, status
from starlette.requests import Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.models import RefreshToken, User
from app.db.session import get_db_session
from app.models.schemas import AuthResponse, RefreshTokenInput, SessionUser, UserSigninInput, UserSignupInput
from app.services.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    token_hash,
    verify_password,
)


router = APIRouter(prefix="/v1/auth", tags=["auth"])
_rate_limit_window_seconds = 60
_rate_limit_max_requests = 20
_request_timestamps: dict[str, deque[float]] = defaultdict(deque)


def _enforce_auth_rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    events = _request_timestamps[client_ip]
    while events and now - events[0] > _rate_limit_window_seconds:
        events.popleft()
    if len(events) >= _rate_limit_max_requests:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many auth attempts")
    events.append(now)


def _session_user(user: User) -> SessionUser:
    return SessionUser(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        asha_worker_id=user.asha_worker_id,
        state=user.state,
        language_preference=user.language_preference,
    )


def _issue_tokens(db: Session, user: User) -> AuthResponse:
    access = create_access_token(user.id, user.email)
    refresh = create_refresh_token(user.id)
    payload = decode_token(refresh)
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=token_hash(refresh),
            expires_at=datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
            revoked=False,
        )
    )
    db.commit()
    return AuthResponse(access_token=access, refresh_token=refresh, user=_session_user(user))


@router.post("/signup", response_model=AuthResponse)
def signup(payload: UserSignupInput, request: Request, db: Session = Depends(get_db_session)) -> AuthResponse:
    _enforce_auth_rate_limit(request)
    existing = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")
    user = User(
        full_name=payload.full_name.strip(),
        email=payload.email.lower().strip(),
        password_hash=hash_password(payload.password),
        role=payload.role,
        asha_worker_id=payload.asha_worker_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _issue_tokens(db, user)


@router.post("/signin", response_model=AuthResponse)
def signin(payload: UserSigninInput, request: Request, db: Session = Depends(get_db_session)) -> AuthResponse:
    _enforce_auth_rate_limit(request)
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return _issue_tokens(db, user)


@router.post("/refresh", response_model=AuthResponse)
def refresh(payload: RefreshTokenInput, db: Session = Depends(get_db_session)) -> AuthResponse:
    try:
        decoded = decode_token(payload.refresh_token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc
    if decoded.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    stored = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash(payload.refresh_token)).first()
    if not stored or stored.revoked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has been revoked")
    expires_at = stored.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has expired")
    user = db.get(User, decoded.get("sub"))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    stored.revoked = True
    db.commit()
    return _issue_tokens(db, user)


@router.post("/logout")
def logout(payload: RefreshTokenInput, db: Session = Depends(get_db_session)) -> dict[str, str]:
    stored = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash(payload.refresh_token)).first()
    if stored:
        stored.revoked = True
        db.commit()
    return {"status": "ok"}


@router.get("/me", response_model=SessionUser)
def me(current_user: User = Depends(get_current_user)) -> SessionUser:
    return _session_user(current_user)
