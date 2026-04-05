from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_db
from app.services import booking_service

router = APIRouter(prefix="/bookings", tags=["bookings"])


class BookingCreateRequest(BaseModel):
    ride_id: UUID
    seats_booked: int = Field(default=1, ge=1)


class BookingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    ride_id: UUID
    passenger_id: UUID
    seats_booked: int
    status: str
    tx_hash: str | None = None
    created_at: datetime


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    payload: BookingCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> BookingResponse:
    handler = getattr(booking_service, "book_ride", None)
    if handler is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Booking service is unavailable",
        )

    booking = await handler(db=db, passenger=current_user, payload=payload.model_dump())
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to create booking",
        )
    return BookingResponse.model_validate(booking)


@router.get("/{id}", response_model=BookingResponse, status_code=status.HTTP_200_OK)
async def get_booking(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    _current_user=Depends(get_current_user),
) -> BookingResponse:
    handler = getattr(booking_service, "get_booking_by_id", None)
    if handler is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Booking service is unavailable",
        )

    booking = await handler(db=db, booking_id=id)
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    return BookingResponse.model_validate(booking)

