from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import (
    admin_catalog,
    admin_providers,
    auth,
    bookings,
    catalog,
    cms,
    health,
    provider_onboarding,
    providers,
)

app = FastAPI(title="HomeNest API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(catalog.router)
app.include_router(providers.router)
app.include_router(cms.router)
app.include_router(auth.router)
app.include_router(provider_onboarding.router)
app.include_router(admin_providers.router)
app.include_router(admin_catalog.router)
app.include_router(bookings.router)
