"""Băm SHA-256 trước bcrypt để giữ toàn bộ mật khẩu Unicode; hỗ trợ hash cũ khi đăng nhập."""
import os
import secrets
import hashlib
from pathlib import Path
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt, JWTError

def local_secret():
    value = os.getenv("JWT_SECRET")
    if value: return value
    path = Path(__file__).resolve().parent / ".jwt-secret"
    try:
        with path.open("x", encoding="utf-8") as out: out.write(secrets.token_urlsafe(48))
    except FileExistsError:
        pass
    return path.read_text(encoding="utf-8").strip()

SECRET = local_secret()
ALGO = "HS256"
EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

BCRYPT_MAX_BYTES = 72


def _to_bytes(password: str) -> bytes:
    return password.encode("utf-8")[:BCRYPT_MAX_BYTES]


def hash_password(password: str) -> str:
    digest = hashlib.sha256(password.encode("utf-8")).hexdigest().encode()
    return "sha256$" + bcrypt.hashpw(digest, bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        if hashed.startswith("sha256$"):
            return bcrypt.checkpw(hashlib.sha256(password.encode("utf-8")).hexdigest().encode(), hashed[7:].encode())
        return bcrypt.checkpw(_to_bytes(password), hashed.encode())
    except ValueError:
        return False


def create_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGO)


def decode_token(token: str) -> int | None:
    try:
        return int(jwt.decode(token, SECRET, algorithms=[ALGO])["sub"])
    except (JWTError, KeyError, ValueError):
        return None
