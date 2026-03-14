import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException
from jose import JWTError
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.services.auth import (
    create_access_token,
    create_verification_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.services.email import send_verification_email

router = APIRouter(prefix="/auth", tags=["auth"])


# --- Schemas ---
class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class MessageResponse(BaseModel):
    message: str


# --- Endpoints ---
@router.post("/register", response_model=MessageResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user and send verification email."""
    # Check if email exists
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    # Create user
    user = User(
        email=body.email,
        name=body.name,
        hashed_password=hash_password(body.password),
        is_verified=False,
    )
    db.add(user)
    await db.flush()

    # Generate verification token and store it
    token = create_verification_token(str(user.id))
    user.verification_token = token

    await db.commit()

    # Send verification email
    await send_verification_email(body.email, body.name, token)

    return MessageResponse(message="Registration successful. Check your email to verify your account.")


@router.get("/verify", response_model=MessageResponse)
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    """Verify email using the token from the verification link."""
    try:
        payload = decode_token(token)
        if payload.get("purpose") != "verify":
            raise HTTPException(status_code=400, detail="Invalid verification token")
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_verified:
        return MessageResponse(message="Email already verified")

    user.is_verified = True
    user.verification_token = None
    await db.commit()

    return MessageResponse(message="Email verified successfully. You can now log in.")


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login and get an access token."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified. Check your inbox.")

    token = create_access_token(str(user.id))

    return AuthResponse(
        access_token=token,
        user={"id": str(user.id), "email": user.email, "name": user.name},
    )


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get the current authenticated user."""
    return {"id": str(user.id), "email": user.email, "name": user.name}


# --- Google OAuth ---
class GoogleCallbackRequest(BaseModel):
    code: str


@router.get("/google/url")
async def google_auth_url():
    """Return the Google OAuth consent URL for the frontend to redirect to."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")
    params = (
        f"client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={settings.GOOGLE_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope=openid%20email%20profile"
        f"&access_type=offline"
        f"&prompt=consent"
    )
    return {"url": f"https://accounts.google.com/o/oauth2/v2/auth?{params}"}


@router.post("/google/callback", response_model=AuthResponse)
async def google_callback(body: GoogleCallbackRequest, db: AsyncSession = Depends(get_db)):
    """Exchange Google auth code for user info, create/find user, return JWT."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": body.code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )

    if token_res.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to exchange Google auth code")

    token_data = token_res.json()
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="No access token from Google")

    # Get user info from Google
    async with httpx.AsyncClient() as client:
        userinfo_res = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )

    if userinfo_res.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to get Google user info")

    google_user = userinfo_res.json()
    email = google_user.get("email")
    name = google_user.get("name", email)

    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email")

    # Find or create user
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        # Auto-create and auto-verify (Google already verified their email)
        user = User(
            email=email,
            name=name,
            hashed_password=hash_password(uuid.uuid4().hex),  # random password
            is_verified=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    elif not user.is_verified:
        # Auto-verify if they sign in with Google
        user.is_verified = True
        await db.commit()

    jwt_token = create_access_token(str(user.id))

    return AuthResponse(
        access_token=jwt_token,
        user={"id": str(user.id), "email": user.email, "name": user.name},
    )
