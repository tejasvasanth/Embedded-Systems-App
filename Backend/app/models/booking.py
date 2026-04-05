import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Booking(Base):
	__tablename__ = "bookings"

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
	passenger_id: Mapped[uuid.UUID] = mapped_column(
		UUID(as_uuid=True),
		ForeignKey("users.id", ondelete="CASCADE"),
		nullable=False,
	)
	seats_booked: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
	status: Mapped[str] = mapped_column(String, nullable=False, default="booked")
	tx_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
	created_at: Mapped[datetime] = mapped_column(
		DateTime,
		nullable=False,
		server_default=func.now(),
	)

	ride: Mapped["Ride"] = relationship("Ride", back_populates="bookings")
	passenger: Mapped["User"] = relationship(
		"User",
		back_populates="bookings",
		foreign_keys=[passenger_id],
	)
