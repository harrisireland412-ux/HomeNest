from app.models.provider import Provider
from app.repositories.provider_repository import ProviderRepository


class ProviderService:
    def __init__(self, provider_repo: ProviderRepository) -> None:
        self.provider_repo = provider_repo

    async def list_providers(self, featured: bool | None) -> list[Provider]:
        return await self.provider_repo.list_filtered(featured)
