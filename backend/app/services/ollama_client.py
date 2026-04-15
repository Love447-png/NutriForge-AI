from __future__ import annotations

import base64
import logging
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from pathlib import Path
from typing import Any, Callable, Optional

from ollama import Client, ResponseError

from app.core.config import settings


logger = logging.getLogger(__name__)


class OllamaService:
    def __init__(self) -> None:
        self.client = Client(host=settings.ollama_base_url)
        self.request_timeout_seconds = 8

    def _run_with_timeout(self, fn: Callable[[], Any], timeout: Optional[int] = None) -> Any:
        executor = ThreadPoolExecutor(max_workers=1)
        future = executor.submit(fn)
        try:
            return future.result(timeout=timeout or self.request_timeout_seconds)
        except Exception:
            future.cancel()
            executor.shutdown(wait=False, cancel_futures=True)
            raise
        finally:
            executor.shutdown(wait=False, cancel_futures=True)

    def ping(self) -> bool:
        try:
            self._run_with_timeout(lambda: self.client.list(), timeout=3)
            return True
        except FutureTimeoutError:
            logger.warning("Ollama ping timed out")
            return False
        except Exception as exc:
            logger.warning("Ollama unavailable: %s", exc)
            return False

    def embed(self, text: str) -> Optional[list[float]]:
        try:
            if hasattr(self.client, "embed"):
                response = self._run_with_timeout(lambda: self.client.embed(model=settings.embed_model, input=text))
                embeddings = response.get("embeddings")
                if embeddings:
                    return embeddings[0]
            response = self._run_with_timeout(lambda: self.client.embeddings(model=settings.embed_model, prompt=text))
            return response.get("embedding")
        except FutureTimeoutError:
            logger.warning("Embedding request timed out")
            return None
        except Exception as exc:
            logger.warning("Embedding fallback activated: %s", exc)
            return None

    def generate(self, prompt: str, system: Optional[str] = None, model: Optional[str] = None) -> Optional[str]:
        try:
            response = self._run_with_timeout(
                lambda: self.client.chat(
                    model=model or settings.llm_model,
                    messages=[
                        {"role": "system", "content": system or "You are NutriForge, a careful pediatric nutrition assistant."},
                        {"role": "user", "content": prompt},
                    ],
                    options={"temperature": 0.2},
                )
            )
            return response["message"]["content"]
        except FutureTimeoutError:
            logger.warning("LLM generation timed out")
            return None
        except ResponseError as exc:
            logger.warning("LLM generation failed: %s", exc)
            return None
        except Exception as exc:
            logger.warning("Unexpected LLM failure: %s", exc)
            return None

    def analyze_image(self, image_path: Path, prompt: str) -> Optional[str]:
        try:
            encoded = base64.b64encode(image_path.read_bytes()).decode("utf-8")
            response = self._run_with_timeout(
                lambda: self.client.chat(
                    model=settings.vision_model,
                    messages=[
                        {
                            "role": "user",
                            "content": prompt,
                            "images": [encoded],
                        }
                    ],
                    options={"temperature": 0.1},
                )
            )
            return response["message"]["content"]
        except FutureTimeoutError:
            logger.warning("Vision model request timed out, using visual fallback")
            return None
        except Exception as exc:
            logger.warning("Vision model unavailable, using visual fallback: %s", exc)
            return None


ollama_service = OllamaService()
