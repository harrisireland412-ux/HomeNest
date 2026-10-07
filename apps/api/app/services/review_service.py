from app.models.booking import Booking, BookingStatus
from app.models.provider import Provider
from app.models.review import Review
from app.repositories.review_repository import ReviewRepository
from app.schemas.review import ReviewCreate


class BookingNotCompletedError(Exception):
    pass


class ReviewAlreadyExistsError(Exception):
    pass


class ReviewService:
    def __init__(self, review_repo: ReviewRepository) -> None:
        self.review_repo = review_repo

    async def create_review(
        self, booking: Booking, provider: Provider, data: ReviewCreate
    ) -> Review:
        if booking.status != BookingStatus.completed:
            raise BookingNotCompletedError
        existing = await self.review_repo.get_by_booking_id(booking.id)
        if existing is not None:
            raise ReviewAlreadyExistsError

        review = Review(
            booking_id=booking.id,
            customer_id=booking.customer_id,
            provider_id=booking.provider_id,
            service_id=booking.service_id,
            rating=data.rating,
            comment=data.comment,
        )
        self.review_repo.add(review)

        total_rating = float(provider.rating) * provider.review_count + data.rating
        provider.review_count += 1
        provider.rating = round(total_rating / provider.review_count, 1)

        return review
