from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_db
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    wallet_address: str = Field(min_length=1, max_length=255)


class AuthUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    wallet_address: str
    name: str | None = None
    email: str | None = None
    rating: float = 0
    total_rides: int = 0
    created_at: datetime


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUserResponse


@router.post("/login", response_model=LoginResponse, status_code=status.HTTP_200_OK)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> LoginResponse:
    handler = getattr(auth_service, "login_with_wallet", None)
    if handler is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is unavailable",
        )

    result = await handler(db=db, wallet_address=payload.wallet_address)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid wallet credentials",
        )
    return LoginResponse.model_validate(result)


@router.get("/me", response_model=AuthUserResponse, status_code=status.HTTP_200_OK)
async def me(current_user=Depends(get_current_user)) -> AuthUserResponse:
    return AuthUserResponse.model_validate(current_user)

