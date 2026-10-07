import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class PaymentStatus(str, enum.Enum):
    succeeded = "succeeded"
    failed = "failed"


class Payment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "payments"

    booking_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("bookings.id"))
    amount: Mapped[float] = mapped_column(Numeric(10, 2))
    status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus))
    method: Mapped[str] = mapped_column(String(30), default="mock")
