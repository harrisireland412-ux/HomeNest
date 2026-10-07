import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.provider import Provider
from app.models.provider_service import ProviderService, ProviderServiceStatus


class ProviderRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_filtered(self, featured: bool | None) -> list[Provider]:
        query = select(Provider)
        if featured is not None:
            query = query.where(Provider.is_featured == featured)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_id(self, provider_id: uuid.UUID) -> Provider | None:
        result = await self.db.execute(select(Provider).where(Provider.id == provider_id))
        return result.scalar_one_or_none()

    async def list_approved_for_service(self, service_id: uuid.UUID) -> list[Provider]:
        query = (
            select(Provider)
            .join(ProviderService, ProviderService.provider_id == Provider.id)
            .where(
                ProviderService.service_id == service_id,
                ProviderService.status == ProviderServiceStatus.approved,
            )
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())
