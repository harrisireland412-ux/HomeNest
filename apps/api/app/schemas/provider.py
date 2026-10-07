import uuid

from pydantic import BaseModel, ConfigDict


class ProviderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    display_name: str
    avatar_url: str
    rating: float
    review_count: int
    is_featured: bool
