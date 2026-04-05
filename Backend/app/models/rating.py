import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Rating(Base):
	__tablename__ = "ratings"
	__table_args__ = (CheckConstraint("rating >= 1 AND rating <= 5", name="ck_ratings_value"),)

	id: Mapped[uuid.UUID] = mapped_column(
		UUID(as_uuid=True),
		primary_key=True,
		default=uuid.uuid4,
	)
	ride_id: Mapped[uuid.UUID] = mapped_column(
		UUID(as_uuid=True),
		ForeignKey("rides.id", ondelete="CASCADE"),
		nullable=False,
	)
	rater_id: Mapped[uuid.UUID] = mapped_column(
		UUID(as_uuid=True),
		ForeignKey("users.id"),
		nullable=False,
	)
	rated_id: Mapped[uuid.UUID] = mapped_column(
		UUID(as_uuid=True),
		ForeignKey("users.id"),
		nullable=False,
	)
	rating: Mapped[int] = mapped_column(Integer, nullable=False)
	review: Mapped[str | None] = mapped_column(Text, nullable=True)
	created_at: Mapped[datetime] = mapped_column(
		DateTime,
		nullable=False,
		server_default=func.now(),
	)

	ride: Mapped["Ride"] = relationship("Ride", back_populates="ratings")
	rater: Mapped["User"] = relationship(
		"User",
		back_populates="ratings_given",
		foreign_keys=[rater_id],
	)
	rated_user: Mapped["User"] = relationship(
		"User",
		back_populates="ratings_received",
		foreign_keys=[rated_id],
	)
