# HomeVal — giao diện mới

> Bản nâng cấp hiện tại: [HomeVal V2](../redesign-v2/README.md), có bản đồ demo,
> trang Premium và luồng đất nền/thửa đất. Phần dưới ghi lại đợt thiết kế đầu tiên.

## Chạy tại máy

Từ thư mục gốc dự án, chạy `node scripts/preview.mjs` rồi mở
http://127.0.0.1:4173. Có thể dùng `npm start` nếu npm có sẵn.
Không cần cài thư viện để chạy máy chủ xem trước. Frontend sử dụng ES modules,
vì vậy hãy mở qua máy chủ HTTP thay vì nhấp trực tiếp vào HTML.

## Thiết kế và phạm vi

- Màu xanh ngọc, nền trắng ngà, khoảng cách và hệ thống nút/form thống nhất.
- Trang chủ mới: ảnh kiến trúc, định giá nhanh, khu vực, hướng dẫn, FAQ.
- Biểu mẫu định giá nhận lựa chọn từ trang chủ và cập nhật thẻ tóm tắt ngay khi nhập.
- Đồng bộ kết quả, lịch sử, chi tiết, đăng nhập/đăng ký, hồ sơ, mô hình, quản trị và trang lỗi.
- Menu thu gọn trên điện thoại, hỗ trợ bàn phím, focus rõ ràng, thông báo lỗi gắn với ô nhập,
  và tôn trọng tùy chọn giảm chuyển động.
- Ảnh được lưu trong dự án nên giao diện không cần tải ảnh từ dịch vụ ngoài khi chạy.

Đây vẫn là bản trải nghiệm dữ liệu mô phỏng (`USE_MOCK = true`). Giá dự đoán
đến từ fixture có sẵn, không phải mô hình định giá thực. Thao tác quản trị mô
hình vẫn là mô phỏng. Dữ liệu tài khoản/lịch sử thử nghiệm lưu tại trình duyệt.

## Kiểm tra

`node scripts/design-qa.mjs` hoặc `npm run test:design`.
Kiểm tra cần Playwright 1.63.0 và Google Chrome. Trên máy mới, cài dev dependencies
bằng `npm install` và cài Chrome trước khi chạy kiểm tra.

Bộ kiểm tra xác nhận bố cục ở 360/390/768/1440px, ảnh tải thành công,
menu mobile/FAQ, dữ liệu chuyển từ trang chủ, xác thực biểu mẫu,
khách xem kết quả → đăng nhập → lưu → lịch sử → chi tiết → hủy/xác nhận xóa,
quyền truy cập quản trị và kiểm tra biểu mẫu tải mô hình.
Kết quả: [qa-results.json](qa-results.json). Ảnh chụp giao diện nằm cùng thư mục.

## Tài sản hình ảnh

`frontend/img/hero-house.jpg`: ảnh kiến trúc từ Unsplash,
https://images.unsplash.com/photo-1600607687920-4e2a09cf159d (tải bản rộng 1400px).
Các minh họa khu vực được vẽ bằng CSS; chúng không phải ảnh vị trí thực tế.
Logo/favicon là SVG của dự án. Không dùng font hoặc bộ icon tải từ CDN.

Các bản đóng gói milestone trong `dist/` và `submission-*` là bản cũ;
giao diện mới được phát triển trong `frontend/`.
