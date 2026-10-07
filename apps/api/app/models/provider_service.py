import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Numeric, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class ProviderServiceStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class ProviderService(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "provider_services"
    __table_args__ = (UniqueConstraint("provider_id", "service_id"),)

    provider_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("providers.id"))
    service_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("services.id"))
    custom_price: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    status: Mapped[ProviderServiceStatus] = mapped_column(
        Enum(ProviderServiceStatus), default=ProviderServiceStatus.pending
    )
