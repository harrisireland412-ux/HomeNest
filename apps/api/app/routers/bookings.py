import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import get_current_user
from app.models.user import User, UserRole
from app.repositories.booking_repository import BookingRepository
from app.repositories.catalog_repository import ServiceRepository
from app.repositories.provider_onboarding_repository import ProviderOnboardingRepository
from app.repositories.review_repository import ReviewRepository
from app.routers.provider_onboarding import get_current_provider
from app.schemas.booking import BookingCreate, BookingRead
from app.schemas.review import ReviewCreate
from app.services.booking_service import (
    BookingAlreadyDecidedError,
    BookingNotCancellableError,
    BookingNotYetDueError,
    BookingService,
    ProviderNotApprovedError,
    ServiceNotFoundError,
)
from app.services.review_service import (
    BookingNotCompletedError,
    ReviewAlreadyExistsError,
    ReviewService,
)

router = APIRouter(prefix="/bookings", tags=["bookings"])


def get_booking_service(db: AsyncSession = Depends(get_db)) -> BookingService:
    return BookingService(
        BookingRepository(db), ServiceRepository(db), ProviderOnboardingRepository(db)
    )


def get_review_service(db: AsyncSession = Depends(get_db)) -> ReviewService:
    return ReviewService(ReviewRepository(db))


def _to_read(booking, reviewed_ids: set) -> BookingRead:
    read = BookingRead.model_validate(booking)
    read.has_review = booking.id in reviewed_ids
    return read


@router.post("", response_model=BookingRead)
async def create_booking(
    data: BookingCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: BookingService = Depends(get_booking_service),
) -> BookingRead:
    try:
        booking = await service.create_booking(user, data)
    except ServiceNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Service not found"
        ) from None
    except ProviderNotApprovedError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provider is not approved for this service",
        ) from None
    await db.commit()
    return BookingRead.model_validate(booking)


@router.get("/me", response_model=list[BookingRead])
async def list_my_bookings(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: BookingService = Depends(get_booking_service),
) -> list[BookingRead]:
    bookings = await service.list_for_customer(user.id)
    await db.commit()
    reviewed_ids = await ReviewRepository(db).list_reviewed_booking_ids_for_customer(user.id)
    return [_to_read(b, reviewed_ids) for b in bookings]


@router.get("/provider/me", response_model=list[BookingRead])
async def list_provider_bookings(
    provider=Depends(get_current_provider),
    db: AsyncSession = Depends(get_db),
    service: BookingService = Depends(get_booking_service),
) -> list[BookingRead]:
    bookings = await service.list_for_provider(provider.id)
    await db.commit()
    return [BookingRead.model_validate(b) for b in bookings]


@router.post("/{booking_id}/accept", response_model=BookingRead)
async def accept_booking(
    booking_id: uuid.UUID,
    provider=Depends(get_current_provider),
    db: AsyncSession = Depends(get_db),
    service: BookingService = Depends(get_booking_service),
) -> BookingRead:
    booking_repo = BookingRepository(db)
    booking = await booking_repo.get_by_id(booking_id)
    if booking is None or booking.provider_id != provider.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    try:
        booking = await service.accept_booking(booking, provider)
    except BookingAlreadyDecidedError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This booking can no longer be accepted",
        ) from None
    await db.commit()
    return BookingRead.model_validate(booking)


@router.post("/{booking_id}/reject", response_model=BookingRead)
async def reject_booking(
    booking_id: uuid.UUID,
    provider=Depends(get_current_provider),
    db: AsyncSession = Depends(get_db),
    service: BookingService = Depends(get_booking_service),
) -> BookingRead:
    booking_repo = BookingRepository(db)
    booking = await booking_repo.get_by_id(booking_id)
    if booking is None or booking.provider_id != provider.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    try:
        booking = await service.reject_booking(booking, provider)
    except BookingAlreadyDecidedError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This booking can no longer be rejected",
        ) from None
    await db.commit()
    return BookingRead.model_validate(booking)


@router.get("/{booking_id}", response_model=BookingRead)
async def get_booking(
    booking_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: BookingService = Depends(get_booking_service),
) -> BookingRead:
    booking = await service.get_for_customer(booking_id, user.id, user.role == UserRole.admin)
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    await db.commit()
    reviewed_ids = await ReviewRepository(db).list_reviewed_booking_ids_for_customer(user.id)
    return _to_read(booking, reviewed_ids)


@router.post("/{booking_id}/complete", response_model=BookingRead)
async def complete_booking(
    booking_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: BookingService = Depends(get_booking_service),
) -> BookingRead:
    booking_repo = BookingRepository(db)
    booking = await booking_repo.get_by_id(booking_id)
    if booking is None or booking.customer_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    try:
        booking = await service.complete_booking(booking)
    except BookingAlreadyDecidedError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This booking can no longer be marked as completed",
        ) from None
    except BookingNotYetDueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This booking's scheduled time hasn't passed yet",
        ) from None
    await db.commit()
    return _to_read(booking, set())


@router.post("/{booking_id}/cancel", response_model=BookingRead)
async def cancel_booking(
    booking_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: BookingService = Depends(get_booking_service),
) -> BookingRead:
    booking_repo = BookingRepository(db)
    booking = await booking_repo.get_by_id(booking_id)
    if booking is None or booking.customer_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    try:
        booking = await service.cancel_booking(booking)
    except BookingNotCancellableError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This booking can no longer be cancelled",
        ) from None
    await db.commit()
    reviewed_ids = await ReviewRepository(db).list_reviewed_booking_ids_for_customer(user.id)
    return _to_read(booking, reviewed_ids)


@router.post("/{booking_id}/review", response_model=BookingRead)
async def review_booking(
    booking_id: uuid.UUID,
    data: ReviewCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    review_service: ReviewService = Depends(get_review_service),
) -> BookingRead:
    booking_repo = BookingRepository(db)
    booking = await booking_repo.get_by_id(booking_id)
    if booking is None or booking.customer_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    provider = await ProviderOnboardingRepository(db).get_provider_by_id(booking.provider_id)
    if provider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")
    try:
        await review_service.create_review(booking, provider, data)
    except BookingNotCompletedError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can only review a completed booking",
        ) from None
    except ReviewAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You've already reviewed this booking",
        ) from None
    await db.commit()
    return _to_read(booking, {booking.id})
