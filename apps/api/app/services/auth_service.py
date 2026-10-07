from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserCreate


class EmailAlreadyRegisteredError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class AuthService:
    def __init__(self, user_repo: UserRepository) -> None:
        self.user_repo = user_repo

    async def register(self, data: UserCreate) -> tuple[User, str]:
        existing = await self.user_repo.get_by_email(data.email)
        if existing is not None:
            raise EmailAlreadyRegisteredError

        user = User(
            email=data.email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            phone=data.phone,
            role=data.role,
        )
        self.user_repo.add(user)
        await self.user_repo.db.flush()
        token = create_access_token(user.id, user.role.value)
        return user, token

    async def authenticate(self, email: str, password: str) -> tuple[User, str]:
        user = await self.user_repo.get_by_email(email)
        if user is None or not verify_password(password, user.hashed_password):
            raise InvalidCredentialsError
        token = create_access_token(user.id, user.role.value)
        return user, token

    async def register_provider(self, data: UserCreate) -> tuple[User, str]:
        data = data.model_copy(update={"role": UserRole.provider})
        return await self.register(data)
