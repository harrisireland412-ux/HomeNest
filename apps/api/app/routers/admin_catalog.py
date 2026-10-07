import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import require_role
from app.models.user import UserRole
from app.repositories.catalog_repository import ServiceRepository
from app.schemas.catalog import ServiceRead, ServiceUpdate

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_role(UserRole.admin))],
)


@router.patch("/services/{service_id}", response_model=ServiceRead)
async def update_service(
    service_id: uuid.UUID,
    data: ServiceUpdate,
    db: AsyncSession = Depends(get_db),
) -> ServiceRead:
    service = await ServiceRepository(db).get_by_id(service_id)
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")

    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(service, field, value)

    await db.commit()
    await db.refresh(service)
    return ServiceRead.model_validate(service)
