"""
Mock Data Generator for Memory Anchor RAG
Creates realistic test data so you can try the system before uploading real family photos.
"""

import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np
from loguru import logger


MOCK_FAMILY = [
    {
        "name": "sarah",
        "person_name": "Sarah",
        "relationship": "daughter",
        "captions": [
            "Sarah smiling at her college graduation, May 2018",
            "Sarah baking cookies in the kitchen, Christmas 2019",
            "Sarah and Mom at the beach, summer 2020",
        ],
        "story": (
            "Sarah is your youngest daughter. She loves baking — especially those "
            "chocolate chip cookies you two always made together. She graduated from "
            "State University in 2018 with a degree in nursing. She calls you every "
            "Sunday evening. Her favorite color is blue, just like yours."
        ),
        "color": (255, 182, 193),  # light pink
    },
    {
        "name": "arki",
        "person_name": "Arki",
        "relationship": "son",
        "captions": [
            "Arki building the birdhouse in the backyard, spring 1998",
            "Arki at his wedding, June 2015",
            "Arki holding baby Maya, his first child, 2020",
        ],
        "story": (
            "Arki is your eldest son. He built you that beautiful birdhouse in the "
            "backyard back in '98 — it's still there! He married Lisa in 2015 and "
            "they have a daughter named Maya. He works as a carpenter, just like "
            "his grandfather. He visits every other weekend."
        ),
        "color": (173, 216, 230),  # light blue
    },
    {
        "name": "lisa",
        "person_name": "Lisa",
        "relationship": "daughter-in-law",
        "captions": [
            "Lisa and Arki's wedding day, June 2015",
            "Lisa teaching Maya to ride a bike, 2023",
        ],
        "story": (
            "Lisa is Arki's wife — your daughter-in-law. She's a schoolteacher "
            "and always brings your favorite lemon cake when she visits. She and "
            "Arki met in college."
        ),
        "color": (255, 218, 185),  # peach
    },
    {
        "name": "maya",
        "person_name": "Maya",
        "relationship": "granddaughter",
        "captions": [
            "Maya's first birthday party, 2021",
            "Maya drawing pictures with Grandma, 2023",
            "Maya at the park with her teddy bear, 2024",
        ],
        "story": (
            "Maya is your granddaughter — Arki and Lisa's little girl. She was born "
            "in 2020. She loves drawing and always makes pictures for you. Her favorite "
            "thing is when you read her bedtime stories. She calls you 'Nana'."
        ),
        "color": (255, 255, 200),  # light yellow
    },
    {
        "name": "robert",
        "person_name": "Robert",
        "relationship": "husband",
        "captions": [
            "Robert and you on your wedding day, 1975",
            "Robert fishing at the lake, summer 1990",
            "Robert in the garden with his roses, 2010",
        ],
        "story": (
            "Robert is your husband. You married in 1975 — that's almost 50 years "
            "together. He loved fishing and tending his rose garden. His favorite "
            "song was 'Moon River'. He always said you were the best thing that ever "
            "happened to him."
        ),
        "color": (200, 230, 200),  # light green
    },
    {
        "name": "dr_chen",
        "person_name": "Dr. Chen",
        "relationship": "doctor",
        "captions": [
            "Dr. Chen at the clinic, your Tuesday checkups",
        ],
        "story": (
            "Dr. Chen is your doctor. You see her every Tuesday afternoon at 2pm "
            "at the Riverside Clinic. She's been your doctor for 5 years and is "
            "very kind and patient. She always asks about your garden."
        ),
        "color": (220, 220, 240),  # light lavender
    },
    {
        "name": "buddy",
        "person_name": "Buddy",
        "relationship": "pet dog",
        "captions": [
            "Buddy as a puppy, the day you brought him home, 2019",
            "Buddy playing in the yard with Maya, 2023",
        ],
        "story": (
            "Buddy is your golden retriever. You got him as a puppy in 2019. "
            "He loves belly rubs and follows you everywhere. He sleeps at the "
            "foot of your bed every night. Maya loves playing fetch with him."
        ),
        "color": (255, 215, 140),  # golden
    },
    {
        "name": "margaret",
        "person_name": "Margaret",
        "relationship": "best friend",
        "captions": [
            "Margaret and you at the quilting circle, 2018",
            "Margaret's 75th birthday party, 2022",
        ],
        "story": (
            "Margaret is your best friend since high school — over 55 years! "
            "You two go to the quilting circle every Thursday at the community "
            "center. She lives three houses down on Maple Street. She always "
            "brings Earl Grey tea when she visits."
        ),
        "color": (230, 200, 230),  # light purple
    },
]


def generate_mock_photo(person: dict, index: int, output_path: Path) -> Path:
    """Generate a simple placeholder photo with the person's name and caption."""
    width, height = 512, 512
    img = Image.new("RGB", (width, height), person["color"])
    draw = ImageDraw.Draw(img)

    # Draw a simple face-like shape
    cx, cy = width // 2, height // 2 - 30
    draw.ellipse([cx - 80, cy - 80, cx + 80, cy + 80], fill="white", outline="gray", width=2)
    draw.ellipse([cx - 30, cy - 20, cx - 10, cy], fill="gray")  # left eye
    draw.ellipse([cx + 10, cy - 20, cx + 30, cy], fill="gray")  # right eye
    draw.arc([cx - 30, cy + 10, cx + 30, cy + 40], 0, 180, fill="gray", width=2)  # smile

    # Add name text
    name_text = person["person_name"]
    try:
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
    except (IOError, OSError):
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()

    draw.text((width // 2, height - 100), name_text, fill="black", anchor="mm", font=font_large)

    caption = person["captions"][index] if index < len(person["captions"]) else ""
    if caption:
        # Word wrap the caption
        words = caption.split()
        lines = []
        current = ""
        for w in words:
            test = f"{current} {w}".strip()
            if len(test) > 40:
                lines.append(current)
                current = w
            else:
                current = test
        if current:
            lines.append(current)

        y = height - 70
        for line in lines[:2]:
            draw.text((width // 2, y), line, fill="dimgray", anchor="mm", font=font_small)
            y += 20

    filepath = output_path / f"photo_{index + 1}.jpg"
    img.save(filepath, quality=90)
    return filepath


def generate_mock_data(output_dir: str = "./data/raw"):
    """Generate complete mock family dataset."""
    base = Path(output_dir)
    base.mkdir(parents=True, exist_ok=True)

    logger.info(f"Generating mock family data in {base}")

    for person in MOCK_FAMILY:
        person_dir = base / person["name"]
        person_dir.mkdir(parents=True, exist_ok=True)

        # Generate photos
        for i in range(len(person["captions"])):
            generate_mock_photo(person, i, person_dir)

        # Write captions
        (person_dir / "caption.txt").write_text("\n".join(person["captions"]))

        # Write story
        (person_dir / "story.txt").write_text(person["story"])

        # Write metadata
        meta = {"relationship": person["relationship"]}
        (person_dir / "meta.json").write_text(json.dumps(meta, indent=2))

        logger.info(
            f"  {person['person_name']} ({person['relationship']}): "
            f"{len(person['captions'])} photos"
        )

    logger.info(f"Generated {len(MOCK_FAMILY)} family members with mock data")
    return base


if __name__ == "__main__":
    generate_mock_data()
