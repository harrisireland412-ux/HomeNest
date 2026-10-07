import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base
from app.models.booking import Booking


class BookingRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    def add(self, entity: Base) -> None:
        self.db.add(entity)

    async def list_for_customer(self, customer_id: uuid.UUID) -> list[Booking]:
        result = await self.db.execute(
            select(Booking)
            .where(Booking.customer_id == customer_id)
            .order_by(Booking.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id(self, booking_id: uuid.UUID) -> Booking | None:
        result = await self.db.execute(select(Booking).where(Booking.id == booking_id))
        return result.scalar_one_or_none()

    async def list_for_provider(self, provider_id: uuid.UUID) -> list[Booking]:
        result = await self.db.execute(
            select(Booking)
            .where(Booking.provider_id == provider_id)
            .order_by(Booking.created_at.desc())
        )
        return list(result.scalars().all())
