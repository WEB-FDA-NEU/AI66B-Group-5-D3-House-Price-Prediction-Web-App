# HomeVal V2 — Property Intelligence

Chạy `node scripts/preview.mjs` từ thư mục gốc, rồi mở http://127.0.0.1:4173.

## Các trang mới

- `index.html`: hero nền tối, điểm nhấn mint, thẻ bản đồ/đất/mô hình và giới thiệu Premium.
- `explore.html`: sơ đồ SVG tương tác, kéo/zoom/phím mũi tên, bộ lọc và danh sách theo vùng nhìn.
- `premium.html`: so sánh Free/Premium dự kiến, lưu quan tâm cục bộ và lộ trình phát triển.
- `predict.html`: nhập nhà ở hoặc đất nền/thửa đất, hoặc nhận thông tin từ tài sản trên bản đồ.

Thiết kế tham khảo nhịp bố cục, màu tối và typography của
[XNOQuant](https://xnoquant.io/), cùng cách phân nhóm nội dung và thẻ của
[FinPeace](https://finpeace.cloud/knowledgebase#investor).
Không sao chép nội dung, logo, mã nguồn hoặc tài sản của hai trang tham khảo.

## Phạm vi đã hoạt động

12 tài sản tổng hợp tại `frontend/mock/map-listings.json`, trong đó có 3 đất nền,
2 thửa đất và 7 nhà/căn hộ/biệt thự. Tọa độ là tọa độ sơ đồ 1200×800, không phải
tọa độ địa lý. Sơ đồ không cung cấp ranh giới địa chính hay quy hoạch thật.

Danh sách và pin được lọc theo vùng nhìn hiện tại. Chọn pin hoặc thẻ rồi bấm
“Định giá tài sản này” sẽ tải bản ghi theo ID vào biểu mẫu. Người dùng được sửa
lại thông tin trước khi gửi. Nguồn bản ghi demo vẫn được lưu để truy vết.

Khi chọn đất: ẩn/vô hiệu hóa thông tin phòng/tầng; bật mặt tiền, đường tiếp cận,
mục đích sử dụng, pháp lý khai báo, số thửa, tờ bản đồ và trạng thái quy hoạch.
Các trường được giữ qua kết quả → đăng nhập → lưu lịch sử → chi tiết.

Giá nhà hiện vẫn đọc fixture có sẵn. Giá đất dùng công thức mô phỏng công khai
trong `api.js`: diện tích × mức đơn giá giả lập theo khu vực, hệ số 0,3 cho đất
nông nghiệp; khoảng giá giả lập ±20%. Mặt tiền, đường và thông tin pháp lý được
lưu nhưng chưa tham gia công thức. Đây không phải mô hình được huấn luyện hoặc
chỉ số tin cậy thống kê. Không dùng các chỉ số của mô hình nhà ở để quảng cáo
độ chính xác cho đất.

## Cải tiến tương lai

| Hạng mục | Hiện tại | Điều kiện để triển khai thật |
| --- | --- | --- |
| Premium | Trang giới thiệu + lưu quan tâm trong trình duyệt | Chốt quyền lợi/giá, backend quản lý gói, thanh toán/webhook, phân quyền ở server |
| Mô hình nâng cao | Lộ trình, chưa có model Premium chạy | Dữ liệu phù hợp, huấn luyện/kiểm định độc lập, công bố sai số từng phân khúc |
| Batdongsan.com.vn | Chưa kết nối; không gọi endpoint hoặc thu thập dữ liệu của bên thứ ba | Tài liệu API/nguồn cấp dữ liệu, quyền sử dụng và thông tin xác thực |
| Bản đồ thực | SVG minh họa với tọa độ cục bộ | Nhà cung cấp bản đồ, geocoding, tọa độ hợp lệ và truy vấn không gian |
| Pháp lý/quy hoạch | Nội dung tự khai báo | Nguồn xác minh và cơ chế cập nhật có xuất xứ |

Đề xuất ranh giới tích hợp: frontend gọi backend của HomeVal với bounding box,
loại hình, bộ lọc và phân trang. Backend giữ khóa nhà cung cấp, chuẩn hóa/khử
trùng lặp tin và trả nguồn cùng thời điểm cập nhật. Debounce khi map ngừng di
chuyển, hủy truy vấn cũ, giới hạn tải và cache theo vùng/zoom. Không đặt khóa
nguồn dữ liệu trong JavaScript trình duyệt. Hiện `getMapListings()` chỉ đọc fixture
và báo chưa cấu hình nếu tắt mock.

## Kiểm chứng

- `node scripts/design-qa.mjs`: luồng nhà ở, tài khoản, lịch sử, quyền quản trị,
  trang mô hình và các trang lỗi.
- `node scripts/experience-qa.mjs`: Premium, map, bộ lọc/rỗng/lỗi/thử lại,
  zoom/kéo/bàn phím, đất nền/thửa đất, chuyển loại tài sản, lưu và mở lại chi tiết.
- Kiểm tra bố cục V2 ở 360, 390, 768, 1024, 1440px; ảnh desktop/mobile và
  `qa-results.json` nằm trong thư mục này.

Nguồn frontend đã cập nhật. Các ZIP milestone cũ chưa được đóng gói lại.
