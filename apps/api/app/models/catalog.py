import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Category(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "categories"

    name: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(140), unique=True, index=True)
    icon_name: Mapped[str] = mapped_column(String(60))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    requires_license: Mapped[bool] = mapped_column(Boolean, default=False)

    services: Mapped[list["Service"]] = relationship(back_populates="category")


class Service(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "services"

    category_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("categories.id"))
    name: Mapped[str] = mapped_column(String(160))
    slug: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    description: Mapped[str] = mapped_column(String(500))
    base_price: Mapped[float] = mapped_column(Numeric(10, 2))
    image_url: Mapped[str] = mapped_column(String(500))
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    is_popular: Mapped[bool] = mapped_column(Boolean, default=False)

    category: Mapped["Category"] = relationship(back_populates="services")
