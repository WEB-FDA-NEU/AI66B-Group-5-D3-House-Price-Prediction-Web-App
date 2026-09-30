# UX polish — 30/09/2026

Tiếp tục trên `D:\Kỳ 5\Web Design and Programming`. Chưa commit/push; không thay đổi issue/credit trong lượt chỉnh UI này.

## Lỗi quận/huyện và cách khắc phục

Trước đây `predict.js` chờ chung `getLocations`, `getModels` và `getEntitlements` trong một `Promise.all`.
Khi quyền tài khoản trả 401 do token hết hạn, toàn bộ đoạn điền tỉnh/thành và quận/huyện không được chạy.
Backend ngừng chạy hoặc truy cập từ Live Server 5500 ngoài danh sách CORS cũng khiến việc khởi tạo thất bại.

Đã tách lỗi theo từng nguồn. Danh mục 19 tỉnh/thành từ dữ liệu huấn luyện 2024 xuất hiện ngay khi mở trang,
sau đó cập nhật độc lập từ API. `frontend/js/location-snapshot.js` là snapshot của `/api/locations`,
không phải danh mục hành chính toàn quốc hiện hành. Hồ Chí Minh có 30 giá trị khu vực trong nguồn,
bao gồm các cách viết khác nhau của cùng khu vực. Chưa tự gộp tên để tránh đổi mã đầu vào của mô hình.

Phiên hết hạn được xóa và trở về chế độ khách, cho phép dự đoán Free thật. Mất kết nối vẫn nhập được
thông tin và chọn khu vực; nút định giá tạm khóa đến khi dịch vụ sẵn sàng. Có thông báo tại chỗ,
nút Thử kết nối lại và tự thử khi trình duyệt online trở lại. Request có giới hạn chờ 15 giây.
CORS local bổ sung localhost/127.0.0.1:5500, bên cạnh 4173.

## Premium ngay trong định giá

- Thẻ mô hình hiển thị trạng thái Free/Premium và MAE đo được.
- Chạm mô hình khóa hoặc nút Khám phá Premium mở dialog dạng bảng trượt bên phải; mobile là bảng từ cạnh dưới.
- Nêu quyền lợi, giá thử và trạng thái sandbox rõ ràng; không tự bật popup hoặc tự tạo giao dịch khi chỉ mở bảng.
- Khách đi đăng nhập rồi quay lại đúng form. Dữ liệu tài sản lưu tạm trong sessionStorage của tab trong 24 giờ.
- Thanh toán thử ngay trong bảng, có thành công/thất bại/hủy. Thành công mở khóa mô hình mà không tải lại trang.
- Đóng khi còn giao dịch pending sẽ gửi hủy; Escape và focus trap dùng native dialog.
- Phân quyền và giá giao dịch vẫn do API kiểm tra. Premium không mở quyền sửa tham số hay trọng số.

## Chữ và chuyển động

Chữ “Nhiều” đúng Unicode nhưng phần teaser dùng Georgia italic khác font chính, với tracking hẹp.
Đã thay bằng font chính, bỏ italic, nới tracking/line-height và chuẩn hóa nội dung HTML sang NFC.

Tham khảo cách tổ chức theo nhu cầu và lời mời hành động ở
[Techcombank cá nhân](https://techcombank.com/khach-hang-ca-nhan), áp dụng vào thiết kế HomeVal:
ba slide Mua để ở / Đầu tư / Hiểu mô hình; nút trước/sau, bàn phím và vuốt ngang trên ảnh.
Không autoplay. Các khối nội dung xuất hiện nhẹ một lần khi vào vùng nhìn; không bị ẩn nếu JS lỗi.
Tôn trọng `prefers-reduced-motion`, không giữ nội dung chờ hoạt ảnh. Nút có phản hồi hover/pressed và focus rõ.

## Kiểm tra

`npm run test:ux` (server đang chạy tại http://127.0.0.1:8000) kiểm tra các tình huống hồi quy:
dropdown phụ thuộc, token hết hạn, API lỗi và phục hồi, dữ liệu sau đăng nhập, thanh toán inline,
giữ form, mô hình mở khóa, drawer/mobile không tràn ngang, bàn phím và giảm chuyển động.
Kết quả: `checks.json`; ảnh desktop/mobile nằm cạnh tài liệu này.

Để xem: mở `/index.html` và `/predict.html`. Nếu trình duyệt đang giữ CSS cũ, tải lại bằng Ctrl+F5.
Quy trình dữ liệu và giới hạn mô hình vẫn theo [bản backend](../model-upgrade/README.md).
