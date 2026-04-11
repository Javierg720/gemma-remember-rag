# Memory Anchor — Multimodal RAG for Dementia Care

**Gemma 4 for Good Hackathon Submission**

An offline, privacy-first app that helps dementia patients remember loved ones using **Multimodal RAG** (Retrieval-Augmented Generation) powered by Gemma.

## Demo Video

[![Watch the demo](https://img.youtube.com/vi/PSULKHnq1kY/maxresdefault.jpg)](https://www.youtube.com/watch?v=PSULKHnq1kY)

## Why RAG instead of Fine-Tuning?

| | Fine-Tuning | Multimodal RAG |
|---|---|---|
| Training needed | Yes (GPU hours) | No |
| Add new memories | Retrain required | Instant |
| Hallucination risk | Higher | Lower (grounded in retrieved data) |
| Hardware needs | GPU for training | CPU-friendly |
| Dataset size | Needs 200-500+ examples | Works with 1 photo per person |

## How It Works

```
User: "Who is this?" + [photo]
  → CLIP encodes query image → embedding
  → ChromaDB similarity search → top-3 matching family photos
  → Retrieve: name, relationship, story, voice clip path
  → Gemma generates warm, grounded response
  → Play voice clip if available
```

## Tech Stack

- **CLIP (ViT-B/32)** — image embeddings (512-dim)
- **MiniLM-L6-v2** — text embeddings (384-dim)
- **ChromaDB** — local vector database (no cloud)
- **Gemma 4 E2B-IT** — response generation (runs on GPU)
- **Gradio** — simple local web UI

## Privacy

Everything stays local. No cloud, no internet, no telemetry. ChromaDB stores data as local files. Gemma runs on-device. UI bound to localhost only.

## Links

- **Kaggle Notebook**: [Memory Anchor RAG](https://www.kaggle.com/code/frgrgdfgd/memory-anchor-multimodal-rag-for-dementia-care)
- **Original fine-tuning version**: [github.com/Javierg720/gemma-remember](https://github.com/Javierg720/gemma-remember)
- **Demo Video**: [YouTube](https://www.youtube.com/watch?v=PSULKHnq1kY)

## License

MIT — use it, adapt it, help someone you love.
