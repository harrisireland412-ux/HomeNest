import uuid
from pathlib import PurePosixPath
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import require_role
from app.integrations.storage.local import storage
from app.models.provider import IdentityStatus
from app.models.user import UserRole
from app.repositories.catalog_repository import CategoryRepository
from app.repositories.provider_onboarding_repository import ProviderOnboardingRepository
from app.repositories.user_repository import UserRepository
from app.schemas.admin import AdminProviderDetail, AdminProviderListItem, RejectionRequest
from app.schemas.provider_onboarding import (
    AddressRead,
    KYCDocumentRead,
    ProviderLicenseRead,
    ProviderServiceRead,
)
from app.services.provider_onboarding_service import ProviderOnboardingService

router = APIRouter(
    prefix="/admin/providers",
    tags=["admin"],
    dependencies=[Depends(require_role(UserRole.admin))],
)


def get_onboarding_service(db: AsyncSession = Depends(get_db)) -> ProviderOnboardingService:
    return ProviderOnboardingService(
        UserRepository(db), ProviderOnboardingRepository(db), CategoryRepository(db)
    )


@router.get("", response_model=list[AdminProviderListItem])
async def list_providers(
    status_filter: Literal["pending", "approved", "reviewed"] = "reviewed",
    db: AsyncSession = Depends(get_db),
) -> list[AdminProviderListItem]:
    repo = ProviderOnboardingRepository(db)
    all_providers = await repo.list_all_providers()

    if status_filter == "pending":
        providers = [p for p in all_providers if p.identity_status == IdentityStatus.pending]
    elif status_filter == "approved":
        providers = [p for p in all_providers if p.identity_status == IdentityStatus.approved]
    else:
        providers = [p for p in all_providers if p.identity_status != IdentityStatus.pending]

    items = []
    for provider in providers:
        licenses = await repo.list_licenses(provider.id)
        services = await repo.list_services(provider.id)
        pending_license_count = sum(1 for lic in licenses if lic.status.value == "pending")
        pending_service_count = sum(1 for svc in services if svc.status.value == "pending")
        items.append(
            AdminProviderListItem(
                id=provider.id,
                display_name=provider.display_name,
                identity_status=provider.identity_status.value,
                pending_license_count=pending_license_count,
                pending_service_count=pending_service_count,
            )
        )
    return items


async def _get_provider_or_404(provider_id: uuid.UUID, repo: ProviderOnboardingRepository):
    provider = await repo.get_provider_by_id(provider_id)
    if provider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")
    return provider


@router.get("/{provider_id}", response_model=AdminProviderDetail)
async def get_provider_detail(
    provider_id: uuid.UUID, db: AsyncSession = Depends(get_db)
) -> AdminProviderDetail:
    repo = ProviderOnboardingRepository(db)
    provider = await _get_provider_or_404(provider_id, repo)
    services = await repo.list_services(provider.id)
    licenses = await repo.list_licenses(provider.id)
    documents = await repo.list_documents(provider.id)

    email = ""
    if provider.user_id is not None:
        user = await UserRepository(db).get_by_id(provider.user_id)
        if user is not None:
            email = user.email

    address = None
    if provider.address_id is not None:
        address_row = await repo.get_address_by_id(provider.address_id)
        if address_row is not None:
            address = AddressRead.model_validate(address_row)

    return AdminProviderDetail(
        id=provider.id,
        display_name=provider.display_name,
        phone_primary=provider.phone_primary,
        phone_alternate=provider.phone_alternate,
        bio=provider.bio,
        years_experience=provider.years_experience,
        identity_status=provider.identity_status,
        identity_rejection_reason=provider.identity_rejection_reason,
        rating=provider.rating,
        review_count=provider.review_count,
        services=[ProviderServiceRead.model_validate(s) for s in services],
        licenses=[ProviderLicenseRead.model_validate(license_) for license_ in licenses],
        documents=[KYCDocumentRead.model_validate(d) for d in documents],
        email=email,
        address=address,
    )


@router.post("/{provider_id}/identity/approve")
async def approve_identity(
    provider_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    service: ProviderOnboardingService = Depends(get_onboarding_service),
) -> dict:
    repo = ProviderOnboardingRepository(db)
    provider = await _get_provider_or_404(provider_id, repo)
    await service.approve_identity(provider)
    await db.commit()
    return {"status": "approved"}


@router.post("/{provider_id}/identity/reject")
async def reject_identity(
    provider_id: uuid.UUID,
    body: RejectionRequest,
    db: AsyncSession = Depends(get_db),
    service: ProviderOnboardingService = Depends(get_onboarding_service),
) -> dict:
    repo = ProviderOnboardingRepository(db)
    provider = await _get_provider_or_404(provider_id, repo)
    await service.reject_identity(provider, body.reason)
    await db.commit()
    return {"status": "rejected"}


@router.post("/{provider_id}/licenses/{license_id}/approve")
async def approve_license(
    provider_id: uuid.UUID,
    license_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    service: ProviderOnboardingService = Depends(get_onboarding_service),
) -> dict:
    repo = ProviderOnboardingRepository(db)
    provider = await _get_provider_or_404(provider_id, repo)
    license_ = await repo.get_license_by_id(license_id)
    if license_ is None or license_.provider_id != provider.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="License not found")
    await service.approve_license(provider, license_)
    await db.commit()
    return {"status": "approved"}


@router.post("/{provider_id}/licenses/{license_id}/reject")
async def reject_license(
    provider_id: uuid.UUID,
    license_id: uuid.UUID,
    body: RejectionRequest,
    db: AsyncSession = Depends(get_db),
    service: ProviderOnboardingService = Depends(get_onboarding_service),
) -> dict:
    repo = ProviderOnboardingRepository(db)
    provider = await _get_provider_or_404(provider_id, repo)
    license_ = await repo.get_license_by_id(license_id)
    if license_ is None or license_.provider_id != provider.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="License not found")
    await service.reject_license(provider, license_, body.reason)
    await db.commit()
    return {"status": "rejected"}


@router.get("/{provider_id}/licenses/{license_id}/file")
async def get_provider_license_file(
    provider_id: uuid.UUID, license_id: uuid.UUID, db: AsyncSession = Depends(get_db)
) -> Response:
    repo = ProviderOnboardingRepository(db)
    provider = await _get_provider_or_404(provider_id, repo)
    license_ = await repo.get_license_by_id(license_id)
    if license_ is None or license_.provider_id != provider.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="License not found")

    content = storage.read(license_.file_path)
    suffix = PurePosixPath(license_.file_path).suffix
    filename = f"license-{license_.license_number}{suffix}"
    return Response(
        content=content,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{provider_id}/documents/{document_id}")
async def get_provider_document(
    provider_id: uuid.UUID, document_id: uuid.UUID, db: AsyncSession = Depends(get_db)
) -> Response:
    repo = ProviderOnboardingRepository(db)
    provider = await _get_provider_or_404(provider_id, repo)
    documents = await repo.list_documents(provider.id)
    document = next((d for d in documents if d.id == document_id), None)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    content = storage.read(document.file_path)
    suffix = PurePosixPath(document.file_path).suffix
    filename = f"{document.document_type.value}{suffix}"
    return Response(
        content=content,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
