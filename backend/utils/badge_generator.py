"""
Badge Generator — 6x4 inch landscape sheet
Left half = Front | Right half = Back
Fold vertically in middle = badge card
Single page — prints completely on one sheet
"""
import fitz
import qrcode
import io
import os
import uuid
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import inch
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.lib import colors

OUTPUT_DIR    = "static/badges"
TEMPLATE_PATH = "static/badge_template.pdf"

os.makedirs(OUTPUT_DIR, exist_ok=True)

# 6x4 inch landscape — single page
PAGE_W = 6 * inch
PAGE_H = 4 * inch


def pdf_page_to_image(pdf_path: str, page_num: int = 0, dpi: int = 200) -> Image.Image:
    doc  = fitz.open(pdf_path)
    page = doc[page_num]
    mat  = fitz.Matrix(dpi / 72, dpi / 72)
    pix  = page.get_pixmap(matrix=mat)
    img  = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    doc.close()
    return img


def make_circle_photo(photo_path: str, size: int = 300) -> Image.Image:
    try:
        img  = Image.open(photo_path).convert("RGBA").resize((size, size))
        mask = Image.new("L", (size, size), 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, size, size), fill=255)
        result = Image.new("RGBA", (size, size), (255, 255, 255, 0))
        result.paste(img, (0, 0), mask)
        return result
    except Exception:
        img  = Image.new("RGBA", (size, size), (180, 180, 180, 255))
        draw = ImageDraw.Draw(img)
        draw.ellipse((0, 0, size, size), outline="#1a3a6b", width=4)
        return img


def make_qr_image(data: str, size: int = 200) -> Image.Image:
    """Real working QR code — scannable by Google Lens."""
    qr = qrcode.QRCode(
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=6,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)
    return qr.make_image(
        fill_color="#1a3a6b", back_color="white"
    ).convert("RGB").resize((size, size), Image.LANCZOS)


def get_font(bold: bool = False, size: int = 40):
    fonts = [
        "C:/Windows/Fonts/calibrib.ttf" if bold else "C:/Windows/Fonts/calibri.ttf",
        "C:/Windows/Fonts/arialbd.ttf"  if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/verdanab.ttf" if bold else "C:/Windows/Fonts/verdana.ttf",
    ]
    for path in fonts:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


