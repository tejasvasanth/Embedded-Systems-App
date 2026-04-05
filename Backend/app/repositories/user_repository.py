from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User


async def get_user_by_id(db: AsyncSession, user_id: UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalars().first()


async def get_user_by_wallet(db: AsyncSession, wallet_address: str) -> User | None:
    result = await db.execute(
        select(User).where(User.wallet_address == wallet_address)
    )
    return result.scalars().first()


async def create_user(db: AsyncSession, user_data: dict) -> User:
    user = User(**user_data)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update_user(db: AsyncSession, user_id: UUID, update_data: dict) -> User | None:
    user = await get_user_by_id(db, user_id)
    if user is None:
        return None

    for key, value in update_data.items():
        setattr(user, key, value)

    await db.commit()
    await db.refresh(user)
    return user
