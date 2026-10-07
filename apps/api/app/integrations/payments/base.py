from dataclasses import dataclass
from typing import Protocol

from app.models.payment import PaymentStatus


@dataclass
class PaymentResult:
    status: PaymentStatus
    method: str


class PaymentGateway(Protocol):
    def charge(self, amount: float) -> PaymentResult: ...
