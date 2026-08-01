from fastapi import APIRouter, Depends
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(db: AsyncSession = Depends(get_db)) -> dict:
    db_ok = False
    redis_ok = False

    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    redis_client = Redis.from_url(settings.redis_url)
    try:
        redis_ok = await redis_client.ping()
    except Exception:
        redis_ok = False
    finally:
        await redis_client.aclose()

    return {"status": "ok", "db": db_ok, "redis": redis_ok}
