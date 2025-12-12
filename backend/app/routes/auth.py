from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from ..models.user import User, UserStatus
from ..core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from ..core.dependencies import get_current_user

router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest):
    user = await User.find_one(User.email == data.email.lower())

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Check if account is locked
    if (
        user.security.lock_until
        and user.security.lock_until > datetime.utcnow()
    ):
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account is temporarily locked. Try again later.",
        )

    # Verify password
    if not verify_password(data.password, user.password_hash):
        # Increment failed attempts
        user.security.failed_login_attempts += 1
        if user.security.failed_login_attempts >= 5:
            user.security.lock_until = datetime.utcnow() + timedelta(minutes=30)
        await user.save()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Check user status
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is {user.status.value}",
        )

    # Reset failed attempts on successful login
    user.security.failed_login_attempts = 0
    user.security.lock_until = None
    user.last_login = datetime.utcnow()
    user.login_count += 1
    await user.save()

    # Create tokens
    token_data = {"sub": str(user.id), "email": user.email}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.dict() if user.role else None,
            "effective_permissions": user.effective_permissions,
            "assigned_warehouses": [w.dict() for w in user.assigned_warehouses],
        },
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(data: RefreshRequest):
    payload = decode_token(data.refresh_token)

    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user = await User.get(payload.get("sub"))
    if not user or user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    token_data = {"sub": str(user.id), "email": user.email}
    access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user={
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.dict() if user.role else None,
            "effective_permissions": user.effective_permissions,
        },
    )


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "avatar": current_user.avatar,
        "role": current_user.role.dict() if current_user.role else None,
        "effective_permissions": current_user.effective_permissions,
        "assigned_warehouses": [w.dict() for w in current_user.assigned_warehouses],
        "preferences": current_user.preferences.dict(),
        "status": current_user.status.value,
    }


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Logged out successfully"}
