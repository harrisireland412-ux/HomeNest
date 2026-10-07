import uuid

from pydantic import BaseModel, ConfigDict


class TestimonialRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    author_name: str
    avatar_url: str
    quote: str
    rating: float


class FAQRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    question: str
    answer: str
    sort_order: int


class OfferRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str
    image_url: str
    sort_order: int
