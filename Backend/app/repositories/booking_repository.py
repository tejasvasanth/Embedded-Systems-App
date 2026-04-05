from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Booking


async def create_booking(db: AsyncSession, booking_data: dict) -> Booking:
    booking = Booking(**booking_data)
    db.add(booking)
    await db.commit()
    await db.refresh(booking)
    return booking


async def get_booking_by_id(db: AsyncSession, booking_id: UUID) -> Booking | None:
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    return result.scalars().first()


async def get_bookings_by_user(db: AsyncSession, user_id: UUID) -> list[Booking]:
    result = await db.execute(
        select(Booking).where(Booking.passenger_id == user_id)
    )
    return result.scalars().all()


async def update_booking_status(
    db: AsyncSession,
    booking_id: UUID,
    status: str,
) -> Booking | None:
    booking = await get_booking_by_id(db, booking_id)
    if booking is None:
        return None

    booking.status = status
    await db.commit()
    await db.refresh(booking)
    return booking
