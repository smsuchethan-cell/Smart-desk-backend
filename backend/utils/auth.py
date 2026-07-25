"""Shared-password admin auth — one password for the whole staff dashboard,
not per-user accounts. Deliberately dependency-free: a signed, expiring
token built with the standard library's hmac/hashlib instead of a JWT
library, since there's no per-user claim data to carry beyond an expiry.
"""
import base64
import hashlib
import hmac
import json
import os
import time
from fastapi import Header, HTTPException

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
SECRET_KEY = os.getenv("SECRET_KEY", "")
TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60  # 7 days


def _sign(payload_b64: str) -> str:
    return hmac.new(SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()


def create_token() -> str:
    payload = json.dumps({"exp": int(time.time()) + TOKEN_TTL_SECONDS}).encode()
    payload_b64 = base64.urlsafe_b64encode(payload).decode().rstrip("=")
    return f"{payload_b64}.{_sign(payload_b64)}"


def _verify_token(token: str) -> bool:
    try:
        payload_b64, sig = token.split(".")
        if not hmac.compare_digest(sig, _sign(payload_b64)):
            return False
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded))
        return payload.get("exp", 0) > time.time()
    except Exception:
        return False


def require_auth(authorization: str = Header(None)):
    """FastAPI dependency — attach to any route that should require staff login."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    if not _verify_token(authorization.removeprefix("Bearer ")):
        raise HTTPException(401, "Session expired — please log in again")
