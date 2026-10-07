import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base
from app.models.address import Address
from app.models.kyc_document import KYCDocument, KYCDocumentType
from app.models.provider import Provider
from app.models.provider_license import ProviderLicense
from app.models.provider_service import ProviderService


class ProviderOnboardingRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    def add(self, entity: Base) -> None:
        self.db.add(entity)

    async def get_provider_by_user_id(self, user_id: uuid.UUID) -> Provider | None:
        result = await self.db.execute(select(Provider).where(Provider.user_id == user_id))
        return result.scalar_one_or_none()

    async def get_provider_by_id(self, provider_id: uuid.UUID) -> Provider | None:
        result = await self.db.execute(select(Provider).where(Provider.id == provider_id))
        return result.scalar_one_or_none()

    async def list_services(self, provider_id: uuid.UUID) -> list[ProviderService]:
        result = await self.db.execute(
            select(ProviderService).where(ProviderService.provider_id == provider_id)
        )
        return list(result.scalars().all())

    async def list_licenses(self, provider_id: uuid.UUID) -> list[ProviderLicense]:
        result = await self.db.execute(
            select(ProviderLicense).where(ProviderLicense.provider_id == provider_id)
        )
        return list(result.scalars().all())

    async def get_license(
        self, provider_id: uuid.UUID, category_id: uuid.UUID
    ) -> ProviderLicense | None:
        result = await self.db.execute(
            select(ProviderLicense).where(
                ProviderLicense.provider_id == provider_id,
                ProviderLicense.category_id == category_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_documents(self, provider_id: uuid.UUID) -> list[KYCDocument]:
        result = await self.db.execute(
            select(KYCDocument).where(KYCDocument.provider_id == provider_id)
        )
        return list(result.scalars().all())

    async def get_document(
        self, provider_id: uuid.UUID, document_type: KYCDocumentType
    ) -> KYCDocument | None:
        result = await self.db.execute(
            select(KYCDocument).where(
                KYCDocument.provider_id == provider_id,
                KYCDocument.document_type == document_type,
            )
        )
        return result.scalar_one_or_none()

    async def get_provider_service(
        self, provider_id: uuid.UUID, service_id: uuid.UUID
    ) -> ProviderService | None:
        result = await self.db.execute(
            select(ProviderService).where(
                ProviderService.provider_id == provider_id,
                ProviderService.service_id == service_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_all_providers(self) -> list[Provider]:
        result = await self.db.execute(select(Provider))
        return list(result.scalars().all())

    async def get_license_by_id(self, license_id: uuid.UUID) -> ProviderLicense | None:
        result = await self.db.execute(
            select(ProviderLicense).where(ProviderLicense.id == license_id)
        )
        return result.scalar_one_or_none()

    async def get_address_by_id(self, address_id: uuid.UUID) -> Address | None:
        result = await self.db.execute(select(Address).where(Address.id == address_id))
        return result.scalar_one_or_none()
