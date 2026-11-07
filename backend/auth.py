"""Password hashing and JWT helpers."""

from datetime import timedelta
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from backend.config import settings
from backend.utils import utcnow

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def create_access_token(user_id: int, role: str) -> tuple[str, str, object]:
    """Return the token, its id (jti), and the expiry time."""
    expires_at = utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    jti = uuid4().hex
    payload = {
        "sub": str(user_id),
        "role": role,
        "jti": jti,
        "exp": expires_at,
    }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, jti, expires_at


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as exc:
        raise ValueError("Invalid or expired token") from exc
    if not payload.get("sub") or not payload.get("jti"):
        raise ValueError("Invalid or expired token")
    return payload
