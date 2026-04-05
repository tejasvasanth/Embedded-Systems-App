from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_db
from app.services import rating_service

router = APIRouter(prefix="/ratings", tags=["ratings"])


class RatingCreateRequest(BaseModel):
    ride_id: UUID
    rated_id: UUID
    rating: int = Field(ge=1, le=5)
    review: str | None = Field(default=None, max_length=2000)


class RatingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    ride_id: UUID
    rater_id: UUID
    rated_id: UUID
    rating: int
    review: str | None = None
    created_at: datetime


@router.post("", response_model=RatingResponse, status_code=status.HTTP_201_CREATED)
async def create_rating(
    payload: RatingCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> RatingResponse:
    handler = getattr(rating_service, "create_rating", None)
    if handler is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Rating service is unavailable",
        )

    created = await handler(db=db, rater=current_user, payload=payload.model_dump())
    if created is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to create rating",
        )
    return RatingResponse.model_validate(created)


@router.get("/{user_id}", response_model=list[RatingResponse], status_code=status.HTTP_200_OK)
async def get_user_ratings(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> list[RatingResponse]:
    handler = getattr(rating_service, "get_ratings_for_user", None)
    if handler is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Rating service is unavailable",
        )

    ratings = await handler(db=db, user_id=user_id)
    return [RatingResponse.model_validate(item) for item in ratings]

