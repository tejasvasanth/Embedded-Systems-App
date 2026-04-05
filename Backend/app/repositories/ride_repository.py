from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Ride


async def create_ride(db: AsyncSession, ride_data: dict) -> Ride:
    ride = Ride(**ride_data)
    db.add(ride)
    await db.commit()
    await db.refresh(ride)
    return ride


async def get_ride_by_id(db: AsyncSession, ride_id: UUID) -> Ride | None:
    result = await db.execute(select(Ride).where(Ride.id == ride_id))
    return result.scalars().first()


async def get_all_rides(db: AsyncSession, filters: dict | None = None) -> list[Ride]:
    query = select(Ride)

    if filters:
        conditions = []
        if filters.get("source"):
            conditions.append(Ride.source == filters["source"])
        if filters.get("destination"):
            conditions.append(Ride.destination == filters["destination"])
        if filters.get("status"):
            conditions.append(Ride.status == filters["status"])
        if filters.get("min_seats"):
            conditions.append(Ride.seats_available >= filters["min_seats"])

        if conditions:
            query = query.where(and_(*conditions))

    result = await db.execute(query)
    return result.scalars().all()


async def update_ride_status(
    db: AsyncSession,
    ride_id: UUID,
    status: str,
) -> Ride | None:
    ride = await get_ride_by_id(db, ride_id)
    if ride is None:
        return None

    ride.status = status
    await db.commit()
    await db.refresh(ride)
    return ride
