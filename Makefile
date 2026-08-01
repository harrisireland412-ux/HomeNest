.PHONY: dev migrate seed test-api test-web lint

dev:
	docker-compose up

migrate:
	docker-compose run --rm api alembic upgrade head

seed:
	docker-compose run --rm api python -m app.db.seed

test-api:
	cd apps/api && uv run pytest

test-web:
	cd apps/web && pnpm test

lint:
	cd apps/api && uv run ruff check .
	cd apps/web && pnpm lint
