import enum
import uuid

from sqlalchemy import Enum, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class KYCDocumentType(str, enum.Enum):
    photo_id = "photo_id"
    address_proof = "address_proof"


class KYCDocument(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "kyc_documents"

    provider_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("providers.id"))
    document_type: Mapped[KYCDocumentType] = mapped_column(Enum(KYCDocumentType))
    file_path: Mapped[str] = mapped_column(String(500))
