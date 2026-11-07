"""Registration, login, logout, and password changes."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.auth import create_access_token, decode_access_token, hash_password, verify_password
from backend.dependencies import bearer_scheme, get_current_user, get_db, revoke_token
from backend.models import CandidateProfile, EmployerProfile, User, UserRole
from backend.schema import (
    ChangePasswordRequest,
    LoginRequest,
    MeResponse,
    MessageResponse,
    RegisterRequest,
    TokenResponse,
    UserOut,
)
from backend.utils import utcnow

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def me_response(user: User) -> MeResponse:
    return MeResponse(
        user=UserOut.model_validate(user),
        candidate_profile=user.candidate_profile,
        employer_profile=user.employer_profile,
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")

    user = User(
        full_name=payload.full_name,
        email=email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        phone_number=payload.phone_number,
        location=payload.location,
        is_active=True,
    )
    db.add(user)
    db.flush()
    if payload.role == UserRole.job_seeker:
        db.add(CandidateProfile(user_id=user.id, is_public=False))
    elif payload.role == UserRole.employer:
        db.add(EmployerProfile(user_id=user.id))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")
    db.refresh(user)
    token, _, _ = create_access_token(user.id, user.role.value)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has been deactivated")
    token, _, _ = create_access_token(user.id, user.role.value)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/logout", response_model=MessageResponse)
def logout(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload = decode_access_token(credentials.credentials)
    expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc).replace(tzinfo=None)
    if expires_at < utcnow():
        expires_at = utcnow()
    revoke_token(db, payload["jti"], expires_at)
    return MessageResponse(message=f"{current_user.full_name} has been logged out")


@router.get("/me", response_model=MeResponse)
def current_account(current_user: User = Depends(get_current_user)):
    return me_response(current_user)


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose a password that is different from the current one")
    current_user.password_hash = hash_password(payload.new_password)
    current_user.updated_at = utcnow()
    db.commit()
    return MessageResponse(message="Password updated")
