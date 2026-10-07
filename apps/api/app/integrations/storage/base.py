from typing import Protocol

from fastapi import UploadFile


class StorageBackend(Protocol):
    async def save(self, file: UploadFile, subdir: str) -> str:
        """Persist the file and return a backend-relative path/key."""
        ...

    def read(self, path: str) -> bytes:
        """Read back the raw bytes for a stored path/key."""
        ...
