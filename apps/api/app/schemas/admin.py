import uuid

from pydantic import BaseModel

from app.schemas.provider_onboarding import AddressRead, ProviderMeRead


class RejectionRequest(BaseModel):
    reason: str


class AdminProviderListItem(BaseModel):
    id: uuid.UUID
    display_name: str
    identity_status: str
    pending_license_count: int
    pending_service_count: int


class AdminProviderDetail(ProviderMeRead):
    email: str
    address: AddressRead | None
