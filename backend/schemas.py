"""
Hình dạng JSON đi vào và đi ra.

QUY TẮC: file này phải khớp TỪNG CHỮ với
  - docs/api-contract.md
  - frontend/mock/*.json
Sai một tên trường là frontend vỡ.

VÌ SAO TÁCH KHỎI models.py: bảng users có cột password_hash, nhưng JSON trả ra
internet KHÔNG được có nó. Model nằm trong DB, schema đi ra ngoài.
"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ══════════ Tài khoản - dùng chung mọi đề tài, ít khi phải sửa ══════════

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    display_name: str
    phone: str
    role: str
    email: str
    status: str = "Active"


class AdminUserOut(UserOut):
    """User row on the admin Users screen, with saved-prediction count."""
    prediction_count: int = 0
    created_at: datetime


class AdminUserPage(BaseModel):
    items: list[AdminUserOut]
    total: int
    page: int
    page_size: int


class DatasetPreview(BaseModel):
    """Result of validating an uploaded training CSV (FE-07).
    Stateless: the file is validated and previewed, never promoted to
    training data. Switching the training dataset is out of scope."""
    filename: str
    size_bytes: int
    rows: int
    columns: list[str]
    required_columns: list[str]
    missing_columns: list[str]
    preview: list[dict]


class RegisterIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=2, max_length=80)
    # Same cap as the users.phone column (String(20)) and ProfileUpdateIn;
    # Postgres rejects longer values with a 500 instead of a 422.
    phone: str = Field(default="", max_length=20)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class ProfileUpdateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    display_name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    phone: str = Field(default="", max_length=20)


class ChangePasswordIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    current_password: str
    # Same rule as RegisterIn.password; change both together.
    new_password: str = Field(min_length=8)


class RoleUpdateIn(BaseModel):
    """Đổi vai trò user <-> admin (AD-9). extra=forbid để không lọt trường lạ."""
    model_config = ConfigDict(extra="forbid")
    role: Literal["admin", "user"]


class DatasetUploadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    filename: str
    stored_filename: str
    size_bytes: int
    rows: int
    columns: list[str]
    missing_columns: list[str]
    owner_id: int
    created_at: datetime


class AdminDatasetUploadOut(DatasetUploadOut):
    uploader_email: str = ""


class DatasetUploadPage(BaseModel):
    items: list[AdminDatasetUploadOut]
    total: int


class EstimateReportCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    prediction_id: str = Field(min_length=1, max_length=64)
    draft_token: str = Field(min_length=1, max_length=128)
    expected_price: int = Field(ge=1, le=1_000_000_000_000)
    comment: str = Field(min_length=10, max_length=1000)


class EstimateReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    prediction_id: str
    estimated_price: int
    expected_price: int
    comment: str
    property_snapshot: dict
    created_at: datetime


class EstimateReportPage(BaseModel):
    items: list[EstimateReportOut]
    total: int


class AdminEstimateReportOut(EstimateReportOut):
    """Hàng báo cáo trong hàng đợi duyệt của admin (AD-11)."""
    owner_id: int
    status: str = "open"
    admin_note: str = ""
    closed_at: datetime | None = None
    closed_by: int | None = None
    reporter_email: str = ""
    reporter_name: str = ""


class AdminEstimateReportPage(BaseModel):
    items: list[AdminEstimateReportOut]
    total: int
    page: int
    page_size: int


class EstimateReportCloseIn(BaseModel):
    """Đóng báo cáo kèm ghi chú admin (AD-12). note bắt buộc có nội dung."""
    model_config = ConfigDict(extra="forbid")
    note: str = Field(min_length=1, max_length=1000)
