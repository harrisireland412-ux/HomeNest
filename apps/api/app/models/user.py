import enum

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class UserRole(str, enum.Enum):
    customer = "customer"
    provider = "provider"
    admin = "admin"


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(160))
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.customer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
