from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Ride, User
from app.repositories import ride_repository


async def create_ride(
    db: AsyncSession,
    payload: dict,
    driver: User,
) -> Ride:
    if driver is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to create ride",
        )

    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ride data",
        )

    payload["driver_id"] = driver.id
    ride = await ride_repository.create_ride(db, payload)
    return ride


async def list_rides(
    db: AsyncSession,
    filters: dict | None = None,
) -> list[Ride]:
    rides = await ride_repository.get_all_rides(db, filters)
    return rides


async def get_ride_by_id(db: AsyncSession, ride_id: UUID) -> Ride | None:
    ride = await ride_repository.get_ride_by_id(db, ride_id)
    if ride is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ride not found",
        )
    return ride


async def complete_ride(
    db: AsyncSession,
    ride_id: UUID,
    driver: User,
) -> Ride:
    from app.services import blockchain_service

    ride = await ride_repository.get_ride_by_id(db, ride_id)
    if ride is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ride not found")

    if ride.driver_id != driver.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your ride")

    if ride.status == "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ride already completed")

    await blockchain_service.complete_ride_transaction(
        ride_id=ride_id,
        driver_wallet=driver.wallet_address or "",
    )

    updated = await ride_repository.update_ride_status(db, ride_id, "completed")
    return updated


async def cancel_ride(
    db: AsyncSession,
    ride_id: UUID,
    driver: User,
) -> Ride:
    from app.services import blockchain_service

    ride = await ride_repository.get_ride_by_id(db, ride_id)
    if ride is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ride not found")

    if ride.driver_id != driver.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your ride")

    if ride.status in ("completed", "cancelled"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot cancel ride")

    await blockchain_service.refund_transaction(
        ride_id=ride_id,
        driver_wallet=driver.wallet_address or "",
    )

    updated = await ride_repository.update_ride_status(db, ride_id, "cancelled")
    return updated
