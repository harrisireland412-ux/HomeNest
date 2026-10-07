import uuid
from pathlib import Path

from fastapi import UploadFile

UPLOAD_ROOT = Path(__file__).resolve().parents[3] / "uploads"


class LocalStorage:
    def __init__(self, root: Path = UPLOAD_ROOT) -> None:
        self.root = root

    async def save(self, file: UploadFile, subdir: str) -> str:
        target_dir = self.root / subdir
        target_dir.mkdir(parents=True, exist_ok=True)

        suffix = Path(file.filename or "").suffix
        filename = f"{uuid.uuid4()}{suffix}"
        target_path = target_dir / filename

        contents = await file.read()
        target_path.write_bytes(contents)

        return f"{subdir}/{filename}"

    def read(self, path: str) -> bytes:
        return (self.root / path).read_bytes()


storage = LocalStorage()
