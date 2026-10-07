import uuid
from datetime import date

from fastapi import UploadFile

from app.core.security import create_access_token, hash_password
from app.integrations.storage.local import storage
from app.models.address import Address
from app.models.catalog import Category
from app.models.kyc_document import KYCDocument, KYCDocumentType
from app.models.provider import IdentityStatus, Provider
from app.models.provider_license import LicenseStatus, ProviderLicense
from app.models.provider_service import ProviderService, ProviderServiceStatus
from app.models.user import User, UserRole
from app.repositories.catalog_repository import CategoryRepository, ServiceRepository
from app.repositories.provider_onboarding_repository import ProviderOnboardingRepository
from app.repositories.user_repository import UserRepository
from app.schemas.provider_onboarding import (
    AddressCreate,
    ProviderOnboardRequest,
    ProviderRegisterRequest,
    ServiceSelection,
)


class EmailAlreadyRegisteredError(Exception):
    pass


class ProviderAlreadyExistsError(Exception):
    pass


class ProviderOnboardingService:
    def __init__(
        self,
        user_repo: UserRepository,
        provider_repo: ProviderOnboardingRepository,
        category_repo: CategoryRepository,
    ) -> None:
        self.user_repo = user_repo
        self.provider_repo = provider_repo
        self.category_repo = category_repo

    async def register(self, data: ProviderRegisterRequest) -> tuple[Provider, str]:
        existing = await self.user_repo.get_by_email(data.email)
        if existing is not None:
            raise EmailAlreadyRegisteredError

        user = User(
            email=data.email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            phone=data.phone_primary,
            role=UserRole.provider,
        )
        self.user_repo.add(user)
        await self.user_repo.db.flush()

        provider = await self._create_provider_profile(
            user_id=user.id,
            full_name=data.full_name,
            phone_primary=data.phone_primary,
            phone_alternate=data.phone_alternate,
            bio=data.bio,
            years_experience=data.years_experience,
            address=data.address,
            services=data.services,
        )

        token = create_access_token(user.id, user.role.value)
        return provider, token

    async def onboard_existing_user(
        self, user: User, data: ProviderOnboardRequest
    ) -> Provider:
        existing = await self.provider_repo.get_provider_by_user_id(user.id)
        if existing is not None:
            raise ProviderAlreadyExistsError

        return await self._create_provider_profile(
            user_id=user.id,
            full_name=user.full_name,
            phone_primary=data.phone_primary,
            phone_alternate=data.phone_alternate,
            bio=data.bio,
            years_experience=data.years_experience,
            address=data.address,
            services=data.services,
        )

    async def _create_provider_profile(
        self,
        *,
        user_id: uuid.UUID,
        full_name: str,
        phone_primary: str,
        phone_alternate: str | None,
        bio: str | None,
        years_experience: int | None,
        address: AddressCreate,
        services: list[ServiceSelection],
    ) -> Provider:
        address_row = Address(
            line1=address.line1,
            line2=address.line2,
            city=address.city,
            state=address.state,
            postal_code=address.postal_code,
            country=address.country,
        )
        self.provider_repo.add(address_row)
        await self.provider_repo.db.flush()

        provider = Provider(
            user_id=user_id,
            address_id=address_row.id,
            display_name=full_name,
            phone_primary=phone_primary,
            phone_alternate=phone_alternate,
            bio=bio,
            years_experience=years_experience,
        )
        self.provider_repo.add(provider)
        await self.provider_repo.db.flush()

        for selection in services:
            self._add_service(provider.id, selection)

        return provider

    async def add_services(
        self, provider_id: uuid.UUID, selections: list[ServiceSelection]
    ) -> None:
        for selection in selections:
            existing = await self.provider_repo.get_provider_service(
                provider_id, selection.service_id
            )
            if existing is None:
                self._add_service(provider_id, selection)

    def _add_service(self, provider_id: uuid.UUID, selection: ServiceSelection) -> None:
        provider_service = ProviderService(
            provider_id=provider_id,
            service_id=selection.service_id,
            custom_price=selection.custom_price,
        )
        self.provider_repo.add(provider_service)

    async def upload_license(
        self,
        provider_id: uuid.UUID,
        category_id: uuid.UUID,
        license_number: str,
        issuing_authority: str,
        expiry_date: date,
        file: UploadFile,
    ) -> ProviderLicense:
        file_path = await storage.save(file, subdir=f"providers/{provider_id}/licenses")
        existing = await self.provider_repo.get_license(provider_id, category_id)
        if existing is not None:
            existing.license_number = license_number
            existing.issuing_authority = issuing_authority
            existing.expiry_date = expiry_date
            existing.file_path = file_path
            existing.status = LicenseStatus.pending
            existing.rejection_reason = None
            return existing

        license_ = ProviderLicense(
            provider_id=provider_id,
            category_id=category_id,
            license_number=license_number,
            issuing_authority=issuing_authority,
            expiry_date=expiry_date,
            file_path=file_path,
        )
        self.provider_repo.add(license_)
        return license_

    async def upload_kyc_document(
        self, provider: Provider, document_type: KYCDocumentType, file: UploadFile
    ) -> KYCDocument:
        file_path = await storage.save(file, subdir=f"providers/{provider.id}/kyc")
        existing = await self.provider_repo.get_document(provider.id, document_type)
        if existing is not None:
            existing.file_path = file_path
        else:
            existing = KYCDocument(
                provider_id=provider.id, document_type=document_type, file_path=file_path
            )
            self.provider_repo.add(existing)

        if provider.identity_status == IdentityStatus.rejected:
            provider.identity_status = IdentityStatus.pending
            provider.identity_rejection_reason = None

        return existing

    async def get_category_requires_license(self, category_id: uuid.UUID) -> bool:
        category = await self.category_repo.get_by_id(category_id)
        return bool(category and category.requires_license)

    async def sync_service_statuses(self, provider: Provider) -> None:
        """Flip each ProviderService to approved once identity + license (if required) approve."""
        services = await self.provider_repo.list_services(provider.id)
        if not services:
            return

        service_repo = ServiceRepository(self.provider_repo.db)

        for provider_service in services:
            if provider_service.status == ProviderServiceStatus.rejected:
                continue

            catalog_service = await service_repo.get_by_id(provider_service.service_id)
            if catalog_service is None:
                continue

            category: Category | None = await self.category_repo.get_by_id(
                catalog_service.category_id
            )
            license_ok = True
            if category is not None and category.requires_license:
                license_row = await self.provider_repo.get_license(
                    provider.id, category.id
                )
                license_ok = (
                    license_row is not None and license_row.status == LicenseStatus.approved
                )

            identity_ok = provider.identity_status == IdentityStatus.approved

            if identity_ok and license_ok:
                provider_service.status = ProviderServiceStatus.approved
            elif provider_service.status == ProviderServiceStatus.approved:
                provider_service.status = ProviderServiceStatus.pending

    async def approve_identity(self, provider: Provider) -> None:
        provider.identity_status = IdentityStatus.approved
        provider.identity_rejection_reason = None
        await self.sync_service_statuses(provider)

    async def reject_identity(self, provider: Provider, reason: str) -> None:
        provider.identity_status = IdentityStatus.rejected
        provider.identity_rejection_reason = reason
        await self.sync_service_statuses(provider)

    async def approve_license(self, provider: Provider, license_: ProviderLicense) -> None:
        license_.status = LicenseStatus.approved
        license_.rejection_reason = None
        await self.sync_service_statuses(provider)

    async def reject_license(
        self, provider: Provider, license_: ProviderLicense, reason: str
    ) -> None:
        license_.status = LicenseStatus.rejected
        license_.rejection_reason = reason
        await self.sync_service_statuses(provider)
