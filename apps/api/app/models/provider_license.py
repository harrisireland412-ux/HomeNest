import enum
import uuid
from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class LicenseStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    expired = "expired"


class ProviderLicense(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "provider_licenses"
    __table_args__ = (UniqueConstraint("provider_id", "category_id"),)

    provider_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("providers.id"))
    category_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("categories.id"))
    license_number: Mapped[str] = mapped_column(String(120))
    issuing_authority: Mapped[str] = mapped_column(String(160))
    expiry_date: Mapped[date] = mapped_column(Date)
    file_path: Mapped[str] = mapped_column(String(500))
    status: Mapped[LicenseStatus] = mapped_column(
        Enum(LicenseStatus), default=LicenseStatus.pending
    )
    rejection_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
