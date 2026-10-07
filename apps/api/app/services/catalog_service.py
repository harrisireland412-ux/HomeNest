from app.models.catalog import Category, Service
from app.repositories.catalog_repository import CategoryRepository, ServiceRepository


class CatalogService:
    def __init__(self, category_repo: CategoryRepository, service_repo: ServiceRepository) -> None:
        self.category_repo = category_repo
        self.service_repo = service_repo

    async def list_categories(self) -> list[Category]:
        return await self.category_repo.list_all()

    async def get_category_by_slug(self, slug: str) -> Category | None:
        return await self.category_repo.get_by_slug(slug)

    async def list_services(self, featured: bool | None, popular: bool | None) -> list[Service]:
        return await self.service_repo.list_filtered(featured, popular)

    async def list_services_for_category_slug(self, slug: str) -> list[Service] | None:
        category = await self.category_repo.get_by_slug(slug)
        if category is None:
            return None
        return await self.service_repo.list_filtered(None, None, category_id=category.id)

    async def get_service_by_slug(self, slug: str) -> Service | None:
        return await self.service_repo.get_by_slug(slug)
