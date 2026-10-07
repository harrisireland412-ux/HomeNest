from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories.cms_repository import CMSRepository
from app.schemas.cms import FAQRead, OfferRead, TestimonialRead
from app.services.cms_service import CMSService

router = APIRouter(tags=["cms"])


def get_cms_service(db: AsyncSession = Depends(get_db)) -> CMSService:
    return CMSService(CMSRepository(db))


@router.get("/testimonials", response_model=list[TestimonialRead])
async def list_testimonials(
    service: CMSService = Depends(get_cms_service),
) -> list[TestimonialRead]:
    return await service.list_testimonials()


@router.get("/faqs", response_model=list[FAQRead])
async def list_faqs(service: CMSService = Depends(get_cms_service)) -> list[FAQRead]:
    return await service.list_faqs()


@router.get("/offers", response_model=list[OfferRead])
async def list_offers(service: CMSService = Depends(get_cms_service)) -> list[OfferRead]:
    return await service.list_offers()
