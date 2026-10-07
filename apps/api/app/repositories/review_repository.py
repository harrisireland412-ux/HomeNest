import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base
from app.models.review import Review


class ReviewRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    def add(self, entity: Base) -> None:
        self.db.add(entity)

    async def get_by_booking_id(self, booking_id: uuid.UUID) -> Review | None:
        result = await self.db.execute(select(Review).where(Review.booking_id == booking_id))
        return result.scalar_one_or_none()

    async def list_for_provider(self, provider_id: uuid.UUID) -> list[Review]:
        result = await self.db.execute(
            select(Review)
            .where(Review.provider_id == provider_id)
            .order_by(Review.created_at.desc())
        )
        return list(result.scalars().all())

    async def list_reviewed_booking_ids_for_customer(
        self, customer_id: uuid.UUID
    ) -> set[uuid.UUID]:
        result = await self.db.execute(
            select(Review.booking_id).where(Review.customer_id == customer_id)
        )
        return set(result.scalars().all())
