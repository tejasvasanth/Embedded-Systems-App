from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BookingBase(BaseModel):
    ride_id: UUID
    seats_booked: int = Field(default=1, ge=1)


class BookingCreate(BookingBase):
    pass


class BookingResponse(BookingBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    passenger_id: UUID
    status: str = "booked"
    tx_hash: str | None = None
    created_at: datetime
