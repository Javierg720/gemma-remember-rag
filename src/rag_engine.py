"""
RAG Engine for Gemma Remember
Retrieves relevant family memories and generates warm, grounded responses.
"""

import torch
from pathlib import Path
from typing import Dict, List, Optional, Union
from PIL import Image
from loguru import logger

from .embeddings import ImageEmbedder, TextEmbedder
from .vector_store import MemoryStore


# ── Prompt template ───────────────────────────────────────────────

SYSTEM_PROMPT = """You are Gemma Remember, a warm and patient companion for someone \
with dementia. Your job is to help them remember their loved ones.

RULES:
- ONLY use the information provided in the RETRIEVED MEMORIES below.
- NEVER invent facts, names, dates, or stories that are not in the memories.
- If you don't recognise someone, say so gently: "I'm not sure who this is — \
would you like to tell me about them so I can remember for next time?"
- Speak simply, warmly, and with patience — like a caring family member.
- Use the person's name early in your response.
- Reference specific shared memories to spark recognition.
- If there is an audio clip available, mention that you can play it.
"""

QUERY_TEMPLATE = """RETRIEVED MEMORIES (ranked by similarity):
{context}

USER'S QUESTION: {question}

Respond warmly. Ground every fact in the retrieved memories above."""


class GemmaRememberRAG:
    """
    The main RAG pipeline:
    1. Embed the query (image or text)
    2. Retrieve top-k memories from ChromaDB
    3. Build a prompt with retrieved context
    4. Generate a response with Gemma 4 (or return prompt for external LLM)
    """

    def __init__(
        self,
        persist_dir: str = "./data/embeddings",
        clip_model: str = "clip-ViT-B-32",
        text_model: str = "all-MiniLM-L6-v2",
        top_k: int = 3,
    ):
        self.store = MemoryStore(persist_dir)
        self.image_embedder = ImageEmbedder(clip_model)
        self.text_embedder = TextEmbedder(text_model)
        self.top_k = top_k
        self.llm = None
        self.tokenizer = None

    # ── LLM loading (optional — can run without) ─────────────────

    def load_llm(self, model_name: str = "google/gemma-3-4b-it"):
        """
        Load Gemma for local generation.
        Defaults to Gemma 3 4B (widely available).
        Swap to google/gemma-4-e4b-it when Gemma 4 is released publicly.
        """
        from transformers import AutoTokenizer, AutoModelForCausalLM

        logger.info(f"Loading LLM: {model_name}")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.llm = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            device_map="auto",
        )
        logger.info("LLM loaded")

    # ── Core RAG pipeline ─────────────────────────────────────────

    def query_with_image(
        self,
        image: Union[str, Path, Image.Image],
        question: str = "Who is this person?",
    ) -> Dict:
        """
        Given a photo, find matching family members and generate a response.
        """
        # Embed the query image
        if isinstance(image, (str, Path)):
            img_embedding = self.image_embedder.embed_image(image)
        else:
            # PIL Image passed directly (from Gradio)
            import tempfile, os
            tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
            image.save(tmp.name)
            img_embedding = self.image_embedder.embed_image(tmp.name)
            os.unlink(tmp.name)

        # Retrieve similar images
        results = self.store.search_by_image(img_embedding, n_results=self.top_k)

        # Build context
        context = self._format_context(results)
        prompt = self._build_prompt(context, question)

        # Generate response
        response = self._generate(prompt)

        return {
            "response": response,
            "retrieved_memories": results,
            "prompt": prompt,
        }

    def query_with_text(self, question: str) -> Dict:
        """
        Given a text question, find matching memories and generate a response.
        """
        text_embedding = self.text_embedder.embed_text(question)
        results = self.store.search_by_text(text_embedding, n_results=self.top_k)

        context = self._format_context(results)
        prompt = self._build_prompt(context, question)
        response = self._generate(prompt)

        return {
            "response": response,
            "retrieved_memories": results,
            "prompt": prompt,
        }

    # ── Internal helpers ──────────────────────────────────────────

    def _format_context(self, results: List[Dict]) -> str:
        if not results:
            return "No matching memories found."

        parts = []
        for i, r in enumerate(results, 1):
            distance = r.get("distance", 0)
            confidence = max(0, 1 - distance)
            part = (
                f"Memory {i} (confidence: {confidence:.0%}):\n"
                f"  Name: {r['person_name']}\n"
                f"  Relationship: {r.get('relationship', 'Unknown')}\n"
                f"  Caption: {r.get('caption', 'No caption')}\n"
                f"  Story: {r.get('story', 'No story available')}\n"
                f"  Audio clip: {'Available' if r.get('audio_path') else 'None'}"
            )
            parts.append(part)
        return "\n\n".join(parts)

    def _build_prompt(self, context: str, question: str) -> str:
        return QUERY_TEMPLATE.format(context=context, question=question)

    def _generate(self, prompt: str) -> str:
        if self.llm is None:
            # No LLM loaded — return raw context for external use
            return self._simple_response(prompt)

        messages = [
            {"role": "user", "content": SYSTEM_PROMPT + "\n\n" + prompt},
        ]
        input_ids = self.tokenizer.apply_chat_template(
            messages, return_tensors="pt", add_generation_prompt=True
        ).to(self.llm.device)

        with torch.no_grad():
            output = self.llm.generate(
                input_ids,
                max_new_tokens=256,
                temperature=0.7,
                top_p=0.9,
                do_sample=True,
            )

        response = self.tokenizer.decode(
            output[0][input_ids.shape[1]:], skip_special_tokens=True
        )
        return response.strip()

    def _simple_response(self, prompt: str) -> str:
        """
        Fallback when no LLM is loaded — extract key info from retrieved context.
        Good enough for demos and low-resource devices.
        """
        lines = prompt.split("\n")
        name = ""
        relationship = ""
        caption = ""
        story = ""
        has_audio = False

        for line in lines:
            line = line.strip()
            if line.startswith("Name:"):
                name = line.split(":", 1)[1].strip()
            elif line.startswith("Relationship:"):
                relationship = line.split(":", 1)[1].strip()
            elif line.startswith("Caption:"):
                caption = line.split(":", 1)[1].strip()
            elif line.startswith("Story:"):
                story = line.split(":", 1)[1].strip()
            elif line.startswith("Audio clip: Available"):
                has_audio = True

        if not name or name == "Unknown":
            return (
                "I'm not sure who this is. "
                "Would you like to tell me about them so I can remember for next time?"
            )

        parts = [f"This is {name}"]
        if relationship:
            parts[0] += f", your {relationship}"
        parts[0] += "."

        if caption and caption != "No caption":
            parts.append(caption)
        if story and story != "No story available":
            parts.append(story)
        if has_audio:
            parts.append(f"I also have a voice clip of {name} — would you like to hear it?")

        return " ".join(parts)
