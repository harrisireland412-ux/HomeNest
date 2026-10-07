from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories.catalog_repository import CategoryRepository, ServiceRepository
from app.repositories.provider_repository import ProviderRepository
from app.schemas.catalog import CategoryRead, ServiceRead
from app.schemas.provider import ProviderRead
from app.services.catalog_service import CatalogService

router = APIRouter(tags=["catalog"])


def get_catalog_service(db: AsyncSession = Depends(get_db)) -> CatalogService:
    return CatalogService(CategoryRepository(db), ServiceRepository(db))


@router.get("/categories", response_model=list[CategoryRead])
async def list_categories(
    service: CatalogService = Depends(get_catalog_service),
) -> list[CategoryRead]:
    return await service.list_categories()


@router.get("/categories/{slug}", response_model=CategoryRead)
async def get_category(
    slug: str, service: CatalogService = Depends(get_catalog_service)
) -> CategoryRead:
    category = await service.get_category_by_slug(slug)
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.get("/categories/{slug}/services", response_model=list[ServiceRead])
async def list_services_for_category(
    slug: str, service: CatalogService = Depends(get_catalog_service)
) -> list[ServiceRead]:
    services = await service.list_services_for_category_slug(slug)
    if services is None:
        raise HTTPException(status_code=404, detail="Category not found")
    return services


@router.get("/services", response_model=list[ServiceRead])
async def list_services(
    featured: bool | None = None,
    popular: bool | None = None,
    service: CatalogService = Depends(get_catalog_service),
) -> list[ServiceRead]:
    return await service.list_services(featured, popular)


@router.get("/services/{slug}", response_model=ServiceRead)
async def get_service(
    slug: str, service: CatalogService = Depends(get_catalog_service)
) -> ServiceRead:
    result = await service.get_service_by_slug(slug)
    if result is None:
        raise HTTPException(status_code=404, detail="Service not found")
    return result


@router.get("/services/{slug}/providers", response_model=list[ProviderRead])
async def list_providers_for_service(
    slug: str,
    db: AsyncSession = Depends(get_db),
    service: CatalogService = Depends(get_catalog_service),
) -> list[ProviderRead]:
    catalog_service = await service.get_service_by_slug(slug)
    if catalog_service is None:
        raise HTTPException(status_code=404, detail="Service not found")
    providers = await ProviderRepository(db).list_approved_for_service(catalog_service.id)
    return providers
