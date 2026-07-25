from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from utils.auth import (
    ADMIN_PASSWORD, SECRET_KEY, create_token,
    check_login_rate_limit, record_failed_login, clear_failed_logins,
)

router = APIRouter()


class LoginPayload(BaseModel):
    password: str


@router.post("/auth/login")
def login(payload: LoginPayload, request: Request):
    if not ADMIN_PASSWORD or not SECRET_KEY:
        raise HTTPException(500, "Admin login isn't configured yet — set ADMIN_PASSWORD and SECRET_KEY on the server.")

    ip = request.client.host if request.client else "unknown"
    check_login_rate_limit(ip)

    if payload.password != ADMIN_PASSWORD:
        record_failed_login(ip)
        raise HTTPException(401, "Wrong password")

    clear_failed_logins(ip)
    return {"token": create_token()}
