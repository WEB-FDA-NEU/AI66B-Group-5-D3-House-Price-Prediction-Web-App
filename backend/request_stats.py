"""In-process API error counter for the admin dashboard (AD-1).

Counts 5xx responses on /api/* in a rolling 24h window. Single-process
by design: run.py starts one uvicorn worker for local review, so an
in-memory deque is enough. A multi-worker deploy should move this to
Redis or a database table.
"""
from collections import deque
from datetime import datetime, timezone
import threading

WINDOW_SECONDS = 24 * 3600
_MAX_ENTRIES = 500

_lock = threading.Lock()
_errors: deque = deque()  # entries: (timestamp, method, path, status)


def _now():
    return datetime.now(timezone.utc)


def record(method, path, status_code):
    """Record one /api response. Only 5xx counts as a server-side API error."""
    if status_code < 500:
        return
    with _lock:
        _errors.append((_now(), method, path, status_code))
        while len(_errors) > _MAX_ENTRIES:
            _errors.popleft()


def snapshot():
    """Return {'api_errors_24h': int, 'recent_errors': [...]} for /api/admin/stats."""
    cutoff = _now().timestamp() - WINDOW_SECONDS
    with _lock:
        while _errors and _errors[0][0].timestamp() < cutoff:
            _errors.popleft()
        items = list(_errors)
    return {
        "api_errors_24h": len(items),
        "recent_errors": [
            {"at": ts.isoformat(), "method": method, "path": path, "status": status}
            for ts, method, path, status in reversed(items[-5:])
        ],
    }
