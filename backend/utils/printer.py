"""
Printer utility for Smart Digital Desk.
On Raspberry Pi (Linux) → uses CUPS via subprocess.
On Windows (dev) → opens the badge image using the default viewer (no actual print).
"""
import os
import platform
import subprocess


def print_badge(badge_path: str) -> dict:
    """
    Send badge image to the default printer.
    Returns {"success": bool, "message": str}
    """
    if not os.path.exists(badge_path):
        return {"success": False, "message": f"Badge file not found: {badge_path}"}

    system = platform.system()

    if system == "Linux":
        # Raspberry Pi / Linux: use lp (CUPS)
        try:
            result = subprocess.run(
                ["lp", badge_path],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                return {"success": True, "message": f"Sent to printer: {result.stdout.strip()}"}
            else:
                return {"success": False, "message": result.stderr.strip()}
        except FileNotFoundError:
            return {"success": False, "message": "lp command not found. Is CUPS installed?"}
        except subprocess.TimeoutExpired:
            return {"success": False, "message": "Printer timed out"}

    elif system == "Windows":
        # Windows dev mode: open image with default viewer instead of printing
        try:
            os.startfile(badge_path)
            return {"success": True, "message": f"Opened badge for preview (Windows dev mode): {badge_path}"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    elif system == "Darwin":
        # macOS
        try:
            subprocess.run(["lpr", badge_path], check=True)
            return {"success": True, "message": "Sent to printer via lpr"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    return {"success": False, "message": f"Unsupported platform: {system}"}
