import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
	__tablename__ = "users"

	id: Mapped[uuid.UUID] = mapped_column(
		UUID(as_uuid=True),
		primary_key=True,
		default=uuid.uuid4,
	)
	wallet_address: Mapped[str] = mapped_column(String, unique=True, nullable=False)
	name: Mapped[str | None] = mapped_column(String, nullable=True)
	email: Mapped[str | None] = mapped_column(String, nullable=True)
	rating: Mapped[float] = mapped_column(Float, nullable=False, default=0)
	total_rides: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
	created_at: Mapped[datetime] = mapped_column(
		DateTime,
		nullable=False,
		server_default=func.now(),
	)

	rides: Mapped[list["Ride"]] = relationship(
		"Ride",
		back_populates="driver",
		cascade="all, delete-orphan",
		foreign_keys="Ride.driver_id",
	)
	bookings: Mapped[list["Booking"]] = relationship(
		"Booking",
		back_populates="passenger",
		cascade="all, delete-orphan",
		foreign_keys="Booking.passenger_id",
	)
	ratings_given: Mapped[list["Rating"]] = relationship(
		"Rating",
		back_populates="rater",
		foreign_keys="Rating.rater_id",
	)
	ratings_received: Mapped[list["Rating"]] = relationship(
		"Rating",
		back_populates="rated_user",
		foreign_keys="Rating.rated_id",
	)
