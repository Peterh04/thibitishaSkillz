"""Shared FastAPI dependencies for database access and authorization."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from backend.auth import decode_access_token
from backend.database import SessionLocal
from backend.models import RevokedToken, User, UserRole
from backend.utils import utcnow

bearer_scheme = HTTPBearer(auto_error=True)
optional_bearer = HTTPBearer(auto_error=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _user_from_token(db: Session, token: str) -> User:
    try:
        payload = decode_access_token(token)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    revoked = db.query(RevokedToken).filter(RevokedToken.jti == payload["jti"]).first()
    if revoked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked")

    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User is not available")
    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    return _user_from_token(db, credentials.credentials)


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_bearer),
    db: Session = Depends(get_db),
) -> User | None:
    if credentials is None:
        return None
    return _user_from_token(db, credentials.credentials)


def require_roles(*roles: UserRole):
    allowed = set(roles)

    def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return current_user

    return checker


def revoke_token(db: Session, jti: str, expires_at) -> None:
    db.query(RevokedToken).filter(RevokedToken.expires_at < utcnow()).delete()
    if not db.query(RevokedToken).filter(RevokedToken.jti == jti).first():
        db.add(RevokedToken(jti=jti, expires_at=expires_at))
    db.commit()
