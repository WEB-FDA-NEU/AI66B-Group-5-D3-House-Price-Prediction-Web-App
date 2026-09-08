# 01 — Template chung cho tất cả các nhóm

Bộ khung dùng **xuyên suốt môn học**, từ Mốc 2 đến Mốc 4. Mọi nhóm bắt đầu từ đây.

Muốn xem một bản đã hoàn chỉnh trông ra sao → mở **`../02-mau-reloop/`**.

## Bắt đầu (Tuần 4)

### 1. Tạo repo của nhóm

```bash
cp -r 01-template-chung  <ten-nhom>
cd <ten-nhom>
git init && git add -A && git commit -m "khởi tạo từ template"
```

### 2. Tìm và thay 3 thứ

| Tìm                       | Thay bằng                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `TÊN-SẢN-PHẨM`            | Tên sản phẩm của nhóm                                                                           |
| `Item` / `item` / `items` | Thực thể chính: `Listing` · `Concert` · `Homestay` · `Pitch` · `Recipe` · `Post` · `Prediction` |
| Mọi chỗ có `TODO:`        | Nội dung của đề tài                                                                             |

```bash
grep -rn "TODO:" --include="*.js" --include="*.py" --include="*.html" --include="*.md" .
```

### 3. Chạy thử

**Frontend** (Mốc 2 — chưa cần backend)

```bash
cd frontend && python3 -m http.server 5500
```

→ http://localhost:5500

> ⚠️ **KHÔNG double-click file HTML.** Giao thức `file://` chặn ES module và `fetch`.
> VS Code: cài **Live Server**, bấm _Go Live_.

**Backend** (Mốc 3)

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python seed.py
uvicorn main:app --reload --port 8000
```

→ API http://localhost:8000/api/items · **Docs http://localhost:8000/docs**
Tài khoản mẫu: `user@example.com` / `password123`

Chưa cần cài PostgreSQL — để trống `DATABASE_URL` thì tự dùng SQLite.

**Nối** (Mốc 4): sửa **một dòng** trong `frontend/js/config.js` → `USE_MOCK = false`

---

## Cấu trúc

```
frontend/
  index.html      trang chủ                 ← khung, sửa theo đề tài
  shop.html     ★ LAYOUT ĐẦY ĐỦ            ← header · breadcrumb · sidebar lọc ·
                                              toolbar · lưới · phân trang · footer
  list.html       danh sách + bộ lọc        ← bản gọn của shop.html
  detail.html     chi tiết một bản ghi      ← MẪU cho mọi trang chi tiết
  login.html  register.html  404.html
  css/
    reset.css        chuẩn hoá trình duyệt
    tokens.css     ★ MÀU + KHOẢNG CÁCH — sửa ở đây, không sửa chỗ khác
    layout.css       header, container, lưới
    components.css   card, button, field, empty, toast, dialog, thumb
  js/
    config.js      ★ FILE DUY NHẤT ĐỔI GIỮA MỐC 2 VÀ MỐC 4
    api.js         ★ nơi DUY NHẤT được viết fetch() — đã chia vùng theo người
    render.js        JSON → DOM bằng cách clone <template>
    ui.js            skeleton / empty / error / toast / confirm / lỗi form
    auth.js          token, header auth-aware, login branch
    components/      site-header.js · site-footer.js
                     ← viết MỘT LẦN, dùng <site-header> / <site-footer> ở mọi trang
    pages/           home.js · shop.js · list.js · detail.js · login.js · register.js
  mock/            dữ liệu giả — PHẢI đúng hình dạng API thật
  vendor/          thư viện tải về (KHÔNG dùng CDN)

backend/
  main.py        app, CORS, gắn router, serve frontend
  database.py    engine + session (SQLite khi dev, Postgres khi deploy)
  models.py    ★ bảng — cả nhóm ngồi cùng làm ở Tuần 6
  schemas.py   ★ hình dạng JSON — phải khớp mock/*.json
  security.py    băm mật khẩu (bcrypt), JWT
  deps.py        get_db, get_current_user, get_admin
  routers/       auth.py, items.py
  seed.py        dữ liệu mẫu — BẮT BUỘC cóxs
```

---

## Layout mẫu: `shop.html`

Trang tham chiếu có đủ các vùng của một trang thương mại điện tử cơ bản.
Copy từng vùng sang màn hình của nhóm — mọi đề tài đều dùng lại được:
danh sách vé concert, homestay, sân bóng, công thức, bài đăng…

```
┌──────────────────────────────────────────────┐
│  <site-header active="shop">                 │  logo · tìm kiếm · nav · tài khoản
├──────────────────────────────────────────────┤
│  Trang chủ › Cửa hàng › Điện tử              │  breadcrumb
├───────────────┬──────────────────────────────┤
│ SIDEBAR       │  [Bộ lọc] (chỉ hiện mobile)  │
│  từ khoá      │  12 sản phẩm      Sắp xếp ▾  │  toolbar
│  danh mục     │  ┌────┐┌────┐┌────┐          │
│  khoảng giá   │  │thẻ ││thẻ ││thẻ │          │  lưới tự xuống dòng
│  [Áp dụng]    │  └────┘└────┘└────┘          │
│  [Xoá bộ lọc] │      ‹ 1  2  ›               │  phân trang
├───────────────┴──────────────────────────────┤
│  <site-footer>                               │  4 cột + dòng bản quyền
└──────────────────────────────────────────────┘
```

Điểm đáng học trong `js/pages/shop.js`:
- **Bộ lọc lưu trong URL**, không trong biến — nút Back chạy đúng, copy link ra đúng kết quả
- **Sidebar trên mobile** mở/đóng bằng 3 dòng JS (`classList.toggle`), không thư viện
- **Phân trang** dựng bằng `createElement`, có `aria-current`, nút đầu/cuối tự vô hiệu hoá
- **Giá khuyến mãi**: thẻ tự hiện giá gạch + nhãn `-30%` khi bản ghi có `price_old`
- Đủ **4 trạng thái**: đang tải · rỗng · lỗi · có dữ liệu

## Bốn quy tắc không được phá

1. **Chỉ `api.js` được gọi `fetch()`**
2. **Markup ở `<template>` trong HTML, không ở chuỗi JS**
3. **Điền dữ liệu bằng `textContent`, KHÔNG BAO GIỜ `innerHTML`**
4. **Màu và khoảng cách ở `tokens.css`, không hardcode**
