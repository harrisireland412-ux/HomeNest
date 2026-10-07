from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories.provider_repository import ProviderRepository
from app.schemas.provider import ProviderRead
from app.services.provider_service import ProviderService

router = APIRouter(tags=["providers"])


def get_provider_service(db: AsyncSession = Depends(get_db)) -> ProviderService:
    return ProviderService(ProviderRepository(db))


@router.get("/providers", response_model=list[ProviderRead])
async def list_providers(
    featured: bool | None = None,
    service: ProviderService = Depends(get_provider_service),
) -> list[ProviderRead]:
    return await service.list_providers(featured)
