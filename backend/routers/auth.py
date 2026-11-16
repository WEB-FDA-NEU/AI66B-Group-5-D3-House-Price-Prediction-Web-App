import hashlib
import httpx
import logging
import secrets
import uuid
from datetime import timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from deps import get_current_user
from models import (
    Checkout, DatasetUpload, EstimateReport, Item, PasswordResetChallenge,
    Prediction, Subscription, TrainingJob, User, utcnow,
)
from password_reset_delivery import deliver_reset_code, delivery_mode, validate_delivery_config
from rate_limit import (
    ensure_login_allowed, ensure_password_reset_allowed, record_failed_login,
    reset_login_failures,
)
from security import hash_password, verify_password, create_token, spend_password_check
import schemas

router = APIRouter(prefix="/api", tags=["auth"])
logger = logging.getLogger(__name__)
RESET_CODE_TTL = timedelta(minutes=15)
RESET_CODE_MAX_ATTEMPTS = 5


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


@router.post("/auth/password-reset/request")
def request_password_reset(
    payload: schemas.PasswordResetRequestIn,
    request: Request,
    db: Session = Depends(get_db),
):
    ensure_password_reset_allowed(request, payload.email)
    response = {
        "message": "Nếu email đã đăng ký, hướng dẫn đặt lại mật khẩu sẽ được gửi.",
        "demo": False,
    }
    try:
        mode = delivery_mode()
        validate_delivery_config(mode)
    except RuntimeError as error:
        logger.error("Password-reset delivery configuration error: %s", error)
        raise HTTPException(503, "Dịch vụ đặt lại mật khẩu chưa được cấu hình.") from error
    response["demo"] = mode == "demo"
    if mode == "development":
        response["message"] = (
            "Nếu email đã đăng ký, mã kiểm thử được in trong terminal của backend."
        )
    elif mode == "demo":
        response["message"] = (
            "Đây là chế độ demo: không gửi email thật. Nếu email đã đăng ký, mã kiểm thử sẽ hiển thị bên dưới."
        )
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None:
        return response

    code = f"{secrets.randbelow(1_000_000):06d}"
    challenge = PasswordResetChallenge(
        id=uuid.uuid4().hex,
        user_id=user.id,
        code_hash=hashlib.sha256(code.encode("ascii")).hexdigest(),
        expires_at=utcnow() + RESET_CODE_TTL,
    )
    db.execute(delete(PasswordResetChallenge).where(
        PasswordResetChallenge.user_id == user.id
    ))
    db.add(challenge)
    db.commit()

    try:
        deliver_reset_code(user.email, code)
    except RuntimeError as error:
        db.delete(challenge)
        db.commit()
        logger.error("Password-reset delivery configuration error: %s", error)
        raise HTTPException(503, "Dịch vụ đặt lại mật khẩu chưa được cấu hình.") from error
    except httpx.HTTPError as error:
        db.delete(challenge)
        db.commit()
        raise HTTPException(502, "Không gửi được email đặt lại mật khẩu. Hãy thử lại sau.") from error

    response["demo"] = mode == "demo"
    if mode == "demo":
        response["demo_code"] = code
        response["message"] = (
            "Đây là chế độ demo: không gửi email thật. Dùng mã kiểm thử hiển thị bên dưới."
        )
    return response


@router.post("/auth/password-reset/confirm")
def confirm_password_reset(
    payload: schemas.PasswordResetConfirmIn,
    request: Request,
    db: Session = Depends(get_db),
):
    ensure_password_reset_allowed(request, payload.email)
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None:
        raise HTTPException(400, "Mã không hợp lệ hoặc đã hết hạn.")
    challenge = db.scalar(
        select(PasswordResetChallenge)
        .where(PasswordResetChallenge.user_id == user.id)
        .order_by(PasswordResetChallenge.created_at.desc())
        .limit(1)
    )
    now = utcnow()
    if challenge is None:
        raise HTTPException(400, "Mã không hợp lệ hoặc đã hết hạn.")
    expires_at = challenge.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now or challenge.attempts >= RESET_CODE_MAX_ATTEMPTS:
        db.delete(challenge)
        db.commit()
        raise HTTPException(400, "Mã không hợp lệ hoặc đã hết hạn.")

    supplied_hash = hashlib.sha256(payload.code.encode("ascii")).hexdigest()
    if not secrets.compare_digest(supplied_hash, challenge.code_hash):
        challenge.attempts += 1
        if challenge.attempts >= RESET_CODE_MAX_ATTEMPTS:
            db.delete(challenge)
        db.commit()
        raise HTTPException(400, "Mã không hợp lệ hoặc đã hết hạn.")

    user.password_hash = hash_password(payload.new_password)
    db.delete(challenge)
    db.commit()
    return {"message": "Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới."}


@router.get("/me/stats")
def profile_stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    saved_count = db.scalar(
        select(func.count()).select_from(Prediction).where(
            Prediction.owner_id == user.id,
            Prediction.saved.is_(True),
        )
    ) or 0
    return {
        "saved_predictions": saved_count,
        "member_since": user.created_at.isoformat(),
    }


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    payload: schemas.DeleteAccountIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == "admin":
        raise HTTPException(403, "Tài khoản quản trị không thể tự xóa.")

    owned_predictions = select(Prediction.id).where(Prediction.owner_id == user.id)
    db.execute(delete(EstimateReport).where(or_(
        EstimateReport.owner_id == user.id,
        EstimateReport.prediction_id.in_(owned_predictions),
    )))
    db.execute(delete(Prediction).where(Prediction.owner_id == user.id))
    db.execute(delete(Checkout).where(Checkout.owner_id == user.id))
    db.execute(delete(Subscription).where(Subscription.user_id == user.id))
    db.execute(delete(PasswordResetChallenge).where(
        PasswordResetChallenge.user_id == user.id
    ))
    db.execute(delete(TrainingJob).where(TrainingJob.owner_id == user.id))
    db.execute(delete(DatasetUpload).where(DatasetUpload.owner_id == user.id))
    db.execute(delete(Item).where(Item.owner_id == user.id))
    db.delete(user)
    db.commit()
