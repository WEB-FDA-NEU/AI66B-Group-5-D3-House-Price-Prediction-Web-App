import logging
import os

import httpx


logger = logging.getLogger(__name__)
RESEND_URL = "https://api.resend.com/emails"


def delivery_mode() -> str:
    mode = os.getenv("HOMEVAL_ENV", "").strip().lower()
    if mode not in {"development", "demo", "production"}:
        raise RuntimeError("HOMEVAL_ENV must be development, demo, or production.")
    return mode


def validate_delivery_config(mode: str | None = None) -> None:
    if (mode or delivery_mode()) == "production":
        if not os.getenv("RESEND_API_KEY", "").strip() or not os.getenv("RESEND_FROM_EMAIL", "").strip():
            raise RuntimeError(
                "Production password reset requires RESEND_API_KEY and RESEND_FROM_EMAIL."
            )


def deliver_reset_code(email: str, code: str) -> str:
    mode = delivery_mode()
    if mode == "development":
        local = email.split("@", 1)[0]
        domain = email.split("@", 1)[-1]
        masked = f"{local[:1]}***@{domain}"
        logger.info("Development password reset code for %s: %s", masked, code)
        return mode
    if mode == "demo":
        return mode

    validate_delivery_config(mode)
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    sender = os.getenv("RESEND_FROM_EMAIL", "").strip()
    public_url = os.getenv("PUBLIC_APP_URL", "").rstrip("/")
    page = f"{public_url}/reset-password.html" if public_url else "reset-password.html"
    try:
        response = httpx.post(
            RESEND_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "from": sender,
                "to": [email],
                "subject": "Mã đặt lại mật khẩu HomeVal",
                "text": (
                    f"Mã đặt lại mật khẩu của bạn là {code}. Mã có hiệu lực trong 15 phút. "
                    f"Mở {page} để hoàn tất. Nếu bạn không yêu cầu, hãy bỏ qua email này."
                ),
            },
            timeout=10,
        )
        response.raise_for_status()
    except httpx.HTTPError as error:
        logger.error("Resend password-reset delivery failed: %s", error)
        raise
    return mode
