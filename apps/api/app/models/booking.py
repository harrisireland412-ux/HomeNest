import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class BookingStatus(str, enum.Enum):
    awaiting_provider = "awaiting_provider"
    confirmed = "confirmed"
    rejected = "rejected"
    expired = "expired"
    completed = "completed"
    cancelled = "cancelled"


class Booking(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "bookings"

    customer_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"))
    service_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("services.id"))
    provider_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("providers.id"))
    address_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("addresses.id"))
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus), default=BookingStatus.awaiting_provider
    )
    total_price: Mapped[float] = mapped_column(Numeric(10, 2))
