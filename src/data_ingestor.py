"""
Data Ingestor for Gemma Remember RAG
Takes a folder of family photos / captions / audio and indexes everything
into the local vector store.
"""

import json
from pathlib import Path
from typing import Dict, Optional
from loguru import logger

from .embeddings import ImageEmbedder, TextEmbedder, AudioEmbedder
from .vector_store import MemoryStore


class FamilyDataIngestor:
    """
    Expected folder layout
    ─────────────────────
    data/raw/
      sarah/
        photo_1.jpg
        photo_2.jpg
        caption.txt        ← one caption per line, matching photo order
        story.txt           ← freeform story about this person
        voice.wav           ← optional voice clip
        meta.json           ← { "relationship": "daughter", ... }
      arki/
        ...
    """

    def __init__(
        self,
        data_dir: str = "./data/raw",
        persist_dir: str = "./data/embeddings",
        clip_model: str = "clip-ViT-B-32",
        text_model: str = "all-MiniLM-L6-v2",
        whisper_model: str = "base",
    ):
        self.data_dir = Path(data_dir)
        self.store = MemoryStore(persist_dir)
        self.image_embedder = ImageEmbedder(clip_model)
        self.text_embedder = TextEmbedder(text_model)
        self.audio_embedder: Optional[AudioEmbedder] = None
        self.whisper_model = whisper_model

    def _get_audio_embedder(self) -> AudioEmbedder:
        """Lazy-load Whisper only when audio files exist."""
        if self.audio_embedder is None:
            self.audio_embedder = AudioEmbedder(self.whisper_model)
        return self.audio_embedder

    def ingest_all(self):
        """Walk data_dir and ingest every person folder."""
        if not self.data_dir.exists():
            logger.warning(f"Data directory {self.data_dir} does not exist")
            return

        person_dirs = [d for d in self.data_dir.iterdir() if d.is_dir()]
        logger.info(f"Found {len(person_dirs)} person folders to ingest")

        for person_dir in sorted(person_dirs):
            self.ingest_person(person_dir)

        counts = self.store.count()
        logger.info(f"Ingestion complete — {counts['images']} images, {counts['texts']} texts")

    def ingest_person(self, person_dir: Path):
        """Ingest all data for one person."""
        person_name = person_dir.name.replace("_", " ").title()
        logger.info(f"Ingesting: {person_name}")

        # Load metadata
        meta = self._load_meta(person_dir, person_name)

        # Load captions and story
        captions = self._load_captions(person_dir)
        story = self._load_story(person_dir)

        # Find audio clip
        audio_path = self._find_audio(person_dir)
        audio_transcript = ""
        if audio_path:
            logger.info(f"  Found voice clip: {audio_path.name}")
            embedder = self._get_audio_embedder()
            audio_transcript = embedder.transcribe_audio(audio_path)
            meta["audio_path"] = str(audio_path.resolve())

        # Process images
        image_files = sorted(
            f
            for f in person_dir.iterdir()
            if f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp", ".bmp")
        )

        for i, img_path in enumerate(image_files):
            caption = captions[i] if i < len(captions) else ""
            memory_id = f"{person_dir.name}_img_{i}"

            # Embed the image
            img_embedding = self.image_embedder.embed_image(img_path)

            img_meta = {
                **meta,
                "caption": caption,
                "story": story,
            }

            self.store.add_image_memory(
                memory_id=memory_id,
                embedding=img_embedding,
                metadata=img_meta,
                image_path=str(img_path.resolve()),
            )

            # Also store the caption + story as text embedding
            combined_text = f"{person_name}. {caption}. {story}. {audio_transcript}".strip()
            if combined_text:
                text_embedding = self.text_embedder.embed_text(combined_text)
                self.store.add_text_memory(
                    memory_id=f"{person_dir.name}_txt_{i}",
                    embedding=text_embedding,
                    metadata={**img_meta, "image_path": str(img_path.resolve())},
                )

        logger.info(f"  Indexed {len(image_files)} images for {person_name}")

    def _load_meta(self, person_dir: Path, person_name: str) -> Dict:
        meta_file = person_dir / "meta.json"
        meta = {"person_name": person_name, "relationship": "", "audio_path": ""}
        if meta_file.exists():
            with open(meta_file) as f:
                meta.update(json.load(f))
            meta["person_name"] = person_name
        return meta

    def _load_captions(self, person_dir: Path) -> list:
        caption_file = person_dir / "caption.txt"
        if caption_file.exists():
            return [line.strip() for line in caption_file.read_text().splitlines() if line.strip()]
        return []

    def _load_story(self, person_dir: Path) -> str:
        story_file = person_dir / "story.txt"
        if story_file.exists():
            return story_file.read_text().strip()
        return ""

    def _find_audio(self, person_dir: Path) -> Optional[Path]:
        for ext in (".wav", ".mp3", ".m4a", ".ogg", ".flac"):
            matches = list(person_dir.glob(f"*{ext}"))
            if matches:
                return matches[0]
        return None
