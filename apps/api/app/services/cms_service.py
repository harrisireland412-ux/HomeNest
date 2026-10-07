from app.models.cms import FAQ, Offer, Testimonial
from app.repositories.cms_repository import CMSRepository


class CMSService:
    def __init__(self, cms_repo: CMSRepository) -> None:
        self.cms_repo = cms_repo

    async def list_testimonials(self) -> list[Testimonial]:
        return await self.cms_repo.list_testimonials()

    async def list_faqs(self) -> list[FAQ]:
        return await self.cms_repo.list_faqs()

    async def list_offers(self) -> list[Offer]:
        return await self.cms_repo.list_offers()
