from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Rating


async def create_rating(db: AsyncSession, rating_data: dict) -> Rating:
    rating = Rating(**rating_data)
    db.add(rating)
    await db.commit()
    await db.refresh(rating)
    return rating


async def get_ratings_for_user(db: AsyncSession, user_id: UUID) -> list[Rating]:
    result = await db.execute(
        select(Rating).where(Rating.rated_id == user_id)
    )
    return result.scalars().all()


async def calculate_user_rating(db: AsyncSession, user_id: UUID) -> float:
    result = await db.execute(
        select(func.avg(Rating.rating)).where(Rating.rated_id == user_id)
    )
    avg_rating = result.scalar()
    return float(avg_rating) if avg_rating is not None else 0.0
