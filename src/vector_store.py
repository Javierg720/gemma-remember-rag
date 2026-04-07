"""
Vector Store for Memory Anchor RAG
Local ChromaDB — all data stays on-device, never leaves.
"""

import chromadb
from chromadb.config import Settings
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional
from loguru import logger


class MemoryStore:
    """
    ChromaDB-backed vector store for family memories.
    Stores image embeddings, text embeddings, and metadata (names, stories, audio paths).
    """

    def __init__(self, persist_dir: str = "./data/embeddings"):
        persist_path = Path(persist_dir).resolve()
        persist_path.mkdir(parents=True, exist_ok=True)

        logger.info(f"Initializing ChromaDB at {persist_path}")
        self.client = chromadb.PersistentClient(
            path=str(persist_path),
            settings=Settings(anonymized_telemetry=False),  # privacy first
        )

        # Two collections: one for images, one for text
        self.image_collection = self.client.get_or_create_collection(
            name="family_images",
            metadata={"hnsw:space": "cosine"},
        )
        self.text_collection = self.client.get_or_create_collection(
            name="family_text",
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(
            f"Collections ready — images: {self.image_collection.count()}, "
            f"text: {self.text_collection.count()}"
        )

    # ── Add memories ──────────────────────────────────────────────

    def add_image_memory(
        self,
        memory_id: str,
        embedding: np.ndarray,
        metadata: Dict,
        image_path: str,
    ):
        """Store an image embedding with metadata about the person."""
        meta = {
            "person_name": metadata.get("person_name", "Unknown"),
            "relationship": metadata.get("relationship", ""),
            "caption": metadata.get("caption", ""),
            "story": metadata.get("story", ""),
            "audio_path": metadata.get("audio_path", ""),
            "image_path": image_path,
        }
        self.image_collection.upsert(
            ids=[memory_id],
            embeddings=[embedding.tolist()],
            metadatas=[meta],
        )
        logger.debug(f"Stored image memory: {memory_id} ({meta['person_name']})")

    def add_text_memory(
        self,
        memory_id: str,
        embedding: np.ndarray,
        metadata: Dict,
    ):
        """Store a text embedding (caption / story) with metadata."""
        meta = {
            "person_name": metadata.get("person_name", "Unknown"),
            "relationship": metadata.get("relationship", ""),
            "caption": metadata.get("caption", ""),
            "story": metadata.get("story", ""),
            "audio_path": metadata.get("audio_path", ""),
            "image_path": metadata.get("image_path", ""),
        }
        self.text_collection.upsert(
            ids=[memory_id],
            embeddings=[embedding.tolist()],
            metadatas=[meta],
        )
        logger.debug(f"Stored text memory: {memory_id} ({meta['person_name']})")

    # ── Retrieve memories ─────────────────────────────────────────

    def search_by_image(
        self, query_embedding: np.ndarray, n_results: int = 3
    ) -> List[Dict]:
        """Find the closest family photos to a query image."""
        results = self.image_collection.query(
            query_embeddings=[query_embedding.tolist()],
            n_results=n_results,
        )
        return self._format_results(results)

    def search_by_text(
        self, query_embedding: np.ndarray, n_results: int = 3
    ) -> List[Dict]:
        """Find the closest text memories to a query."""
        results = self.text_collection.query(
            query_embeddings=[query_embedding.tolist()],
            n_results=n_results,
        )
        return self._format_results(results)

    # ── Helpers ────────────────────────────────────────────────────

    def _format_results(self, raw) -> List[Dict]:
        formatted = []
        if not raw["ids"][0]:
            return formatted
        for i, doc_id in enumerate(raw["ids"][0]):
            formatted.append(
                {
                    "id": doc_id,
                    "distance": raw["distances"][0][i],
                    **raw["metadatas"][0][i],
                }
            )
        return formatted

    def list_people(self) -> List[str]:
        """Return unique person names in the store."""
        all_meta = self.image_collection.get()["metadatas"]
        names = sorted({m["person_name"] for m in all_meta if m.get("person_name")})
        return names

    def count(self) -> Dict[str, int]:
        return {
            "images": self.image_collection.count(),
            "texts": self.text_collection.count(),
        }

    def delete_person(self, person_name: str):
        """Remove all memories for a specific person."""
        for coll in (self.image_collection, self.text_collection):
            all_data = coll.get()
            ids_to_delete = [
                doc_id
                for doc_id, meta in zip(all_data["ids"], all_data["metadatas"])
                if meta.get("person_name") == person_name
            ]
            if ids_to_delete:
                coll.delete(ids=ids_to_delete)
                logger.info(f"Deleted {len(ids_to_delete)} memories for {person_name}")
