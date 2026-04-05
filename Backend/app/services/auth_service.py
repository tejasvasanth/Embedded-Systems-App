from datetime import timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, verify_token
from app.models import User
from app.repositories import user_repository


async def login_with_wallet(db: AsyncSession, wallet_address: str) -> dict:
    user = await user_repository.get_user_by_wallet(db, wallet_address)

    if user is None:
        user = await user_repository.create_user(
            db,
            {"wallet_address": wallet_address},
        )

    access_token = create_access_token(
        data={"sub": str(user.id), "wallet": user.wallet_address},
        expires_delta=timedelta(hours=24),
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }


async def get_current_user(db: AsyncSession, token: str) -> User | None:
    payload = verify_token(token)
    if payload is None:
        return None

    user_id = payload.get("sub")
    if user_id is None:
        return None

    try:
        user = await user_repository.get_user_by_id(db, UUID(user_id))
        return user
    except (ValueError, TypeError):
        return None
