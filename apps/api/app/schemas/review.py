import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = None


class ReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    booking_id: uuid.UUID
    service_id: uuid.UUID
    rating: int
    comment: str | None
    created_at: datetime


class ProviderReviewRead(ReviewRead):
    customer_name: str
