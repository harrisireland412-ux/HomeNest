import uuid
from datetime import datetime, timedelta, timezone

from httpx import ASGITransport, AsyncClient

from app.main import app


async def _get_client() -> AsyncClient:
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


async def test_customer_can_book_an_approved_provider() -> None:
    async with await _get_client() as client:
        cleaning_services = (await client.get("/categories/cleaning/services")).json()
        service = cleaning_services[0]

        providers = (await client.get(f"/services/{service['slug']}/providers")).json()
        assert len(providers) > 0
        provider = providers[0]

        email = f"customer-{uuid.uuid4()}@example.com"
        register_response = await client.post(
            "/auth/register",
            json={"email": email, "password": "testpass123", "full_name": "Booking Test"},
        )
        assert register_response.status_code == 200
        assert register_response.json()["user"]["role"] == "customer"
        token = register_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        booking_response = await client.post(
            "/bookings",
            headers=headers,
            json={
                "service_id": service["id"],
                "provider_id": provider["id"],
                "scheduled_at": "2030-01-01T10:00:00Z",
                "address": {
                    "line1": "1 Test St",
                    "city": "Testville",
                    "state": "TS",
                    "postal_code": "00000",
                    "country": "Testland",
                },
            },
        )
        assert booking_response.status_code == 200
        booking = booking_response.json()
        assert booking["status"] == "awaiting_provider"
        assert booking["total_price"] == service["base_price"]

        my_bookings = await client.get("/bookings/me", headers=headers)
        assert my_bookings.status_code == 200
        assert len(my_bookings.json()) == 1
        assert my_bookings.json()[0]["id"] == booking["id"]


async def test_booking_rejected_for_unapproved_provider() -> None:
    async with await _get_client() as client:
        electrician_services = (await client.get("/categories/electrician/services")).json()
        service = electrician_services[0]

        cleaning_services = (await client.get("/categories/cleaning/services")).json()
        cleaning_providers = (
            await client.get(f"/services/{cleaning_services[0]['slug']}/providers")
        ).json()
        unrelated_provider = cleaning_providers[0]

        email = f"customer-{uuid.uuid4()}@example.com"
        register_response = await client.post(
            "/auth/register",
            json={"email": email, "password": "testpass123", "full_name": "Reject Test"},
        )
        token = register_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        booking_response = await client.post(
            "/bookings",
            headers=headers,
            json={
                "service_id": service["id"],
                "provider_id": unrelated_provider["id"],
                "scheduled_at": "2030-01-01T10:00:00Z",
                "address": {
                    "line1": "1 Test St",
                    "city": "Testville",
                    "state": "TS",
                    "postal_code": "00000",
                    "country": "Testland",
                },
            },
        )
        assert booking_response.status_code == 400


async def _register_and_approve_provider(client, service):
    """Registers a fresh provider for `service`, admin-approves identity, returns their token."""
    email = f"provider-{uuid.uuid4()}@example.com"
    register_response = await client.post(
        "/providers/register",
        json={
            "email": email,
            "password": "testpass123",
            "full_name": "Accept Test Provider",
            "phone_primary": "555-0001",
            "address": {
                "line1": "1 Provider St",
                "city": "Testville",
                "state": "TS",
                "postal_code": "00000",
                "country": "Testland",
            },
            "services": [{"service_id": service["id"]}],
        },
    )
    assert register_response.status_code == 200
    provider_token = register_response.json()["access_token"]
    provider_headers = {"Authorization": f"Bearer {provider_token}"}

    me_response = await client.get("/providers/me", headers=provider_headers)
    provider_id = me_response.json()["id"]

    admin_login = await client.post(
        "/auth/login", json={"email": "admin@homenest.dev", "password": "admin12345"}
    )
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
    approve_response = await client.post(
        f"/admin/providers/{provider_id}/identity/approve", headers=admin_headers
    )
    assert approve_response.status_code == 200

    return provider_token, provider_headers, provider_id


async def _book_service(client, customer_headers, service, provider_id, scheduled_at):
    return await client.post(
        "/bookings",
        headers=customer_headers,
        json={
            "service_id": service["id"],
            "provider_id": provider_id,
            "scheduled_at": scheduled_at,
            "address": {
                "line1": "1 Test St",
                "city": "Testville",
                "state": "TS",
                "postal_code": "00000",
                "country": "Testland",
            },
        },
    )


async def test_provider_can_accept_a_booking_within_the_response_window() -> None:
    async with await _get_client() as client:
        cleaning_services = (await client.get("/categories/cleaning/services")).json()
        service = cleaning_services[0]

        _, provider_headers, provider_id = await _register_and_approve_provider(client, service)

        email = f"customer-{uuid.uuid4()}@example.com"
        register_response = await client.post(
            "/auth/register",
            json={"email": email, "password": "testpass123", "full_name": "Accept Customer"},
        )
        customer_headers = {
            "Authorization": f"Bearer {register_response.json()['access_token']}"
        }

        booking_response = await _book_service(
            client, customer_headers, service, provider_id, "2030-01-01T10:00:00Z"
        )
        assert booking_response.status_code == 200
        booking_id = booking_response.json()["id"]
        assert booking_response.json()["status"] == "awaiting_provider"

        requests_response = await client.get("/bookings/provider/me", headers=provider_headers)
        assert requests_response.status_code == 200
        assert any(b["id"] == booking_id for b in requests_response.json())

        accept_response = await client.post(
            f"/bookings/{booking_id}/accept", headers=provider_headers
        )
        assert accept_response.status_code == 200
        assert accept_response.json()["status"] == "confirmed"

        customer_view = await client.get("/bookings/me", headers=customer_headers)
        assert customer_view.json()[0]["status"] == "confirmed"


