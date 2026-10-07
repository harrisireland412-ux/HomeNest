import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog import Category, Service


class CategoryRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_all(self) -> list[Category]:
        result = await self.db.execute(select(Category).order_by(Category.sort_order))
        return list(result.scalars().all())

    async def get_by_slug(self, slug: str) -> Category | None:
        result = await self.db.execute(select(Category).where(Category.slug == slug))
        return result.scalar_one_or_none()

    async def get_by_id(self, category_id: uuid.UUID) -> Category | None:
        result = await self.db.execute(select(Category).where(Category.id == category_id))
        return result.scalar_one_or_none()


class ServiceRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_filtered(
        self,
        featured: bool | None,
        popular: bool | None,
        category_id: uuid.UUID | None = None,
    ) -> list[Service]:
        query = select(Service)
        if featured is not None:
            query = query.where(Service.is_featured == featured)
        if popular is not None:
            query = query.where(Service.is_popular == popular)
        if category_id is not None:
            query = query.where(Service.category_id == category_id)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_slug(self, slug: str) -> Service | None:
        result = await self.db.execute(select(Service).where(Service.slug == slug))
        return result.scalar_one_or_none()

    async def get_by_id(self, service_id: uuid.UUID) -> Service | None:
        result = await self.db.execute(select(Service).where(Service.id == service_id))
        return result.scalar_one_or_none()
