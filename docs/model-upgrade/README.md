# HomeVal: mô hình thật, Premium và quản trị

Bản nâng cấp để team chạy và review từ mã nguồn. Các ZIP và bản nộp M2 cũ không được tạo lại.

## Bàn giao GitHub

Đã chuyển assignee sang **bianh13** cho các issue
[#10](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/10),
[#27](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/27),
[#31](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/31),
[#40](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/40),
[#42](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/42) và
[#48](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/48).
Riêng #31 và #48 chuyển kế hoạch từ Sprint 3 sang Sprint 2; đồng bộ tiêu đề, body, label và trường Sprint trên Project.

Tất cả giữ OPEN / In progress trong lúc team review; board không có trạng thái Review.
Giữ nguyên estimate, priority và credit của các PR cũ; không sửa các issue Sprint 1 đã đóng.
Body từng issue ghi rõ file local tương ứng và chưa có commit/PR cho bản nâng cấp.
Issue #10 còn cần nhóm xác nhận lại tiêu chí mock-only của M2 vì luồng dự đoán đã chuyển sang backend thật.
Kết quả kiểm tra lại project nằm trong `github-handoff.json`.

## Chạy và kiểm tra

Từ thư mục gốc, chạy `python backend/run.py`, mở http://127.0.0.1:8000.
Nếu chưa có dữ liệu: cài `backend/requirements.txt`, chạy `python scripts/download_dataset.py`,
sau đó `python backend/bootstrap.py`. Bootstrap huấn luyện và phát hành ba mô hình lần đầu;
các lần sau bỏ qua thuật toán đã có phiên bản Active.

1. Mở **Về mô hình**: ba thẻ có ưu/nhược điểm, đối tượng phù hợp và bảng sai số đo thật.
2. Không đăng nhập, nhập khu vực Hồ Chí Minh / Bình Thạnh, Nhà phố, 72 m², 3 ngủ, 2 tắm, 2 tầng.
   Khách xem được kết quả Free; lưu kết quả mới yêu cầu đăng nhập.
3. Đăng ký tài khoản riêng hoặc dùng `anh@example.com` / `password123`.
4. Mở **Premium**, thử lần lượt thất bại, hủy và thành công. Chỉ thành công mở gói 30 ngày.
   Tải lại trang để kiểm tra quyền vẫn còn. Không có tiền thật, thẻ hay kết nối ngân hàng.
5. Chọn các mô hình Premium trên form và dùng **So sánh các mô hình** ở trang kết quả.
   Cùng đầu vào được gửi đến từng phiên bản đã phát hành, không nhận trọng số do người dùng cung cấp.
6. Lưu kết quả, mở lịch sử, xem chi tiết và xóa. Bản ghi chỉ thuộc tài khoản đã lưu.
7. Admin: `admin@homeval.vn` / `admin123`, vào **Huấn luyện**. Chọn thuật toán/cấu hình,
   tạo tác vụ, chờ trạng thái hoàn tất, xem phiên bản Validated trước khi phát hành.
8. Phát hành thay phiên bản Active của **cùng thuật toán**. Lưu trữ mô hình Premium làm nó
   rời danh sách dự đoán; không cho lưu trữ bản Free đang dùng nếu chưa có bản thay thế.
9. Chọn Đất nền/Thửa đất: hiển thị rõ chưa đủ dữ liệu; không trả giá giả từ mô hình nhà ở.
10. Mở `/docs` để kiểm tra API, `/how-it-works.html` để xem hướng dẫn/FAQ và
    `/data-sources.html` để xem phạm vi bản đồ và nguồn dữ liệu.

## Dữ liệu và kết quả đã đo

Nguồn gốc: [Vietnam Housing Dataset 2024](https://www.kaggle.com/datasets/nguyentiennhan/vietnam-housing-dataset-2024),
được xác định từ [notebook người dùng cung cấp](https://www.kaggle.com/code/tranngocthienngan/house-price-prediction-dataset-vietnam-2024).
File tải về có 30.229 dòng, 12 cột. Giá CSV theo tỷ VNĐ được đổi sang VNĐ trong API.
Sau làm sạch còn 29.899 dòng; 17.935 train, 5.980 calibration và 5.984 test.

SHA-256 CSV: `7ee188d69aca06349a81bac0c2d2d1503058d5aec7124edfd075154fa87d97c8`.

| Mô hình ban đầu | MAE (tỷ VNĐ) | RMSE (tỷ VNĐ) | R² | MAPE | Sai số ≤20% | Bao phủ khoảng mục tiêu 90% |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Ridge | 1,305 | 1,772 | 0,367 | 25,95% | 54,18% | 89,37% |
| Random Forest | 1,094 | 1,440 | 0,582 | 22,13% | 62,98% | 90,22% |
| Histogram Gradient Boosting | 1,050 | 1,385 | 0,613 | 21,27% | 65,31% | 90,26% |

Giao diện đọc chỉ số của phiên bản đang phát hành từ database, không gán cứng bảng này.
Địa chỉ + đặc trưng cấu trúc tạo nhóm để các mẫu cùng nhóm không lọt sang tập khác.
Preprocessing fit trên train; calibration chỉ hiệu chỉnh khoảng giá; test chỉ đo chỉ số.
Khoảng split conformal dùng residual log và quantile mục tiêu 90%; không phải xác suất đúng
cho một tài sản. Đây không phải kiểm định theo thời gian; không thể khẳng định hiệu quả trên giá năm 2026.

Dataset thiếu ngày giao dịch, tọa độ, ranh thửa và cột loại hình. Lựa chọn căn hộ/nhà phố/biệt thự
được lưu trong lịch sử nhưng không dùng làm đặc trưng huấn luyện. Không có đánh giá riêng các loại hình đó.
Không có mô hình đất được kiểm định. Mức sai số hiện tại còn lớn; Premium không bảo đảm chính xác ở mọi tài sản.

## API và lưu trữ

- Public: `GET /api/models`, `/api/locations`, `/api/map-listings`, `POST /api/predictions`.
- Tài khoản: `/api/auth/register`, `/api/auth/login`, `/api/me`, `/api/me/password`.
- Quyền: `GET /api/me/entitlements`; role được đọc từ database, không tin role phía trình duyệt.
- Lịch sử: `GET/POST /api/me/predictions`, `GET/DELETE /api/me/predictions/{id}`.
  Khi lưu, server xác minh HMAC của bản nháp rồi lấy dữ liệu gốc; giá/đầu vào đã sửa ở client bị bỏ qua.
- Sandbox: `POST /api/billing/checkout`, `POST /api/billing/checkout/{id}/complete`.
  Số tiền lấy từ server; giao dịch kiểm tra chủ sở hữu, chỉ chuyển trạng thái pending một lần,
  lặp lại cùng kết quả không gia hạn thêm; khác kết quả trả 409.
- Admin: `/api/admin/stats`, `/api/admin/models`, `/api/admin/datasets`,
  `POST /api/admin/training`, `GET /api/admin/training/{id}`,
  `POST /api/admin/models/{id}/activate` và `/archive`.

SQLite mặc định `backend/homeval.db`, artifact `backend/artifacts/`, CSV `backend/data/`.
Các file dữ liệu, model, DB và secret local đều không đưa vào Git. Model chỉ do trainer nội bộ tạo;
không nhận pickle/joblib của người dùng. Kiểm tra hash artifact trước inference.

Biến môi trường: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRE_MINUTES`, `CORS_ORIGINS`,
`HOUSING_DATASET_PATH`, `MODEL_ARTIFACT_DIR`, `HOMEVAL_DEMO_BILLING`, `PORT` (local runner).
`run.py` bật sandbox mặc định; dùng `HOMEVAL_DEMO_BILLING=0` để tắt. File `.env` không được nạp tự động.
Chạy một worker: tác vụ huấn luyện dùng BackgroundTasks và khóa trong process, chưa có hàng đợi phân tán.
Nếu tắt máy giữa lúc train, tác vụ có thể dang dở; đây là bản local review, chưa phải hệ thống vận hành production.

## Kiểm chứng

- `python -m pytest backend/tests -q`: 6 bài kiểm tra tích hợp đã qua, dùng DB/artifact riêng.
  Có huấn luyện Ridge thật, publish/archive, kiểm tra tách nhóm, Premium hết hạn, thanh toán idempotent,
  chặn giả role/trọng số, chặn đọc/xóa dữ liệu người khác và bỏ qua giá bị sửa khi lưu.
- `node scripts/model-smoke.mjs`: kiểm tra các trang public desktop/mobile, dự đoán khách,
  ảnh và báo cáo `browser-smoke.json` trong thư mục này.
- `node scripts/model-workflows.mjs`: đăng ký, ba kết quả checkout, so sánh, lưu/xem lịch sử,
  admin huấn luyện/lưu trữ, bảo vệ trang và trạng thái lỗi. Tạo tài khoản QA trong DB local.
  14 luồng đã qua, không có lỗi JavaScript. Chạy tuần tự vì máy review hạn chế RAM.
  Xem kết quả trong `workflow-checks.json`.
- `test:design` và `test:experience` là bộ QA của bản mock trước đây, không phải kiểm chứng backend mới.

## Bản đồ và dữ liệu thửa đất

[Guland](https://guland.vn/) có chức năng tra cứu tờ/thửa, tọa độ và giá rao lân cận;
[Quyhoach.hanoi.vn](https://quyhoach.hanoi.vn/) có giao diện lớp quy hoạch. Chưa xác minh được
API công khai hoặc quyền tái sử dụng dữ liệu ranh thửa từ các trang này; không đồng bộ hay scrape ngầm.

[Geofabrik Việt Nam](https://download.geofabrik.de/asia/vietnam.html) cung cấp bản trích xuất OpenStreetMap
có thể phục vụ đường/công trình/nền bản đồ theo giấy phép nguồn. Nó không thay thế địa chính hoặc giá đất.
Sơ đồ HomeVal vẫn dùng 12 bản ghi minh họa, ghi nhãn rõ. Cần nguồn được cấp quyền cho ranh giới,
thông tin thửa và mẫu giá đất có thời điểm trước khi huấn luyện riêng hoặc tích hợp map zoom trực tiếp.

Hướng giao diện tham khảo cấu trúc tiêu đề lớn, phân tầng nội dung từ [XNOQuant](https://xnoquant.io/).
Finpeace không truy cập được đầy đủ qua công cụ duyệt ở lần kiểm tra này; không sao chép tài sản giao diện.
