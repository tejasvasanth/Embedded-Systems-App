import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Ride(Base):
	__tablename__ = "rides"

	id: Mapped[uuid.UUID] = mapped_column(
		UUID(as_uuid=True),
		primary_key=True,
		default=uuid.uuid4,
	)
	driver_id: Mapped[uuid.UUID] = mapped_column(
		UUID(as_uuid=True),
		ForeignKey("users.id", ondelete="CASCADE"),
		nullable=False,
	)
	source: Mapped[str] = mapped_column(String, nullable=False)
	destination: Mapped[str] = mapped_column(String, nullable=False)
	ride_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
	price: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
	seats_available: Mapped[int] = mapped_column(Integer, nullable=False)
	status: Mapped[str] = mapped_column(String, nullable=False, default="available")
	created_at: Mapped[datetime] = mapped_column(
		DateTime,
		nullable=False,
		server_default=func.now(),
	)

	driver: Mapped["User"] = relationship(
		"User",
		back_populates="rides",
		foreign_keys=[driver_id],
	)
	bookings: Mapped[list["Booking"]] = relationship(
		"Booking",
		back_populates="ride",
		cascade="all, delete-orphan",
	)
	ratings: Mapped[list["Rating"]] = relationship(
		"Rating",
		back_populates="ride",
		cascade="all, delete-orphan",
	)
