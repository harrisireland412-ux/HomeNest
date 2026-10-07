import uuid
from datetime import date

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import get_current_user
from app.models.kyc_document import KYCDocumentType
from app.models.user import User
from app.repositories.catalog_repository import CategoryRepository
from app.repositories.provider_onboarding_repository import ProviderOnboardingRepository
from app.repositories.review_repository import ReviewRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import TokenResponse, UserRead
from app.schemas.provider_onboarding import (
    KYCDocumentRead,
    ProviderLicenseRead,
    ProviderMeRead,
    ProviderOnboardRequest,
    ProviderRegisterRequest,
    ProviderServiceRead,
    ServiceSelection,
)
from app.schemas.review import ProviderReviewRead
from app.services.provider_onboarding_service import (
    EmailAlreadyRegisteredError,
    ProviderAlreadyExistsError,
    ProviderOnboardingService,
)

router = APIRouter(prefix="/providers", tags=["provider-onboarding"])


def get_onboarding_service(db: AsyncSession = Depends(get_db)) -> ProviderOnboardingService:
    return ProviderOnboardingService(
        UserRepository(db), ProviderOnboardingRepository(db), CategoryRepository(db)
    )


async def get_current_provider(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    provider = await ProviderOnboardingRepository(db).get_provider_by_user_id(user.id)
    if provider is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Provider profile not found"
        )
    return provider


@router.post("/register", response_model=TokenResponse)
async def register_provider(
    data: ProviderRegisterRequest,
    db: AsyncSession = Depends(get_db),
    service: ProviderOnboardingService = Depends(get_onboarding_service),
) -> TokenResponse:
    try:
        provider, token = await service.register(data)
    except EmailAlreadyRegisteredError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        ) from None
    await db.commit()
    user = await UserRepository(db).get_by_id(provider.user_id)
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


@router.post("/me/onboard", response_model=ProviderMeRead)
async def onboard_existing_user_as_provider(
    data: ProviderOnboardRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: ProviderOnboardingService = Depends(get_onboarding_service),
) -> ProviderMeRead:
    try:
        provider = await service.onboard_existing_user(user, data)
    except ProviderAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="You already have a provider profile"
        ) from None
    await db.commit()
    repo = ProviderOnboardingRepository(db)
    services = await repo.list_services(provider.id)
    return ProviderMeRead(
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
        licenses=[],
        documents=[],
    )


@router.get("/me", response_model=ProviderMeRead)
async def get_my_provider_profile(
    provider=Depends(get_current_provider),
    db: AsyncSession = Depends(get_db),
) -> ProviderMeRead:
    repo = ProviderOnboardingRepository(db)
    services = await repo.list_services(provider.id)
    licenses = await repo.list_licenses(provider.id)
    documents = await repo.list_documents(provider.id)

    return ProviderMeRead(
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
    )


@router.get("/me/reviews", response_model=list[ProviderReviewRead])
async def list_my_reviews(
    provider=Depends(get_current_provider),
    db: AsyncSession = Depends(get_db),
) -> list[ProviderReviewRead]:
    reviews = await ReviewRepository(db).list_for_provider(provider.id)
    user_repo = UserRepository(db)
    result: list[ProviderReviewRead] = []
    for review in reviews:
        customer = await user_repo.get_by_id(review.customer_id)
        result.append(
            ProviderReviewRead(
                id=review.id,
                booking_id=review.booking_id,
                service_id=review.service_id,
                rating=review.rating,
                comment=review.comment,
                created_at=review.created_at,
                customer_name=customer.full_name if customer else "A customer",
            )
        )
    return result


@router.post("/me/services", response_model=list[ProviderServiceRead])
async def add_provider_services(
    selections: list[ServiceSelection],
    provider=Depends(get_current_provider),
    db: AsyncSession = Depends(get_db),
    service: ProviderOnboardingService = Depends(get_onboarding_service),
) -> list[ProviderServiceRead]:
    await service.add_services(provider.id, selections)
    await db.commit()
    repo = ProviderOnboardingRepository(db)
    updated = await repo.list_services(provider.id)
    return [ProviderServiceRead.model_validate(s) for s in updated]


@router.post("/me/licenses", response_model=ProviderLicenseRead)
async def upload_license(
    category_id: uuid.UUID = Form(...),
    license_number: str = Form(...),
    issuing_authority: str = Form(...),
    expiry_date: date = Form(...),
    file: UploadFile = File(...),
    provider=Depends(get_current_provider),
    db: AsyncSession = Depends(get_db),
    service: ProviderOnboardingService = Depends(get_onboarding_service),
) -> ProviderLicenseRead:
    license_ = await service.upload_license(
        provider.id, category_id, license_number, issuing_authority, expiry_date, file
    )
    await db.commit()
    return ProviderLicenseRead.model_validate(license_)


@router.post("/me/kyc-documents", response_model=KYCDocumentRead)
async def upload_kyc_document(
    document_type: KYCDocumentType = Form(...),
    file: UploadFile = File(...),
    provider=Depends(get_current_provider),
    db: AsyncSession = Depends(get_db),
    service: ProviderOnboardingService = Depends(get_onboarding_service),
) -> KYCDocumentRead:
    document = await service.upload_kyc_document(provider, document_type, file)
    await db.commit()
    return KYCDocumentRead.model_validate(document)
