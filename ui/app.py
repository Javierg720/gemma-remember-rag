"""
Gemma Remember — Gradio UI
Simple, warm interface for dementia care.
Camera upload, text query, voice playback.
"""

import gradio as gr
from pathlib import Path
from PIL import Image
import sys
import os

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from src.rag_engine import GemmaRememberRAG


# ── Global RAG engine ────────────────────────────────────────────

rag: GemmaRememberRAG = None


def initialize():
    global rag
    rag = GemmaRememberRAG(
        persist_dir="./data/embeddings",
        clip_model="clip-ViT-B-32",
        text_model="all-MiniLM-L6-v2",
        top_k=3,
    )
    # Optionally load LLM for richer responses
    # rag.load_llm("google/gemma-3-4b-it")


def handle_image_query(image, question):
    """Handle a photo + question from the user."""
    if image is None:
        return "Please share a photo and I'll help you remember.", None, ""

    if not question.strip():
        question = "Who is this person?"

    result = rag.query_with_image(image, question)
    response = result["response"]

    # Find the best-matching reference photo to show
    ref_image = None
    audio_path = None
    if result["retrieved_memories"]:
        best = result["retrieved_memories"][0]
        img_path = best.get("image_path", "")
        if img_path and Path(img_path).exists():
            ref_image = Image.open(img_path)
        audio_path = best.get("audio_path", "")
        if audio_path and not Path(audio_path).exists():
            audio_path = None

    return response, ref_image, audio_path


def handle_text_query(question):
    """Handle a text-only question."""
    if not question.strip():
        return "What would you like to know? You can ask about anyone in your family."

    result = rag.query_with_text(question)
    return result["response"]


def get_stored_people():
    """List all people in the memory store."""
    if rag is None:
        return "Memory store not loaded yet."
    people = rag.store.list_people()
    if not people:
        return "No family members stored yet. Upload photos to get started!"
    return "People I remember: " + ", ".join(people)


# ── Build the UI ──────────────────────────────────────────────────

def create_app():
    initialize()

    with gr.Blocks(
        title="Gemma Remember",
        theme=gr.themes.Soft(
            primary_hue="amber",
            secondary_hue="orange",
        ),
        css="""
        .main-header { text-align: center; margin-bottom: 20px; }
        .main-header h1 { font-size: 2.5em; color: #d97706; }
        .main-header p { font-size: 1.2em; color: #78716c; }
        """,
    ) as app:

        gr.HTML("""
        <div class="main-header">
            <h1>Gemma Remember</h1>
            <p>Helping you remember the people you love</p>
        </div>
        """)

        with gr.Tab("Show Me a Photo"):
            gr.Markdown("**Upload or take a photo** and I'll help you remember who it is.")
            with gr.Row():
                with gr.Column(scale=1):
                    input_image = gr.Image(
                        type="pil",
                        label="Photo",
                        sources=["upload", "webcam"],
                    )
                    question_box = gr.Textbox(
                        label="Your question (optional)",
                        placeholder="Who is this? Tell me about them...",
                        value="Who is this person?",
                    )
                    submit_btn = gr.Button("Help Me Remember", variant="primary", size="lg")

                with gr.Column(scale=1):
                    response_text = gr.Textbox(label="Here's what I remember", lines=6)
                    ref_photo = gr.Image(label="Photo from your memories", type="pil")
                    audio_player = gr.Audio(label="Voice clip", type="filepath")

            submit_btn.click(
                fn=handle_image_query,
                inputs=[input_image, question_box],
                outputs=[response_text, ref_photo, audio_player],
            )

        with gr.Tab("Ask Me Anything"):
            gr.Markdown("**Type a question** about your family and I'll tell you what I know.")
            text_input = gr.Textbox(
                label="Your question",
                placeholder="Tell me about Sarah... What did Arki build?",
                lines=2,
            )
            text_submit = gr.Button("Ask", variant="primary")
            text_response = gr.Textbox(label="Here's what I know", lines=6)

            text_submit.click(
                fn=handle_text_query,
                inputs=[text_input],
                outputs=[text_response],
            )

        with gr.Tab("My Family"):
            gr.Markdown("**People in your memory bank:**")
            people_display = gr.Textbox(label="Stored memories", lines=3)
            refresh_btn = gr.Button("Refresh")
            refresh_btn.click(fn=get_stored_people, outputs=[people_display])

            gr.Markdown("""
            ### How to Add Memories

            Create a folder for each person in `data/raw/`:
            ```
            data/raw/sarah/
              photo_1.jpg       # Their photos
              caption.txt       # One caption per line
              story.txt         # A story about them
              voice.wav         # A voice clip (optional)
              meta.json         # {"relationship": "daughter"}
            ```
            Then run: `python -m src.data_ingestor`
            """)

    return app


if __name__ == "__main__":
    app = create_app()
    app.launch(
        server_name="127.0.0.1",
        server_port=7860,
        share=False,  # NEVER share — privacy first
    )
