"""
Uses Mailtrap (free, no Gmail needed).
Sign up free at https://mailtrap.io → get SMTP credentials → paste below.
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ── Mailtrap free SMTP credentials ───────────────────────────────────────────
# Sign up at https://mailtrap.io/register/signup (free)
# Go to Email Testing → Inboxes → SMTP Settings → copy credentials here
SMTP_HOST = "sandbox.smtp.mailtrap.io"
SMTP_PORT = 587
SMTP_USER = "ce28131fb97234"   # ← paste from Mailtrap
SMTP_PASS = "64de4c2bc556a7"   # ← paste from Mailtrap
FROM_EMAIL = "noreply@smartdesk.com"


def send_registration_email(to_email: str, name: str, unique_code: str, event_name: str):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Your Entry Code for {event_name}"
    msg["From"]    = FROM_EMAIL
    msg["To"]      = to_email

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;
                background:#f9f9f9;border-radius:12px;border:1px solid #e0e0e0;">
      <h2 style="color:#6c63ff;margin-bottom:4px;">Smart Desk</h2>
      <p style="color:#888;margin-top:0;">Event Entry Confirmation</p>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
      <p>Hi <strong>{name}</strong>,</p>
      <p>You are registered for <strong>{event_name}</strong>.</p>
      <p>Your unique entry code is:</p>
      <div style="background:#6c63ff;color:#fff;font-size:32px;font-weight:bold;
                  letter-spacing:8px;text-align:center;padding:20px;border-radius:8px;
                  margin:20px 0;">{unique_code}</div>
      <p style="color:#888;font-size:13px;">
        At the event gate, scan the QR code displayed and enter this code.
        Your badge will print automatically.
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
      <p style="color:#aaa;font-size:12px;text-align:center;">Smart Desk Attendance System</p>
    </div>
    """
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as s:
        s.starttls()
        s.login(SMTP_USER, SMTP_PASS)
        s.sendmail(FROM_EMAIL, to_email, msg.as_string())
    print(f"✅ Email sent to {to_email}")