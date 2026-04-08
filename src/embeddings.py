"""
Multimodal Embeddings for Gemma Remember RAG
Handles image (CLIP) and audio (Whisper) embeddings
"""

import torch
from sentence_transformers import SentenceTransformer
from PIL import Image
import whisper
import librosa
import numpy as np
from pathlib import Path
from typing import Union, List
from loguru import logger


class ImageEmbedder:
    """
    Image embedding using CLIP (via sentence-transformers)
    """

    def __init__(self, model_name: str = "clip-ViT-B-32"):
        """
        Initialize CLIP image embedder

        Args:
            model_name: CLIP model variant (clip-ViT-B-32, clip-ViT-L-14, etc.)
        """
        logger.info(f"Loading CLIP model: {model_name}")
        self.model = SentenceTransformer(model_name)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model.to(self.device)
        logger.info(f"CLIP model loaded on {self.device}")

    def embed_image(self, image_path: Union[str, Path]) -> np.ndarray:
        """
        Generate embedding for a single image

        Args:
            image_path: Path to image file

        Returns:
            Image embedding as numpy array
        """
        try:
            image = Image.open(image_path).convert("RGB")
            embedding = self.model.encode(image, convert_to_numpy=True)
            return embedding
        except Exception as e:
            logger.error(f"Error embedding image {image_path}: {e}")
            raise

    def embed_images(self, image_paths: List[Union[str, Path]]) -> np.ndarray:
        """
        Generate embeddings for multiple images

        Args:
            image_paths: List of paths to image files

        Returns:
            Array of image embeddings
        """
        images = [Image.open(p).convert("RGB") for p in image_paths]
        embeddings = self.model.encode(images, convert_to_numpy=True, show_progress_bar=True)
        return embeddings


class AudioEmbedder:
    """
    Audio embedding using Whisper encoder
    """

    def __init__(self, model_size: str = "base"):
        """
        Initialize Whisper audio embedder

        Args:
            model_size: Whisper model size (tiny, base, small, medium, large)
        """
        logger.info(f"Loading Whisper model: {model_size}")
        self.model = whisper.load_model(model_size)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Whisper model loaded on {self.device}")

    def embed_audio(self, audio_path: Union[str, Path]) -> np.ndarray:
        """
        Generate embedding for a single audio file

        Args:
            audio_path: Path to audio file

        Returns:
            Audio embedding as numpy array
        """
        try:
            # Load audio at 16kHz (Whisper requirement)
            audio, sr = librosa.load(audio_path, sr=16000, mono=True)

            # Pad or trim to 30 seconds (Whisper default)
            audio = whisper.pad_or_trim(audio)

            # Generate mel spectrogram
            mel = whisper.log_mel_spectrogram(audio).to(self.device)

            # Extract features from encoder
            with torch.no_grad():
                embedding = self.model.embed_audio(mel)

            return embedding.cpu().numpy().flatten()
        except Exception as e:
            logger.error(f"Error embedding audio {audio_path}: {e}")
            raise

    def transcribe_audio(self, audio_path: Union[str, Path]) -> str:
        """
        Transcribe audio to text

        Args:
            audio_path: Path to audio file

        Returns:
            Transcribed text
        """
        result = self.model.transcribe(str(audio_path))
        return result["text"]


class TextEmbedder:
    """
    Text embedding using sentence-transformers
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize text embedder

        Args:
            model_name: Sentence transformer model name
        """
        logger.info(f"Loading text model: {model_name}")
        self.model = SentenceTransformer(model_name)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model.to(self.device)
        logger.info(f"Text model loaded on {self.device}")

    def embed_text(self, text: str) -> np.ndarray:
        """
        Generate embedding for text

        Args:
            text: Input text

        Returns:
            Text embedding as numpy array
        """
        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding

    def embed_texts(self, texts: List[str]) -> np.ndarray:
        """
        Generate embeddings for multiple texts

        Args:
            texts: List of texts

        Returns:
            Array of text embeddings
        """
        embeddings = self.model.encode(texts, convert_to_numpy=True, show_progress_bar=True)
        return embeddings
