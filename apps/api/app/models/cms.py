from sqlalchemy import Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Testimonial(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "testimonials"

    author_name: Mapped[str] = mapped_column(String(160))
    avatar_url: Mapped[str] = mapped_column(String(500))
    quote: Mapped[str] = mapped_column(String(500))
    rating: Mapped[float] = mapped_column(Numeric(2, 1), default=5)


class FAQ(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "faqs"

    question: Mapped[str] = mapped_column(String(300))
    answer: Mapped[str] = mapped_column(String(1000))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Offer(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "offers"

    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(String(300))
    image_url: Mapped[str] = mapped_column(String(500))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
