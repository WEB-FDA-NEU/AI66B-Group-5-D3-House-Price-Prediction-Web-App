from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from deps import get_current_user
from models import User
from rate_limit import ensure_login_allowed, record_failed_login, reset_login_failures
from security import hash_password, verify_password, create_token, spend_password_check
import schemas

router = APIRouter(prefix="/api", tags=["auth"])


@router.post("/auth/register", response_model=schemas.TokenOut, status_code=status.HTTP_201_CREATED)
def register(payload: schemas.RegisterIn, db: Session = Depends(get_db)):
    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        display_name=payload.display_name,
        phone=payload.phone,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # Ràng buộc UNIQUE ở database mới là thứ chặn thật.
        # Kiểm tra bằng SELECT trước rồi INSERT sau vẫn lọt khi 2 request đến cùng lúc.
        db.rollback()
        raise HTTPException(409, "Email này đã được đăng ký.")
    db.refresh(user)
    return {"access_token": create_token(user.id), "user": user}


@router.post(
    "/auth/login",
    response_model=schemas.TokenOut,
    responses={429: {"description": "Too many failed attempts",
                     "headers": {"Retry-After": {"schema": {"type": "integer"}}}}},
)
def login(payload: schemas.LoginIn, request: Request, db: Session = Depends(get_db)):
    ensure_login_allowed(request, payload.email)
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None:
        # SY-8: tốn đúng một lần bcrypt như email có thật, để thời gian phản hồi
        # không tiết lộ email nào tồn tại.
        spend_password_check(payload.password)
    if user is None or not verify_password(payload.password, user.password_hash):
        # Cùng một thông điệp cho cả hai trường hợp - không tiết lộ email nào tồn tại.
        record_failed_login(request, payload.email)
        raise HTTPException(401, "Email hoặc mật khẩu không đúng.")
    if (user.status or "Active") != "Active":
        # Tài khoản bị vô hiệu hoá: cùng message 401, không tiết lộ thêm.
        raise HTTPException(401, "Email hoặc mật khẩu không đúng.")
    reset_login_failures(request, payload.email)
    return {"access_token": create_token(user.id), "user": user}


@router.get("/me", response_model=schemas.UserOut)
def me(user: User = Depends(get_current_user)):
    return user

@router.patch("/me", response_model=schemas.UserOut)
def update_profile(
    payload: schemas.ProfileUpdateIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    user.display_name = payload.display_name
    if payload.email.lower() != user.email.lower():
        existing = db.scalar(select(User).where(User.email == payload.email.lower()))
        if existing is not None:
            raise HTTPException(409, "Email này đã được đăng ký.")
        user.email = payload.email.lower()
    user.phone = payload.phone
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Email này đã được đăng ký.")
    db.refresh(user)
    return user


@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: schemas.ChangePasswordIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, user.password_hash):
        # KHÔNG tiết lộ thêm gì khác - cùng logic với login()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Mật khẩu hiện tại không đúng.")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
