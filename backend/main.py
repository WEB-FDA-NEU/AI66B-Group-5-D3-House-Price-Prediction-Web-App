import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import Depends

from database import Base, engine, get_db
from models import Item
from routers import auth, homeval
from request_stats import record

Base.metadata.create_all(engine)   # Mốc 3 dùng tạm. Dự án thật dùng Alembic migration.

app = FastAPI(
    title="HomeVal API",
    version="1.0.0",
    description="Dự đoán từ Vietnam Housing Dataset 2024, quản trị mô hình và thanh toán sandbox.",
)

# CORS chỉ cần khi frontend chạy ở cổng khác (lúc phát triển: Live Server 5500).
# Khi deploy, FastAPI serve luôn frontend nên cùng origin, không cần CORS.
origins = os.getenv("CORS_ORIGINS", "http://localhost:4173,http://127.0.0.1:4173,http://localhost:5500,http://127.0.0.1:5500").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(homeval.router)
# TODO: thêm router của các thành viên khác ở đây


@app.middleware("http")
async def count_api_errors(request, call_next):
    # AD-1: feed the "Lỗi API 24h" card on the admin dashboard.
    # Unhandled crashes never produce a response, so record them as 500 here.
    if not request.url.path.startswith("/api"):
        return await call_next(request)
    try:
        response = await call_next(request)
    except Exception:
        record(request.method, request.url.path, 500)
        raise
    record(request.method, request.url.path, response.status_code)
    return response


@app.get("/api/health", tags=["ops"])
def health():
    return {"status": "ok", "runtime": "trained", "sandbox_billing": os.getenv("HOMEVAL_DEMO_BILLING") == "1"}


# ---- Serve frontend (Mốc 4) --------------------------------------------
# Đặt CUỐI CÙNG, sau tất cả router API. Nếu mount ở trên thì "/" nuốt hết
# và mọi request /api/... sẽ ra 404.
UPLOADS = Path(__file__).resolve().parent / "uploads"
UPLOADS.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS), name="uploads")

FRONTEND = Path(__file__).resolve().parent.parent / "frontend"
if FRONTEND.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND, html=True), name="frontend")
