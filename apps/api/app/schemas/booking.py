import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.booking import BookingStatus
from app.schemas.provider_onboarding import AddressCreate


class BookingCreate(BaseModel):
    service_id: uuid.UUID
    provider_id: uuid.UUID
    scheduled_at: datetime
    address: AddressCreate


class BookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    service_id: uuid.UUID
    provider_id: uuid.UUID
    address_id: uuid.UUID
    scheduled_at: datetime
    status: BookingStatus
    total_price: float
    has_review: bool = False