async def test_booking_expires_after_response_window_and_cannot_be_accepted() -> None:
    async with await _get_client() as client:
        cleaning_services = (await client.get("/categories/cleaning/services")).json()
        service = cleaning_services[1]

        _, provider_headers, provider_id = await _register_and_approve_provider(client, service)

        email = f"customer-{uuid.uuid4()}@example.com"
        register_response = await client.post(
            "/auth/register",
            json={"email": email, "password": "testpass123", "full_name": "Expire Customer"},
        )
        customer_headers = {
            "Authorization": f"Bearer {register_response.json()['access_token']}"
        }

        # Scheduled only 1 hour out: the 3-hour response window has already passed.
        soon = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        booking_response = await _book_service(
            client, customer_headers, service, provider_id, soon
        )
        booking_id = booking_response.json()["id"]

        requests_response = await client.get("/bookings/provider/me", headers=provider_headers)
        matching = next(b for b in requests_response.json() if b["id"] == booking_id)
        assert matching["status"] == "expired"

        accept_response = await client.post(
            f"/bookings/{booking_id}/accept", headers=provider_headers
        )
        assert accept_response.status_code == 409


async def test_customer_can_complete_and_review_a_confirmed_booking() -> None:
    from sqlalchemy import select

    from app.db.base import async_session_factory
    from app.models.booking import Booking

    async with await _get_client() as client:
        cleaning_services = (await client.get("/categories/cleaning/services")).json()
        service = cleaning_services[0]

        _, provider_headers, provider_id = await _register_and_approve_provider(client, service)

        email = f"customer-{uuid.uuid4()}@example.com"
        register_response = await client.post(
            "/auth/register",
            json={"email": email, "password": "testpass123", "full_name": "Review Customer"},
        )
        customer_headers = {
            "Authorization": f"Bearer {register_response.json()['access_token']}"
        }

        # Scheduled far enough out to accept within the 3-hour response window.
        soon = (datetime.now(timezone.utc) + timedelta(hours=4)).isoformat()
        booking_response = await _book_service(
            client, customer_headers, service, provider_id, soon
        )
        booking_id = booking_response.json()["id"]

        accept_response = await client.post(
            f"/bookings/{booking_id}/accept", headers=provider_headers
        )
        assert accept_response.status_code == 200

        # Can't complete before the scheduled time has passed.
        too_early = await client.post(
            f"/bookings/{booking_id}/complete", headers=customer_headers
        )
        assert too_early.status_code == 400

        # Move the scheduled time into the past directly, simulating the
        # appointment having already happened, so completion is now allowed.
        async with async_session_factory() as db:
            result = await db.execute(select(Booking).where(Booking.id == uuid.UUID(booking_id)))
            booking = result.scalar_one()
            booking.scheduled_at = datetime.now(timezone.utc) - timedelta(minutes=1)
            await db.commit()

        complete_response = await client.post(
            f"/bookings/{booking_id}/complete", headers=customer_headers
        )
        assert complete_response.status_code == 200
        assert complete_response.json()["status"] == "completed"

        review_response = await client.post(
            f"/bookings/{booking_id}/review",
            headers=customer_headers,
            json={"rating": 5, "comment": "Great work!"},
        )
        assert review_response.status_code == 200
        assert review_response.json()["has_review"] is True

        duplicate_review = await client.post(
            f"/bookings/{booking_id}/review",
            headers=customer_headers,
            json={"rating": 4},
        )
        assert duplicate_review.status_code == 409

        provider_reviews = await client.get("/providers/me/reviews", headers=provider_headers)
        assert provider_reviews.status_code == 200
        assert len(provider_reviews.json()) == 1
        assert provider_reviews.json()[0]["rating"] == 5
        assert provider_reviews.json()[0]["customer_name"] == "Review Customer"

        provider_me = await client.get("/providers/me", headers=provider_headers)
        assert provider_me.json()["review_count"] == 1
        assert provider_me.json()["rating"] == 5.0


async def test_customer_can_cancel_awaiting_or_confirmed_booking_but_not_after() -> None:
    async with await _get_client() as client:
        cleaning_services = (await client.get("/categories/cleaning/services")).json()
        service = cleaning_services[0]

        _, provider_headers, provider_id = await _register_and_approve_provider(client, service)

        email = f"customer-{uuid.uuid4()}@example.com"
        register_response = await client.post(
            "/auth/register",
            json={"email": email, "password": "testpass123", "full_name": "Cancel Customer"},
        )
        customer_headers = {
            "Authorization": f"Bearer {register_response.json()['access_token']}"
        }

        # Cancel while still awaiting provider response.
        booking_response = await _book_service(
            client, customer_headers, service, provider_id, "2030-01-01T10:00:00Z"
        )
        booking_id = booking_response.json()["id"]

        cancel_response = await client.post(
            f"/bookings/{booking_id}/cancel", headers=customer_headers
        )
        assert cancel_response.status_code == 200
        assert cancel_response.json()["status"] == "cancelled"

        # Cannot cancel a booking that's already cancelled.
        second_cancel = await client.post(
            f"/bookings/{booking_id}/cancel", headers=customer_headers
        )
        assert second_cancel.status_code == 409

        # Cancel after the provider has confirmed.
        second_booking = await _book_service(
            client, customer_headers, service, provider_id, "2030-01-02T10:00:00Z"
        )
        second_id = second_booking.json()["id"]
        await client.post(f"/bookings/{second_id}/accept", headers=provider_headers)

        confirmed_cancel = await client.post(
            f"/bookings/{second_id}/cancel", headers=customer_headers
        )
        assert confirmed_cancel.status_code == 200
        assert confirmed_cancel.json()["status"] == "cancelled"
