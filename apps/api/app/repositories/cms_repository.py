from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cms import FAQ, Offer, Testimonial


class CMSRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_testimonials(self) -> list[Testimonial]:
        result = await self.db.execute(select(Testimonial))
        return list(result.scalars().all())

    async def list_faqs(self) -> list[FAQ]:
        result = await self.db.execute(select(FAQ).order_by(FAQ.sort_order))
        return list(result.scalars().all())

    async def list_offers(self) -> list[Offer]:
        result = await self.db.execute(select(Offer).order_by(Offer.sort_order))
        return list(result.scalars().all())
