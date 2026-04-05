from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Rating, User
from app.repositories import rating_repository, user_repository


async def create_rating(
    db: AsyncSession,
    payload: dict,
    rater: User,
) -> Rating:
    if rater is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to create rating",
        )

    rated_user_id = payload.get("rated_id")
    if rated_user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="rated_id is required",
        )

    rated_user = await user_repository.get_user_by_id(db, rated_user_id)
    if rated_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User to rate not found",
        )

    if rater.id == rated_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot rate yourself",
        )

    payload["rater_id"] = rater.id

    rating = await rating_repository.create_rating(db, payload)

    avg_rating = await rating_repository.calculate_user_rating(db, rated_user_id)
    await user_repository.update_user(
        db,
        rated_user_id,
        {"rating": avg_rating},
    )

    return rating


async def get_ratings_for_user(db: AsyncSession, user_id: UUID) -> list[Rating]:
    ratings = await rating_repository.get_ratings_for_user(db, user_id)
    return ratings
