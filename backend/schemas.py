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
    email: EmailStr
    phone: str = Field(default="", max_length=20)


class ChangePasswordIn(BaseModel):
    current_password: str
    # TODO BR-12: nếu muốn ép "có chữ và số", thêm validator ở đây,
    # đồng thời sửa RegisterIn cho khớp — không được lệch giữa 2 nơi.
    new_password: str = Field(min_length=8)
