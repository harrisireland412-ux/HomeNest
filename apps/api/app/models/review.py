import uuid

from sqlalchemy import ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Review(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "reviews"

    booking_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("bookings.id"), unique=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"))
    provider_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("providers.id"))
    service_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("services.id"))
    rating: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str | None] = mapped_column(String(1000), nullable=True)
