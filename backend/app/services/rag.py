from __future__ import annotations

import logging
import math
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.core.config import KNOWLEDGE_DIR, settings
from app.services.ollama_client import ollama_service


logger = logging.getLogger(__name__)
TOKEN_PATTERN = re.compile(r"[a-zA-Z]{3,}")


@dataclass
class RetrievedChunk:
    title: str
    content: str
    score: float


class NutritionRAG:
    def __init__(self) -> None:
        self.docs = self._load_knowledge_docs()
        self.chroma_client: Any = None
        self.collection: Any = None
        self._init_backend()

    def _init_backend(self) -> None:
        backend = settings.rag_backend.strip().lower()
        if backend != "chroma":
            logger.info("RAG service initialized in lexical-only mode")
            return
        try:
            import chromadb
            from chromadb.config import Settings as ChromaSettings
        except Exception:  # noqa: BLE001
            logger.warning("Chroma backend requested but unavailable. Falling back to lexical mode.")
            return
        self.chroma_client = chromadb.PersistentClient(
            path=str((KNOWLEDGE_DIR.parent / "vector_store")),
            settings=ChromaSettings(allow_reset=True),
        )
        self.collection = self.chroma_client.get_or_create_collection(name="nutriforge_knowledge")
        logger.info("RAG service initialized with chroma backend")

    def _load_knowledge_docs(self) -> list[tuple[str, str]]:
        docs: list[tuple[str, str]] = []
        for path in sorted(Path(KNOWLEDGE_DIR).glob("*.md")):
            docs.append((path.stem.replace("_", " ").title(), path.read_text(encoding="utf-8")))
        return docs

    def rebuild(self) -> None:
        if not self.collection:
            return
        try:
            self.chroma_client.delete_collection(name="nutriforge_knowledge")
        except Exception:
            pass
        self.collection = self.chroma_client.get_or_create_collection(name="nutriforge_knowledge")
        for index, (title, content) in enumerate(self.docs):
            embedding = ollama_service.embed(content) or self._local_embedding(content)
            self.collection.add(
                ids=[f"doc-{index}"],
                documents=[content],
                metadatas=[{"title": title}],
                embeddings=[embedding],
            )

    def ready(self) -> bool:
        return bool(self.collection and self.collection.count() > 0)

    def retrieve(self, query: str, limit: int = 3) -> list[RetrievedChunk]:
        embedding = ollama_service.embed(query) or self._local_embedding(query)
        if embedding and self.ready():
            results = self.collection.query(query_embeddings=[embedding], n_results=limit)
            chunks: list[RetrievedChunk] = []
            for idx, doc in enumerate(results["documents"][0]):
                title = results["metadatas"][0][idx]["title"]
                distance = results["distances"][0][idx]
                score = max(0.0, 1.0 - min(distance, 2.0) / 2.0)
                chunks.append(RetrievedChunk(title=title, content=doc, score=score))
            if chunks:
                return chunks
        return self._lexical_retrieve(query, limit=limit)

    def _local_embedding(self, text: str, dimensions: int = 256) -> list[float]:
        vector = [0.0] * dimensions
        for token in TOKEN_PATTERN.findall(text.lower()):
            bucket = hash(token) % dimensions
            vector[bucket] = vector[bucket] + 1.0
        norm = math.sqrt(sum(value * value for value in vector))
        if norm:
            vector = [value / norm for value in vector]
        return vector

    def _lexical_retrieve(self, query: str, limit: int) -> list[RetrievedChunk]:
        query_terms = set(TOKEN_PATTERN.findall(query.lower()))
        scored: list[RetrievedChunk] = []
        for title, content in self.docs:
            words = TOKEN_PATTERN.findall(content.lower())
            if not words:
                continue
            overlap = len(query_terms.intersection(words))
            norm = math.sqrt(len(set(words)))
            score = overlap / norm if norm else 0.0
            scored.append(RetrievedChunk(title=title, content=content, score=score))
        return sorted(scored, key=lambda item: item.score, reverse=True)[:limit]


rag_service = NutritionRAG()
