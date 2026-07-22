"""
WhatsApp notifications via Twilio's WhatsApp API (plain HTTP request — no
twilio SDK dependency needed, consistent with mailer.py using smtplib
directly rather than a wrapper library).

Setup:
  1. Sign up at https://www.twilio.com/try-twilio (free trial available).
  2. Activate the WhatsApp Sandbox: Console -> Messaging -> Try it out ->
     Send a WhatsApp message. On the free trial, each recipient must first
     send the sandbox's join code to the Twilio WhatsApp number once.
  3. Set these as environment variables on the Render backend service
     (Environment tab), not hardcoded here — unlike the Mailtrap sandbox
     creds in mailer.py, these control a real, billable Twilio account:
       TWILIO_ACCOUNT_SID   - from the Twilio Console dashboard
       TWILIO_AUTH_TOKEN    - from the Twilio Console dashboard
       TWILIO_WHATSAPP_FROM - e.g. "whatsapp:+14155238886"
  Until all three are set, sending is silently skipped (logged, not raised)
  so registration keeps working even before WhatsApp is configured.
"""
import os
import requests

TWILIO_ACCOUNT_SID   = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN    = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM")  # e.g. "whatsapp:+14155238886"

API_URL_TEMPLATE = "https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"


def send_registration_whatsapp(to_phone: str, name: str, unique_code: str, event_name: str):
    if not (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_WHATSAPP_FROM):
        print("WhatsApp skipped: TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_WHATSAPP_FROM not set")
        return
    if not to_phone:
        return

    to_whatsapp = to_phone if to_phone.startswith("whatsapp:") else f"whatsapp:{to_phone}"

    body = (
        f"Hi {name}! You're registered for {event_name}.\n\n"
        f"Your entry code: {unique_code}\n\n"
        f"Show this at the gate to check in and get your badge."
    )

    try:
        resp = requests.post(
            API_URL_TEMPLATE.format(sid=TWILIO_ACCOUNT_SID),
            auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
            data={"From": TWILIO_WHATSAPP_FROM, "To": to_whatsapp, "Body": body},
            timeout=10,
        )
        if resp.status_code >= 400:
            print(f"WhatsApp failed ({resp.status_code}): {resp.text}")
        else:
            print(f"✅ WhatsApp sent to {to_phone}")
    except Exception as e:
        print(f"WhatsApp failed: {e}")
