import qrcode
import os
from io import BytesIO
from PIL import Image


def generate_qr_bytes(data: str) -> bytes:
    """Generate a QR code PNG entirely in memory — no disk write. Used for
    QR codes served on demand, so they survive Render's ephemeral disk
    (files written by generate_qr() below get wiped on every restart)."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def generate_qr(data: str, filename: str, output_dir: str = "static/qr") -> str:
    """
    Generate a QR code PNG image and save it to output_dir.
    Returns the relative path to the saved file.
    """
    os.makedirs(output_dir, exist_ok=True)

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white").convert("RGB")

    filepath = os.path.join(output_dir, f"{filename}.png")
    img.save(filepath)

    return filepath.replace("\\", "/")  # normalise for URLs
