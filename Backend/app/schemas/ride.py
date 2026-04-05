from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class RideBase(BaseModel):
    source: str = Field(min_length=1, max_length=255)
    destination: str = Field(min_length=1, max_length=255)
    ride_time: datetime
    price: Decimal = Field(gt=0)
    seats_available: int = Field(ge=1)


class RideCreate(RideBase):
    pass


class RideResponse(RideBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    driver_id: UUID
    status: str = "available"
    created_at: datetime
