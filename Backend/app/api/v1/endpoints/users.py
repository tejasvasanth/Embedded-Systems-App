from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_db
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    wallet_address: str
    name: str | None = None
    email: str | None = None
    rating: float = 0
    total_rides: int = 0
    created_at: datetime


class UserUpdateRequest(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = None


@router.get("/{id}", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def get_user(
    id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    _current_user=Depends(get_current_user),
) -> UserResponse:
    handler = getattr(user_service, "get_user_by_id", None)
    if handler is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="User service is unavailable",
        )

    user = await handler(db=db, user_id=id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse.model_validate(user)


@router.put("/{id}", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def update_user(
    payload: UserUpdateRequest,
    id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    _current_user=Depends(get_current_user),
) -> UserResponse:
    handler = getattr(user_service, "update_user", None)
    if handler is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="User service is unavailable",
        )

    updated = await handler(db=db, user_id=id, payload=payload.model_dump(exclude_none=True))
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse.model_validate(updated)

