from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class RatingBase(BaseModel):
    ride_id: UUID
    rated_id: UUID
    rating: int = Field(ge=1, le=5)
    review: str | None = Field(default=None, max_length=2000)


class RatingCreate(RatingBase):
    pass


class RatingResponse(RatingBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    rater_id: UUID
    created_at: datetime
