from app.integrations.payments.base import PaymentResult
from app.models.payment import PaymentStatus


class MockGateway:
    def charge(self, amount: float) -> PaymentResult:
        return PaymentResult(status=PaymentStatus.succeeded, method="mock")


gateway = MockGateway()
