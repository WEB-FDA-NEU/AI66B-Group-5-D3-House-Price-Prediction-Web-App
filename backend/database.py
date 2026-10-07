import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# SQLite khi phát triển ở máy, Postgres khi deploy. Đổi bằng biến môi trường,
# không sửa code. Đây là lý do file .env tồn tại.
DATABASE_URL = os.getenv("DATABASE_URL") or f"sqlite:///{Path(__file__).resolve().parent / 'homeval.db'}"

# Neon/Heroku đưa chuỗi bắt đầu bằng "postgres://", SQLAlchemy 2.x cần "postgresql://".
# Thiếu 3 dòng này là deploy hỏng, và lỗi báo rất khó hiểu.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def _ensure_user_status_column():
    # Lightweight migration for FE-07: existing homeval.db files were created
    # before User.status existed. create_all() never alters tables, so add the
    # column once here instead of requiring a manual DB reset.
    from sqlalchemy import inspect, text
    if "users" not in inspect(engine).get_table_names():
        return
    columns = [c["name"] for c in inspect(engine).get_columns("users")]
    if "status" in columns:
        return
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'Active'"))
        conn.execute(text("UPDATE users SET status='Active' WHERE status IS NULL"))


_ensure_user_status_column()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
