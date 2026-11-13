import math
import os
import threading
import time
from collections import deque

from fastapi import HTTPException, Request


def _positive_int_from_env(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        parsed = int(value)
    except ValueError as error:
        raise RuntimeError(f"{name} must be a positive integer") from error
    if parsed < 1:
        raise RuntimeError(f"{name} must be a positive integer")
    return parsed


class SlidingWindowRateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[str, deque[float]] = {}
        self._lock = threading.Lock()
        self._next_cleanup = 0.0

    def retry_after(self, key: str, record: bool = True) -> int | None:
        """Seconds until `key` may act again, or None if allowed now.

        With record=False the call only checks; nothing is counted."""
        now = time.monotonic()
        cutoff = now - self.window_seconds
        with self._lock:
            if now >= self._next_cleanup:
                for client_key, timestamps in list(self._requests.items()):
                    while timestamps and timestamps[0] <= cutoff:
                        timestamps.popleft()
                    if not timestamps:
                        del self._requests[client_key]
                self._next_cleanup = now + self.window_seconds

            timestamps = self._requests.setdefault(key, deque())
            while timestamps and timestamps[0] <= cutoff:
                timestamps.popleft()
            if len(timestamps) >= self.max_requests:
                return max(1, math.ceil(self.window_seconds - (now - timestamps[0])))

            if record:
                timestamps.append(now)
            elif not timestamps:
                del self._requests[key]
            return None

    def forget(self, key: str) -> None:
        with self._lock:
            self._requests.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._requests.clear()
            self._next_cleanup = 0.0


prediction_rate_limiter = SlidingWindowRateLimiter(
    max_requests=_positive_int_from_env("PREDICTION_RATE_LIMIT", 10),
    window_seconds=_positive_int_from_env("PREDICTION_RATE_LIMIT_WINDOW_SECONDS", 60),
)


login_rate_limiter = SlidingWindowRateLimiter(
    max_requests=_positive_int_from_env("LOGIN_RATE_LIMIT", 10),
    window_seconds=_positive_int_from_env("LOGIN_RATE_LIMIT_WINDOW_SECONDS", 300),
)


def _login_key(request: Request, email: str) -> str:
    # SY-8: keyed by client IP + account, so one noisy client cannot lock
    # every account and a victim can still sign in from another network.
    client_ip = request.client.host if request.client else "unknown"
    return f"{client_ip}|{email.strip().lower()}"


def ensure_login_allowed(request: Request, email: str) -> None:
    """Refuse the attempt (429) once too many recent attempts FAILED.

    Checked before the password is verified, so a locked-out client learns
    nothing about the password until the window passes."""
    retry_after = login_rate_limiter.retry_after(_login_key(request, email), record=False)
    if retry_after is not None:
        raise HTTPException(
            status_code=429,
            detail="Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.",
            headers={"Retry-After": str(retry_after)},
        )


def record_failed_login(request: Request, email: str) -> None:
    login_rate_limiter.retry_after(_login_key(request, email))


def reset_login_failures(request: Request, email: str) -> None:
    login_rate_limiter.forget(_login_key(request, email))


def limit_prediction_requests(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    retry_after = prediction_rate_limiter.retry_after(client_ip)
    if retry_after is not None:
        raise HTTPException(
            status_code=429,
            detail="Bạn đã vượt quá số lượt dự đoán cho phép. Vui lòng thử lại sau.",
            headers={"Retry-After": str(retry_after)},
        )
