from PIL import Image, ImageDraw, ImageFont
import os


# ── Constants ─────────────────────────────────────────────────────────────────
BADGE_W, BADGE_H = 600, 350
BG_COLOR = (20, 20, 50)           # dark navy
ACCENT_COLOR = (0, 200, 170)      # teal
TEXT_COLOR = (255, 255, 255)
SECONDARY_COLOR = (180, 180, 200)


def _load_font(size: int):
    """Try to load a system font; fall back to PIL default."""
    font_candidates = [
        "arial.ttf",
        "Arial.ttf",
        "DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for f in font_candidates:
        try:
            return ImageFont.truetype(f, size)
        except (IOError, OSError):
            continue
    return ImageFont.load_default()


def generate_badge(
    name: str,
    company: str,
    qr_id: str,
    qr_code_path: str = None,
    photo_url: str = None,
    output_dir: str = "static/badges",
) -> str:
    """
    Generate a badge PNG image using Pillow.
    Returns the relative path to the saved badge.
    """
    os.makedirs(output_dir, exist_ok=True)

    img = Image.new("RGB", (BADGE_W, BADGE_H), color=BG_COLOR)
    draw = ImageDraw.Draw(img)

    # ── Accent bar ────────────────────────────────────────────────────────────
    draw.rectangle([(0, 0), (BADGE_W, 8)], fill=ACCENT_COLOR)
    draw.rectangle([(0, BADGE_H - 8), (BADGE_W, BADGE_H)], fill=ACCENT_COLOR)

    # ── Photo (if available) ──────────────────────────────────────────────────
    photo_x = 30
    if photo_url and os.path.exists(photo_url):
        try:
            photo = Image.open(photo_url).convert("RGB")
            photo = photo.resize((120, 120))
            img.paste(photo, (photo_x, 80))
        except Exception:
            pass

    # ── QR code thumbnail ─────────────────────────────────────────────────────
    qr_x = BADGE_W - 160
    if qr_code_path and os.path.exists(qr_code_path):
        try:
            qr_img = Image.open(qr_code_path).convert("RGB")
            qr_img = qr_img.resize((120, 120))
            img.paste(qr_img, (qr_x, 80))
        except Exception:
            pass

    # ── Text ──────────────────────────────────────────────────────────────────
    text_x = 170
    draw.text((text_x, 80), name, font=_load_font(32), fill=TEXT_COLOR)
    draw.text((text_x, 125), company or "Guest", font=_load_font(20), fill=SECONDARY_COLOR)
    draw.text((text_x, 160), f"ID: {qr_id}", font=_load_font(18), fill=ACCENT_COLOR)

    # ── Footer ────────────────────────────────────────────────────────────────
    draw.text((20, BADGE_H - 40), "Smart Digital Desk", font=_load_font(14), fill=SECONDARY_COLOR)
    draw.text((BADGE_W - 130, BADGE_H - 40), "Event Badge", font=_load_font(14), fill=SECONDARY_COLOR)

    # ── Save ──────────────────────────────────────────────────────────────────
    safe_name = "".join(c for c in name if c.isalnum() or c in (" ", "_")).rstrip()
    filepath = os.path.join(output_dir, f"badge_{qr_id}_{safe_name}.png")
    img.save(filepath)
    return filepath.replace("\\", "/")