def build_front_image(
    name: str,
    designation: str,
    email: str,
    company: str,
    qr_id: str,
    photo_path: str = None,
) -> Image.Image:
    badge = pdf_page_to_image(TEMPLATE_PATH, page_num=0, dpi=200).convert("RGBA")
    W, H  = badge.size
    draw  = ImageDraw.Draw(badge)

    # ── Photo — 2mm higher, good size ────────────────────────
    photo_size = int(W * 0.50)
    photo_x    = (W - photo_size) // 2
    photo_y    = int(H * 0.24)          # ← 2mm up (was 0.28)
    circle = (
        make_circle_photo(photo_path, photo_size)
        if photo_path and os.path.exists(photo_path)
        else make_circle_photo(None, photo_size)
    )
    badge.paste(circle, (photo_x, photo_y), circle)

    # ── Fonts ─────────────────────────────────────────────────
    name_font  = get_font(bold=True,  size=int(W * 0.075))
    desig_font = get_font(bold=True,  size=int(W * 0.055))
    small_font = get_font(bold=True,  size=int(W * 0.048))

    center_x = W // 2

    def draw_centered(text, y, font, color):
        if not text:
            return
        bbox = draw.textbbox((0, 0), text, font=font)
        tw   = bbox[2] - bbox[0]
        draw.text((center_x - tw // 2, y), text, fill=color, font=font)

    # ── Text — fixed spacing, no overlap ─────────────────────
    name_y = photo_y + photo_size + int(H * 0.025)
    draw_centered(name,        name_y,                name_font,  "#0a1a3b")
    draw_centered(designation, name_y + int(H*0.075), desig_font, "#111111")
    draw_centered(company,     name_y + int(H*0.135), small_font, "#1a1a1a")
    draw_centered(email,       name_y + int(H*0.190), small_font, "#1a1a1a")

    # ── QR Code — below email with clear gap ──────────────────
    qr_size = int(W * 0.22)             # ← smaller to avoid overlap
    # Full details in QR — Google Lens shows name, email, designation
    qr_data = (
        f"Name: {name}\n"
        f"Designation: {designation}\n"
        f"Company: {company}\n"
        f"Email: {email}\n"
        f"ID: {qr_id}"
    )
    qr_img  = make_qr_image(qr_data, qr_size).convert("RGBA")
    qr_x    = (W - qr_size) // 2
    qr_y    = name_y + int(H * 0.265)  # ← well below email
    badge.paste(qr_img, (qr_x, qr_y))

    # QR ID text
    id_font = get_font(bold=True, size=int(W * 0.036))
    id_y    = qr_y + qr_size + int(H * 0.008)
    draw_centered(qr_id, id_y, id_font, "#333333")

    return badge.convert("RGB")


def build_back_image() -> Image.Image:
    return pdf_page_to_image(TEMPLATE_PATH, page_num=1, dpi=200)


def generate_badge(
    name: str,
    company: str,
    designation: str,
    qr_id: str,
    qr_code_path: str = None,
    photo_path: str   = None,
    event_name: str   = "",
    email: str        = "",
) -> str:
    output_path = f"{OUTPUT_DIR}/badge_{qr_id}_{uuid.uuid4().hex[:6]}.pdf"

    if not os.path.exists(TEMPLATE_PATH):
        return generate_fallback_badge(name, designation, email, qr_id, output_path)

    try:
        front_img = build_front_image(
            name        = name,
            designation = designation or "",
            email       = email or "",
            company     = company or "",
            qr_id       = qr_id,
            photo_path  = photo_path,
        )
        back_img = build_back_image()

        # Each half: 3"x4" portrait at 200dpi = 600x800px
        badge_w_px = int(3 * 200)    # 600px
        badge_h_px = int(4 * 200)    # 800px

        front_resized = front_img.resize((badge_w_px, badge_h_px), Image.LANCZOS)
        back_resized  = back_img.resize( (badge_w_px, badge_h_px), Image.LANCZOS)

        # Full sheet: 6"x4" = 1200x800px
        sheet_w_px = badge_w_px * 2
        sheet_h_px = badge_h_px

        # LEFT = FRONT, RIGHT = BACK
        sheet = Image.new("RGB", (sheet_w_px, sheet_h_px), "white")
        sheet.paste(front_resized, (0,          0))
        sheet.paste(back_resized,  (badge_w_px, 0))

        # Vertical fold line
        draw = ImageDraw.Draw(sheet)
        for y in range(0, sheet_h_px, 20):
            draw.line(
                [(badge_w_px, y), (badge_w_px, y + 10)],
                fill="#aaaaaa", width=2
            )

        # Save as SINGLE PAGE PDF — 6x4 landscape
        sheet_buf = io.BytesIO()
        sheet.save(sheet_buf, format="PNG", dpi=(200, 200))
        sheet_buf.seek(0)

        c = canvas.Canvas(output_path, pagesize=(PAGE_W, PAGE_H))
        c.drawImage(ImageReader(sheet_buf), 0, 0, PAGE_W, PAGE_H)
        c.save()

        return output_path

    except Exception as e:
        print(f"⚠ Badge failed: {e}")
        return generate_fallback_badge(name, designation, email, qr_id, output_path)


def generate_fallback_badge(
    name: str, designation: str, email: str,
    qr_id: str, output_path: str
) -> str:
    c = canvas.Canvas(output_path, pagesize=(PAGE_W, PAGE_H))

    # Left = Front
    c.setFillColor(colors.white)
    c.rect(0, 0, PAGE_W/2, PAGE_H, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#0a1a3b"))
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(PAGE_W/4, PAGE_H*0.7,  "Siri Technocrats")
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(PAGE_W/4, PAGE_H*0.55, name)
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(colors.HexColor("#111111"))
    c.drawCentredString(PAGE_W/4, PAGE_H*0.45, designation or "")
    c.drawCentredString(PAGE_W/4, PAGE_H*0.35, email or "")
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#555555"))
    c.drawCentredString(PAGE_W/4, PAGE_H*0.1,  qr_id)

    # Fold line
    c.setStrokeColor(colors.HexColor("#aaaaaa"))
    c.setDash(4, 4)
    c.line(PAGE_W/2, 0, PAGE_W/2, PAGE_H)

    # Right = Back
    c.setFillColor(colors.HexColor("#1a3a6b"))
    c.rect(PAGE_W/2, 0, PAGE_W/2, PAGE_H, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(PAGE_W*3/4, PAGE_H*0.6,  "Siri Technocrats")
    c.setFont("Helvetica", 9)
    c.drawCentredString(PAGE_W*3/4, PAGE_H*0.45, "admin@siritechnocrats.com")

    c.save()
    return output_path