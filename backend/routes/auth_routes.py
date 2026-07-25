from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from utils.auth import ADMIN_PASSWORD, SECRET_KEY, create_token

router = APIRouter()


class LoginPayload(BaseModel):
    password: str


@router.post("/auth/login")
def login(payload: LoginPayload):
    if not ADMIN_PASSWORD or not SECRET_KEY:
        raise HTTPException(500, "Admin login isn't configured yet — set ADMIN_PASSWORD and SECRET_KEY on the server.")
    if payload.password != ADMIN_PASSWORD:
        raise HTTPException(401, "Wrong password")
    return {"token": create_token()}
