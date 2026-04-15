from __future__ import annotations

import logging
import time

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.requests import Request

from app.api.auth_routes import router as auth_router
from app.api.routes import router
from app.core.config import settings, validate_security_settings
from app.persistence import init_db
from app.services.rag import rag_service


logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))
logger = logging.getLogger("nutriforge")


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, version="1.0.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth_router, prefix="/api")
    app.include_router(router, prefix="/api")

    @app.on_event("startup")
    def startup_event() -> None:
        validate_security_settings()
        init_db()
        if not rag_service.ready():
            rag_service.rebuild()
        logger.info("NutriForge started in %s mode", settings.environment)

    @app.middleware("http")
    async def log_requests(request: Request, call_next):  # type: ignore[no-untyped-def]
        started = time.perf_counter()
        response = await call_next(request)
        elapsed = (time.perf_counter() - started) * 1000
        logger.info("%s %s -> %s (%.1fms)", request.method, request.url.path, response.status_code, elapsed)
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"detail": "Validation failed", "errors": exc.errors()})

    return app


app = create_app()
