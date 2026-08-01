# HomeNest

Home-services marketplace platform (Urban Company-style) — original build, not affiliated with or copying any proprietary product.

- **Backend**: `apps/api` — FastAPI, SQLAlchemy (async), PostgreSQL, Redis, Celery.
- **Frontend**: `apps/web` — Next.js 15, React, TypeScript, Tailwind, shadcn/ui.
- **Admin**: `apps/admin` — added once auth + catalog exist.

See [docs/architecture.md](docs/architecture.md) for the full architecture and phased roadmap (MVP → V1 → V2 → Enterprise).

## Local development

Prerequisites: Docker Desktop, Node.js 20 (`nvm use 20`), `pnpm`, Python 3.12 + `uv`.

```bash
make dev      # docker-compose up
make migrate  # run Alembic migrations
make seed     # seed dev data
make test-api # run backend tests
make test-web # run frontend tests
make lint     # lint both stacks
```

Once running:
- Web: http://localhost:3000
- API: http://localhost:8000 (docs at `/docs`)
- Via nginx: http://localhost
