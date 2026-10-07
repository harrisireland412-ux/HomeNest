import uuid

from pydantic import BaseModel, ConfigDict


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    icon_name: str
    sort_order: int
    requires_license: bool


class ServiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    category_id: uuid.UUID
    name: str
    slug: str
    description: str
    base_price: float
    image_url: str
    is_featured: bool
    is_popular: bool


class ServiceUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    base_price: float | None = None
    image_url: str | None = None
    is_featured: bool | None = None
    is_popular: bool | None = None
