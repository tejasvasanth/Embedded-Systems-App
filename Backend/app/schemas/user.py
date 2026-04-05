from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    wallet_address: str = Field(min_length=1, max_length=255)
    name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = None


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    rating: float = 0.0
    total_rides: int = 0
    created_at: datetime
