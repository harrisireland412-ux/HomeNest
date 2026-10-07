import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class IdentityStatus(str, enum.Enum):
    pending = "pending"
    action_required = "action_required"
    approved = "approved"
    rejected = "rejected"


class Provider(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "providers"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id"), unique=True, nullable=True
    )
    address_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("addresses.id"), nullable=True
    )

    display_name: Mapped[str] = mapped_column(String(160))
    avatar_url: Mapped[str] = mapped_column(String(500), default="")
    rating: Mapped[float] = mapped_column(Numeric(2, 1), default=0)
    review_count: Mapped[int] = mapped_column(Integer, default=0)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)

    phone_primary: Mapped[str | None] = mapped_column(String(30), nullable=True)
    phone_alternate: Mapped[str | None] = mapped_column(String(30), nullable=True)
    bio: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    years_experience: Mapped[int | None] = mapped_column(Integer, nullable=True)

    identity_status: Mapped[IdentityStatus] = mapped_column(
        Enum(IdentityStatus), default=IdentityStatus.pending
    )
    identity_rejection_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
