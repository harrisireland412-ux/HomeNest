import uuid
from datetime import datetime, timedelta, timezone

from app.integrations.payments.mock import gateway
from app.models.address import Address
from app.models.booking import Booking, BookingStatus
from app.models.payment import Payment
from app.models.provider import Provider
from app.models.provider_service import ProviderServiceStatus
from app.models.user import User
from app.repositories.booking_repository import BookingRepository
from app.repositories.catalog_repository import ServiceRepository
from app.repositories.provider_onboarding_repository import ProviderOnboardingRepository
from app.schemas.booking import BookingCreate

RESPONSE_WINDOW = timedelta(hours=3)


class ServiceNotFoundError(Exception):
    pass


class ProviderNotApprovedError(Exception):
    pass


class BookingAlreadyDecidedError(Exception):
    pass


class BookingNotYetDueError(Exception):
    pass


class BookingNotCancellableError(Exception):
    pass


class BookingService:
    def __init__(
        self,
        booking_repo: BookingRepository,
        service_repo: ServiceRepository,
        provider_onboarding_repo: ProviderOnboardingRepository,
    ) -> None:
        self.booking_repo = booking_repo
        self.service_repo = service_repo
        self.provider_onboarding_repo = provider_onboarding_repo

    async def create_booking(self, customer: User, data: BookingCreate) -> Booking:
        catalog_service = await self.service_repo.get_by_id(data.service_id)
        if catalog_service is None:
            raise ServiceNotFoundError

        provider_service = await self.provider_onboarding_repo.get_provider_service(
            data.provider_id, data.service_id
        )
        if (
            provider_service is None
            or provider_service.status != ProviderServiceStatus.approved
        ):
            raise ProviderNotApprovedError

        address = Address(
            line1=data.address.line1,
            line2=data.address.line2,
            city=data.address.city,
            state=data.address.state,
            postal_code=data.address.postal_code,
            country=data.address.country,
        )
        self.booking_repo.add(address)
        await self.booking_repo.db.flush()

        total_price = (
            provider_service.custom_price
            if provider_service.custom_price is not None
            else catalog_service.base_price
        )

        booking = Booking(
            customer_id=customer.id,
            service_id=data.service_id,
            provider_id=data.provider_id,
            address_id=address.id,
            scheduled_at=data.scheduled_at,
            total_price=total_price,
        )
        self.booking_repo.add(booking)
        await self.booking_repo.db.flush()

        result = gateway.charge(float(total_price))
        payment = Payment(booking_id=booking.id, amount=total_price, status=result.status)
        self.booking_repo.add(payment)

        if result.status.value != "succeeded":
            booking.status = BookingStatus.cancelled

        return booking

    def _sync_status(self, booking: Booking) -> Booking:
        """Lazily expire bookings whose 3-hour provider-response window has passed."""
        if booking.status == BookingStatus.awaiting_provider:
            deadline = booking.scheduled_at - RESPONSE_WINDOW
            # SQLite doesn't round-trip tzinfo, so compare in naive UTC to avoid
            # aware/naive comparison errors regardless of what the DB driver returns.
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            if deadline.tzinfo is not None:
                deadline = deadline.replace(tzinfo=None)
            if now >= deadline:
                booking.status = BookingStatus.expired
        return booking

    async def list_for_customer(self, customer_id: uuid.UUID) -> list[Booking]:
        bookings = await self.booking_repo.list_for_customer(customer_id)
        return [self._sync_status(b) for b in bookings]

    async def list_for_provider(self, provider_id: uuid.UUID) -> list[Booking]:
        bookings = await self.booking_repo.list_for_provider(provider_id)
        return [self._sync_status(b) for b in bookings]

    async def get_for_customer(
        self, booking_id: uuid.UUID, customer_id: uuid.UUID, is_admin: bool
    ) -> Booking | None:
        booking = await self.booking_repo.get_by_id(booking_id)
        if booking is None:
            return None
        if booking.customer_id != customer_id and not is_admin:
            return None
        return self._sync_status(booking)

    async def accept_booking(self, booking: Booking, provider: Provider) -> Booking:
        self._sync_status(booking)
        if booking.status != BookingStatus.awaiting_provider:
            raise BookingAlreadyDecidedError
        booking.status = BookingStatus.confirmed
        return booking

    async def reject_booking(self, booking: Booking, provider: Provider) -> Booking:
        self._sync_status(booking)
        if booking.status != BookingStatus.awaiting_provider:
            raise BookingAlreadyDecidedError
        booking.status = BookingStatus.rejected
        return booking

    async def complete_booking(self, booking: Booking) -> Booking:
        self._sync_status(booking)
        if booking.status != BookingStatus.confirmed:
            raise BookingAlreadyDecidedError
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        scheduled_at = booking.scheduled_at
        if scheduled_at.tzinfo is not None:
            scheduled_at = scheduled_at.replace(tzinfo=None)
        if now < scheduled_at:
            raise BookingNotYetDueError
        booking.status = BookingStatus.completed
        return booking

    async def cancel_booking(self, booking: Booking) -> Booking:
        self._sync_status(booking)
        if booking.status not in (BookingStatus.awaiting_provider, BookingStatus.confirmed):
            raise BookingNotCancellableError
        booking.status = BookingStatus.cancelled
        return booking
