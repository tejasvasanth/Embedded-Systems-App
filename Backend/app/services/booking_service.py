from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Booking, User
from app.repositories import booking_repository, ride_repository
from app.services import blockchain_service


async def book_ride(
    db: AsyncSession,
    payload: dict,
    passenger: User,
) -> Booking:
    if passenger is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to book ride",
        )

    ride_id = payload.get("ride_id")
    seats_requested = payload.get("seats_booked", 1)

    ride = await ride_repository.get_ride_by_id(db, ride_id)
    if ride is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ride not found",
        )

    if ride.seats_available < seats_requested:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough seats available",
        )

    tx_hash = await blockchain_service.initiate_booking_transaction(
        ride_id=ride_id,
        user_wallet=passenger.wallet_address,
    )

    payload["passenger_id"] = passenger.id
    payload["tx_hash"] = tx_hash

    booking = await booking_repository.create_booking(db, payload)

    await ride_repository.update_ride_status(
        db,
        ride_id,
        "booked" if ride.seats_available - seats_requested == 0 else "available",
    )

    return booking


async def get_booking_by_id(db: AsyncSession, booking_id: UUID) -> Booking | None:
    booking = await booking_repository.get_booking_by_id(db, booking_id)
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )
    return booking
