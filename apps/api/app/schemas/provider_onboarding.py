import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict

from app.models.kyc_document import KYCDocumentType
from app.models.provider import IdentityStatus
from app.models.provider_license import LicenseStatus
from app.models.provider_service import ProviderServiceStatus


class AddressCreate(BaseModel):
    line1: str
    line2: str | None = None
    city: str
    state: str
    postal_code: str
    country: str


class AddressRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    line1: str
    line2: str | None
    city: str
    state: str
    postal_code: str
    country: str


class ServiceSelection(BaseModel):
    service_id: uuid.UUID
    custom_price: float | None = None


class ProviderRegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    phone_primary: str
    phone_alternate: str | None = None
    bio: str | None = None
    years_experience: int | None = None
    address: AddressCreate
    services: list[ServiceSelection]


class ProviderOnboardRequest(BaseModel):
    phone_primary: str
    phone_alternate: str | None = None
    bio: str | None = None
    years_experience: int | None = None
    address: AddressCreate
    services: list[ServiceSelection]


class ProviderServiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    service_id: uuid.UUID
    custom_price: float | None
    status: ProviderServiceStatus


class ProviderLicenseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    category_id: uuid.UUID
    license_number: str
    issuing_authority: str
    expiry_date: date
    status: LicenseStatus
    rejection_reason: str | None


class KYCDocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_type: KYCDocumentType


class ProviderMeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    display_name: str
    phone_primary: str | None
    phone_alternate: str | None
    bio: str | None
    years_experience: int | None
    identity_status: IdentityStatus
    identity_rejection_reason: str | None
    rating: float
    review_count: int
    services: list[ProviderServiceRead]
    licenses: list[ProviderLicenseRead]
    documents: list[KYCDocumentRead]
