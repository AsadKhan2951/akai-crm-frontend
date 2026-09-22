from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path("public/icons")
OUT.mkdir(parents=True, exist_ok=True)
NAVY = "#16233F"
RED = "#D6202C"
WHITE = "#FFFFFF"

font_candidates = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
]
font_path = next((path for path in font_candidates if Path(path).exists()), None)

def make_icon(size: int, filename: str, maskable: bool = False):
    image = Image.new("RGB", (size, size), NAVY)
    draw = ImageDraw.Draw(image)
    margin = int(size * (0.16 if maskable else 0.12))
    draw.rounded_rectangle((margin, margin, size - margin, size - margin), radius=int(size * 0.16), fill=WHITE)
    draw.rectangle((margin, int(size * 0.62), size - margin, size - margin), fill=RED)
    font_size = int(size * 0.5)
    font = ImageFont.truetype(font_path, font_size) if font_path else None
    text = "A"
    bbox = draw.textbbox((0, 0), text, font=font)
    x = (size - (bbox[2] - bbox[0])) // 2
    y = int(size * 0.17) - bbox[1]
    draw.text((x, y), text, fill=NAVY, font=font)
    image.save(OUT / filename, format="PNG", optimize=True)

make_icon(192, "akai-icon-192.png")
make_icon(512, "akai-icon-512.png")
make_icon(512, "akai-icon-maskable-512.png", maskable=True)
print("Generated AKAI PWA icons in public/icons")
