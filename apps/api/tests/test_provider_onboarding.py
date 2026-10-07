import uuid

from httpx import ASGITransport, AsyncClient

from app.main import app


async def _get_client() -> AsyncClient:
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


async def test_provider_register_and_admin_approve_auto_flips_services() -> None:
    async with await _get_client() as client:
        categories = (await client.get("/categories")).json()
        electrician = next(c for c in categories if c["slug"] == "electrician")

        services = (await client.get(f"/categories/{electrician['slug']}/services")).json()
        service = services[0]

        email = f"test-{uuid.uuid4()}@example.com"
        register_response = await client.post(
            "/providers/register",
            json={
                "email": email,
                "password": "testpass123",
                "full_name": "Automated Test Provider",
                "phone_primary": "555-0000",
                "address": {
                    "line1": "1 Test St",
                    "city": "Testville",
                    "state": "TS",
                    "postal_code": "00000",
                    "country": "Testland",
                },
                "services": [{"service_id": service["id"]}],
            },
        )
        assert register_response.status_code == 200
        token = register_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        me_response = await client.get("/providers/me", headers=headers)
        assert me_response.status_code == 200
        provider_data = me_response.json()
        provider_id = provider_data["id"]
        assert provider_data["services"][0]["status"] == "pending"

        license_response = await client.post(
            "/providers/me/licenses",
            headers=headers,
            data={
                "category_id": electrician["id"],
                "license_number": "TEST-LIC-1",
                "issuing_authority": "Test Authority",
                "expiry_date": "2030-01-01",
            },
            files={"file": ("license.pdf", b"fake license bytes", "application/pdf")},
        )
        assert license_response.status_code == 200
        license_id = license_response.json()["id"]

        admin_login = await client.post(
            "/auth/login",
            json={"email": "admin@homenest.dev", "password": "admin12345"},
        )
        assert admin_login.status_code == 200
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        approve_identity = await client.post(
            f"/admin/providers/{provider_id}/identity/approve", headers=admin_headers
        )
        assert approve_identity.status_code == 200

        approve_license = await client.post(
            f"/admin/providers/{provider_id}/licenses/{license_id}/approve",
            headers=admin_headers,
        )
        assert approve_license.status_code == 200

        final = await client.get("/providers/me", headers=headers)
        assert final.json()["services"][0]["status"] == "approved"


async def test_customer_can_onboard_as_provider_using_same_account() -> None:
    async with await _get_client() as client:
        categories = (await client.get("/categories")).json()
        cleaning = next(c for c in categories if c["slug"] == "cleaning")
        services = (await client.get(f"/categories/{cleaning['slug']}/services")).json()
        service = services[0]

        email = f"dual-{uuid.uuid4()}@example.com"
        register_response = await client.post(
            "/auth/register",
            json={"email": email, "password": "testpass123", "full_name": "Dual Capability"},
        )
        assert register_response.status_code == 200
        assert register_response.json()["user"]["role"] == "customer"
        token = register_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Not a provider yet.
        not_yet = await client.get("/providers/me", headers=headers)
        assert not_yet.status_code == 404

        onboard_response = await client.post(
            "/providers/me/onboard",
            headers=headers,
            json={
                "phone_primary": "555-1111",
                "address": {
                    "line1": "1 Dual St",
                    "city": "Testville",
                    "state": "TS",
                    "postal_code": "00000",
                    "country": "Testland",
                },
                "services": [{"service_id": service["id"]}],
            },
        )
        assert onboard_response.status_code == 200
        assert onboard_response.json()["services"][0]["status"] == "pending"

        # Role is still customer, but /providers/me now works.
        me_response = await client.get("/providers/me", headers=headers)
        assert me_response.status_code == 200

        # Can't onboard twice.
        duplicate_response = await client.post(
            "/providers/me/onboard",
            headers=headers,
            json={
                "phone_primary": "555-1111",
                "address": {
                    "line1": "1 Dual St",
                    "city": "Testville",
                    "state": "TS",
                    "postal_code": "00000",
                    "country": "Testland",
                },
                "services": [{"service_id": service["id"]}],
            },
        )
        assert duplicate_response.status_code == 409


async def test_admin_provider_list_filters_and_detail_shows_email_and_address() -> None:
    async with await _get_client() as client:
        categories = (await client.get("/categories")).json()
        cleaning = next(c for c in categories if c["slug"] == "cleaning")
        services = (await client.get(f"/categories/{cleaning['slug']}/services")).json()
        service = services[0]

        email = f"admin-list-{uuid.uuid4()}@example.com"
        register_response = await client.post(
            "/providers/register",
            json={
                "email": email,
                "password": "testpass123",
                "full_name": "Filter Test Provider",
                "phone_primary": "555-2000",
                "address": {
                    "line1": "42 Filter Ave",
                    "city": "Testville",
                    "state": "TS",
                    "postal_code": "00000",
                    "country": "Testland",
                },
                "services": [{"service_id": service["id"]}],
            },
        )
        provider_token = register_response.json()["access_token"]
        provider_id = (
            await client.get(
                "/providers/me", headers={"Authorization": f"Bearer {provider_token}"}
            )
        ).json()["id"]

        admin_login = await client.post(
            "/auth/login", json={"email": "admin@homenest.dev", "password": "admin12345"}
        )
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        pending_list = (
            await client.get("/admin/providers?status_filter=pending", headers=admin_headers)
        ).json()
        assert any(p["id"] == provider_id for p in pending_list)

        reviewed_list = (
            await client.get("/admin/providers?status_filter=reviewed", headers=admin_headers)
        ).json()
        assert not any(p["id"] == provider_id for p in reviewed_list)

        detail = (
            await client.get(f"/admin/providers/{provider_id}", headers=admin_headers)
        ).json()
        assert detail["email"] == email
        assert detail["address"]["city"] == "Testville"

        approve_response = await client.post(
            f"/admin/providers/{provider_id}/identity/approve", headers=admin_headers
        )
        assert approve_response.status_code == 200

        pending_list_after = (
            await client.get("/admin/providers?status_filter=pending", headers=admin_headers)
        ).json()
        assert not any(p["id"] == provider_id for p in pending_list_after)

        approved_list = (
            await client.get("/admin/providers?status_filter=approved", headers=admin_headers)
        ).json()
        assert any(p["id"] == provider_id for p in approved_list)
