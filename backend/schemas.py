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


# ══════════ Thực thể chính - TODO: đổi theo đề tài ══════════

class ItemCard(BaseModel):
    """Dữ liệu hiển thị trên một thẻ trong danh sách."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    price: int
    cover_url: str
    status: str
    created_at: datetime


class ItemDetail(ItemCard):
    """Thẻ + các trường chỉ có ở trang chi tiết."""
    description: str


class ItemPage(BaseModel):
    """Quy ước phân trang thống nhất cả lớp."""
    items: list[ItemCard]
    total: int
    page: int
    page_size: int


class ItemCreate(BaseModel):
    # TODO: chép ràng buộc từ Section 3 (Business Rules) của Mốc 1 vào đây.
    #       Ví dụ: BR-12 giá từ 1.000 đến 5 tỷ  →  Field(ge=1_000, le=5_000_000_000)
    title: str = Field(min_length=10, max_length=160)
    description: str = Field(min_length=20)
    price: int = Field(ge=0)


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
    phone: str = ""


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
    phone: str = Field(default="", max_length=20)


class ChangePasswordIn(BaseModel):
    current_password: str
    # TODO BR-12: nếu muốn ép "có chữ và số", thêm validator ở đây,
    # đồng thời sửa RegisterIn cho khớp — không được lệch giữa 2 nơi.
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


class ReportIn(BaseModel):
    """Người dùng báo ước tính sai (US-9). Form phía user do #37 đảm nhiệm,
    contract POST /api/reports ở đây để hai bên cùng dùng."""
    model_config = ConfigDict(extra="forbid")
    prediction_id: str | None = Field(default=None, max_length=64)
    expected_price: int = Field(ge=1_000_000, le=1_000_000_000_000)
    comment: str = Field(min_length=1, max_length=1000)


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    owner_id: int
    prediction_id: str | None = None
    expected_price: int
    comment: str
    status: str = "open"
    admin_note: str = ""
    closed_at: datetime | None = None
    closed_by: int | None = None
    created_at: datetime


class AdminReportOut(ReportOut):
    """Hàng báo cáo trên trang admin review (AD-11), kèm người gửi."""
    reporter_email: str = ""
    reporter_name: str = ""


class ReportPage(BaseModel):
    items: list[ReportOut]
    total: int
    page: int
    page_size: int


class AdminReportPage(BaseModel):
    items: list[AdminReportOut]
    total: int
    page: int
    page_size: int


class ReportCloseIn(BaseModel):
    """Đóng báo cáo kèm ghi chú admin (AD-12). note bắt buộc có nội dung."""
    model_config = ConfigDict(extra="forbid")
    note: str = Field(min_length=1, max_length=1000)
