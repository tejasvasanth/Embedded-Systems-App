from datetime import datetime
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_db
from app.services import ride_service

router = APIRouter(prefix="/rides", tags=["rides"])


class RideCreateRequest(BaseModel):
    source: str = Field(min_length=1, max_length=255)
    destination: str = Field(min_length=1, max_length=255)
    ride_time: datetime
    price: Decimal
    seats_available: int = Field(ge=1)


class RideResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    driver_id: UUID
    source: str
    destination: str
    ride_time: datetime
    price: Decimal
    seats_available: int
    status: str
    created_at: datetime


@router.post("", response_model=RideResponse, status_code=status.HTTP_201_CREATED)
async def create_ride(
    payload: RideCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> RideResponse:
    handler = getattr(ride_service, "create_ride", None)
    if handler is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Ride service is unavailable",
        )

    created = await handler(db=db, driver=current_user, payload=payload.model_dump())
    if created is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to create ride",
        )
    return RideResponse.model_validate(created)


@router.get("", response_model=list[RideResponse], status_code=status.HTTP_200_OK)
async def list_rides(
    source: str | None = Query(default=None),
    destination: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    min_seats: int | None = Query(default=None, ge=1),
    db: AsyncSession = Depends(get_db),
) -> list[RideResponse]:
    handler = getattr(ride_service, "list_rides", None)
    if handler is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Ride service is unavailable",
        )

    rides = await handler(
        db=db,
        filters={
            "source": source,
            "destination": destination,
            "status": status_filter,
            "min_seats": min_seats,
        },
    )
    return [RideResponse.model_validate(ride) for ride in rides]


@router.get("/{id}", response_model=RideResponse, status_code=status.HTTP_200_OK)
async def get_ride(id: UUID, db: AsyncSession = Depends(get_db)) -> RideResponse:
    ride = await ride_service.get_ride_by_id(db=db, ride_id=id)
    if ride is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ride not found")
    return RideResponse.model_validate(ride)


@router.patch("/{id}/complete", response_model=RideResponse, status_code=status.HTTP_200_OK)
async def complete_ride(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> RideResponse:
    ride = await ride_service.complete_ride(db=db, ride_id=id, driver=current_user)
    return RideResponse.model_validate(ride)


@router.patch("/{id}/cancel", response_model=RideResponse, status_code=status.HTTP_200_OK)
async def cancel_ride(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> RideResponse:
    ride = await ride_service.cancel_ride(db=db, ride_id=id, driver=current_user)
    return RideResponse.model_validate(ride)

