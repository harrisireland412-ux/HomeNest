# HomeNest Architecture

HomeNest is an original, Urban-Company-style home-services marketplace. This document summarizes the architecture and phased roadmap. See `requirements.txt` at the repo root for the full original product/feature spec.

## Stack

- **Backend**: FastAPI (async), SQLAlchemy 2.0 (async) + PostgreSQL, Redis, Celery for background jobs, native FastAPI WebSockets for chat/live-tracking.
- **Frontend**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zustand, React Hook Form + Zod, Framer Motion, react-leaflet.
- **Infra**: Docker Compose (local dev), GitHub Actions CI, nginx reverse proxy. Kubernetes/Terraform deferred to the Enterprise phase.

## Monorepo layout

Two independent stacks glued by Docker Compose and a root Makefile — not a single Turborepo/Nx graph, since Turborepo's build graph doesn't extend to Python.

```
homenest/
├── apps/
│   ├── web/     # Next.js — customer + provider portals (role-grouped routes)
│   ├── admin/    # Next.js — admin dashboard (separate app; added once auth+catalog exist)
│   └── api/       # FastAPI — single backend for web/admin/provider
├── packages/       # JS/TS only: ui, types (generated from OpenAPI), config, utils
├── infra/{docker,nginx}/
├── docs/
├── .github/workflows/
├── docker-compose.yml
└── Makefile
```

`apps/api` has its own `pyproject.toml`, venv, ruff/mypy/pytest config — fully independent of the JS tooling. `packages/types` will be generated from FastAPI's `/openapi.json` (via `openapi-typescript`) once the frontend has enough surface to need it, rather than hand-written.

## Backend architecture (FastAPI)

Clean-architecture layering: **routers** (HTTP) → **services** (business logic) → **repositories** (DB access) → **models** (SQLAlchemy).

```
apps/api/app/
├── main.py, core/{config,security,logging,middleware,exceptions}.py
├── db/{base,session}.py, db/migrations/ (Alembic, async env.py)
├── models/           # identity, provider, catalog, address, booking, payment, wallet, review, chat, notification, promo, audit, cms
├── schemas/          # Pydantic DTOs mirroring models
├── repositories/      # one per aggregate
├── services/          # BookingService, PaymentService, WalletService, KYCService...
├── routers/           # auth, users, providers, bookings, payments, notifications, reviews, wallet, coupons, subscriptions, admin, analytics, chat, maps
├── ws/                # connection_manager, chat.py, tracking.py
├── workers/            # Celery app + tasks
├── integrations/       # payments (Stripe/Razorpay/PayPal abstraction), notifications, storage, maps, oauth
└── deps.py             # get_current_user, require_role, pagination
```

Data model entities (SQLAlchemy + Alembic, UUID PKs, timestamps + soft-delete): Users/Roles/Sessions/OAuth/OTP, Provider/KYC/BankAccount/Availability/ServiceArea, Category/Service/Variant/Pricing, Address, Booking/BookingItem/StatusHistory, Payment/Refund/Invoice/Payout/Transaction, Wallet/LoyaltyPoint, Review/ReviewMedia, ChatThread/Message, Notification/DeviceToken, Coupon/Membership/Subscription, AuditLog, CMS.

Redis backs Celery (broker), response caching, and rate limiting. Payments go through a `PaymentGateway` Protocol so Stripe/Razorpay/PayPal are interchangeable.

## Frontend architecture (Next.js)

Two Next.js apps, not three: `apps/web` combines customer + provider portals via route groups (`(customer)`, `(provider)`, `(public)`, `(auth)`) gated by middleware reading role from the JWT. `apps/admin` stays separate — different security posture, different bundle, independent deploy cadence.

## Auth

Custom-built JWT (15min access + 30d refresh, refresh tokens hashed and stored server-side for revocation), role-based access control (customer/provider/admin/support), email + phone OTP, Google/Apple OAuth. Frontend stores the access token in an HTTP-only cookie set by the API — not localStorage.

## Phased roadmap

- **MVP**: monorepo scaffold + Docker Compose dev env. Auth (customer/provider/admin, email OTP, JWT+refresh, Google OAuth). Catalog with the spec's ~25 categories. Linear booking flow with a mock payment gateway. Manual admin KYC approval. Minimal admin dashboard.
- **V1**: real Stripe payments, wallet, reviews, Celery-driven notifications, real provider KYC (document upload), search/filter, Apple OAuth, real booking timeline with OTP verification, GST invoices.
- **V2**: realtime chat + live tracking over WebSockets, coupons/referrals, subscriptions/memberships, analytics dashboards, recurring/group booking types, support-staff role.
- **Enterprise**: AI features (recommendations, fraud detection, dynamic pricing, chatbot), full multi-gateway payments, Kubernetes + Terraform, full observability, security hardening (GDPR, OWASP, enforced 2FA).

Full detail for each phase lives in the session plan history; this file is the living summary and should be updated as the implementation progresses.
