# Rà soát toàn dự án — 01/10/2026

Đối chiếu clone chính trong `Semester 5` và [main `261eef2`](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/commit/261eef2e8bd31317003cefdccbf49688a245c138) với toàn bộ 51 issue. Đây là kiểm tra mã nguồn, bằng chứng QA đã công bố và trạng thái GitHub; không phải một đợt kiểm thử production mới.

| Phân loại | Số issue | Trạng thái GitHub / Project |
| --- | ---: | --- |
| Đã hoàn thành trong phạm vi được ghi rõ | 21 | Closed / Done, assignee `bianh13` |
| Còn thiếu chức năng hoặc bằng chứng nghiệm thu | 12 | Open / In progress |
| Chưa triển khai | 18 | Open / Todo |

Đã chuyển thêm 13 issue hoàn thành về `bianh13`: #11, #12, #13, #15, #17, #18, #20, #23, #25, #26, #28, #29, #30.
Theo yêu cầu của nhóm trưởng, mở lại 8 issue chưa đủ phạm vi: #1, #6, #8, #9, #16, #19, #22, #24.
Assignee của các việc chưa hoàn thành được giữ nguyên. Các issue Sprint 1 giữ nguyên Sprint 1; không sửa estimate, priority, tác giả commit hay credit của PR cũ.

Không có thêm issue Sprint 3 đủ điều kiện chuyển Sprint 2: #49 (xuất CSV) và #50 (đổi quyền admin) chưa triển khai. #31 và #48 đã được chuyển về Sprint 2 ở lần bàn giao trước.

## Những chức năng đã có trong bản đã upload

- Giao diện desktop/mobile, chuyển slide, hiệu ứng cuộn, FAQ và luồng nâng cấp Premium ngay trong form định giá.
- Đăng ký, đăng nhập, đổi mật khẩu; phân quyền người dùng/admin và kiểm tra quyền sở hữu dữ liệu ở backend.
- Dự đoán cho khách chưa đăng nhập, chọn tỉnh/thành và quận/huyện trong phạm vi dữ liệu; kết quả kèm khoảng ước tính, phiên bản mô hình và giới hạn sử dụng.
- Ba mô hình huấn luyện từ Vietnam Housing Dataset 2024: Ridge, Random Forest và Histogram Gradient Boosting; công bố sai số, ưu/nhược điểm và nguồn dữ liệu.
- Lưu kết quả kèm nhãn, xem chi tiết và xóa có xác nhận. Lịch sử hiện mới hiển thị tối đa 50 dòng trên giao diện; phân trang đầy đủ còn thiếu.
- Thanh toán Premium giả lập thành công/thất bại/hủy; người dùng Premium chọn mô hình và so sánh các mô hình trên cùng đầu vào, không được thay trọng số hoặc huấn luyện.
- Admin huấn luyện, xem tác vụ/metrics, phát hành, khôi phục và lưu trữ phiên bản; một phiên bản Active cho mỗi thuật toán. Có thống kê dataset và liên kết model–dataset.
- API FastAPI, SQLite, tài liệu `/docs`, giao diện 404/500 và các trạng thái rỗng của danh sách đã triển khai.

## Các giới hạn cần phân biệt

Giá dự đoán dựa trên giá rao năm 2024. Chưa có dữ liệu giao dịch trực tiếp, API batdongsan.com, ranh thửa/quy hoạch hoặc mô hình định giá đất được kiểm định. Bản đồ là demo; các trường đất nền/thửa đất chưa đồng nghĩa với dự đoán đất thật. Thanh toán hiện là sandbox.

So sánh các mô hình chưa đáp ứng #36 (so sánh 2–3 dự đoán đã lưu). Huấn luyện từ CSV cố định chưa đáp ứng #41 (upload CSV/kiểm tra cột/preview), cũng không phải chức năng upload file mô hình cũ của #24. Đăng nhập không đồng nghĩa đã có đổi email, reset mật khẩu hay xóa tài khoản.

## Bằng chứng

[PR #74](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/pull/74) đã được `nguyentue110` approve và nhóm trưởng merge. Các chỉnh sửa lịch sử sau đó chỉ đổi thông điệp commit, giữ nguyên tree mã nguồn.
6 kiểm thử backend đã qua sau tích hợp; 14 luồng mô hình và 10 luồng UX có báo cáo trong [model-upgrade](../model-upgrade/README.md) và [ux-polish](../ux-polish/README.md).
Các checklist phát hành/ZIP chưa có đủ bằng chứng riêng vẫn được giữ là chưa hoàn tất ở #8; không suy diễn từ một lần approve PR.

## Đối chiếu từng issue

Các issue lớn và issue nhỏ có thể trùng phạm vi; số issue không phải số tính năng độc lập.

| Issue | Kết quả audit | Assignee | Sprint | Phạm vi đã kiểm tra / phần còn thiếu |
| --- | --- | --- | --- | --- |
| [#1](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/1) | Còn thiếu / chưa đủ bằng chứng | hai291 | Sprint 1 | Public pages and shared design are implemented, but the original scope includes a home-page model-accuracy summary; current home links to metrics instead of loading them. |
| [#2](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/2) | Còn thiếu / chưa đủ bằng chứng | VuSiSi | Sprint 2 | Guest prediction, result and validation are implemented. The full original form/quota-state scope is not complete; the current upgrade requires the backend. |
| [#3](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/3) | Chưa triển khai | bianh13 | Sprint 2 | Feature-contribution charts, market insights and saved-estimate comparison are absent. Premium model comparison is a different feature. |
| [#4](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/4) | Còn thiếu / chưa đủ bằng chứng | pham-ha-gif | Sprint 2 | Profile name/phone/password and saved-result flows work. Email editing, account deletion, complete history controls and saved-estimate comparison remain missing. |
| [#5](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/5) | Còn thiếu / chưa đủ bằng chứng | nguyentue110 | Sprint 2 | Dashboard, model training/list/publication/archive and error pages exist. Dataset CSV upload/preview and user-management screens are missing. |
| [#6](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/6) | Còn thiếu / chưa đủ bằng chứng | pham-ha-gif | Sprint 1 | Registration/login work, but the larger epic also requires a password-strength indicator and terms checkbox, neither present in the registration form. |
| [#7](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/7) | Done | bianh13 | Sprint 1 | Shared API adapter and integrated auth/prediction/history flows; legacy mock adapters remain available. |
| [#8](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/8) | Còn thiếu / chưa đủ bằng chứng | bianh13 | Sprint 1 | Published browser QA exists. The issue still records unchecked release/ZIP reviewer sign-off and accessibility/contribution checklist items; completion of those cannot be inferred from a general PR approval. |
| [#9](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/9) | Còn thiếu / chưa đủ bằng chứng | hai291 | Sprint 1 | Home explanation and estimate CTA work. Live model accuracy is not loaded on the home page; metrics are available on About the Model. |
| [#10](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/10) | Done | bianh13 | Sprint 2 | Guest inference through the real backend, without requiring an account. |
| [#11](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/11) | Done | bianh13 | Sprint 1 | Result displays estimated price, interval, model version, inputs and disclaimer. |
| [#12](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/12) | Done | bianh13 | Sprint 1 | Model catalog explains dataset, inputs, metrics, strengths, weaknesses and limitations. |
| [#13](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/13) | Done | bianh13 | Sprint 1 | Registration and login use the real authentication API and persisted users. |
| [#14](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/14) | Chưa triển khai | VuSiSi | Sprint 2 | No rolling five-predictions/day guest quota enforcement or matching UI. |
| [#15](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/15) | Done | bianh13 | Sprint 1 | Save an estimate with an optional label; ownership and result signature are checked. |
| [#16](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/16) | Còn thiếu / chưa đủ bằng chứng | pham-ha-gif | Sprint 1 | History lists saved estimates, but the UI requests only 50 rows and has no pagination controls, so it cannot show a complete history above that size. |
| [#17](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/17) | Done | bianh13 | Sprint 1 | Saved detail displays input snapshot, interval, disclaimer and model version. |
| [#18](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/18) | Done | bianh13 | Sprint 1 | Saved-estimate removal requires confirmation; the backend enforces ownership. |
| [#19](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/19) | Còn thiếu / chưa đủ bằng chứng | pham-ha-gif | Sprint 1 | Profile updates display name and phone only; editing email is not implemented in the form or update schema/API. |
| [#20](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/20) | Done | bianh13 | Sprint 1 | Password change verifies the current password and stores a new password hash. |
| [#21](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/21) | Chưa triển khai | pham-ha-gif | Sprint 2 | No registered-user quota of 100 predictions/day. |
| [#22](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/22) | Còn thiếu / chưa đủ bằng chứng | nguyentue110 | Sprint 1 | Dashboard shows user/prediction/model counts and recent activity; API-error statistics in the issue title are not implemented. |
| [#23](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/23) | Done | bianh13 | Sprint 1 | Admin model list shows algorithm, dataset, measured metrics, date and state. |
| [#24](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/24) | Còn thiếu / chưa đủ bằng chứng | nguyentue110 | Sprint 1 | The old upload screen has been replaced by the requested admin training workflow. Arbitrary model-file upload and its smoke-test/rejection states are not implemented by that replacement. |
| [#25](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/25) | Done | bianh13 | Sprint 1 | Admin can publish a validated version or reactivate an archived version. The reviewed multi-model upgrade keeps one Active version per algorithm, not one globally; the current Free model is protected from archival until replaced. |
| [#26](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/26) | Done | bianh13 | Sprint 1 | Responsive desktop/mobile layouts and reduced-motion behavior have published QA evidence. |
| [#27](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/27) | Done | bianh13 | Sprint 2 | Browser validation and authoritative API validation cover location, numbers, rooms and rejected extra parameters. |
| [#28](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/28) | Done | bianh13 | Sprint 1 | User/admin route guards and backend role/ownership checks protect the relevant actions. |
| [#29](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/29) | Done | bianh13 | Sprint 1 | 404/500 pages have recovery links; detail failures route to 404 and dashboard failures link to 500. |
| [#30](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/30) | Done | bianh13 | Sprint 1 | Implemented list surfaces have explicit empty states: history, admin models/activity, model catalog and map results. Future user/report lists are separate unfinished issues. |
| [#31](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/31) | Done | bianh13 | Sprint 2 | FastAPI exposes the implemented routes and schemas through /docs and /openapi.json. |
| [#32](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/32) | Chưa triển khai | bianh13 | Sprint 2 | No feature-importance/contribution chart for an individual estimate. |
| [#33](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/33) | Chưa triển khai | bianh13 | Sprint 2 | No market-insights screen with the requested aggregate charts. |
| [#34](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/34) | Còn thiếu / chưa đủ bằng chứng | pham-ha-gif | Sprint 2 | Search and backend pagination exist. The history UI lacks filters, sort and pagination controls. |
| [#35](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/35) | Chưa triển khai | pham-ha-gif | Sprint 2 | No saved-estimate rerun action that shows change against the active model. |
| [#36](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/36) | Chưa triển khai | bianh13 | Sprint 2 | No side-by-side comparison of two or three saved estimates. |
| [#37](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/37) | Chưa triển khai | VuSiSi | Sprint 2 | No wrong-estimate report form or backend route. |
| [#38](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/38) | Chưa triển khai | pham-ha-gif | Sprint 2 | No forgot/reset-password flow. |
| [#39](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/39) | Chưa triển khai | pham-ha-gif | Sprint 2 | No account deletion route or confirmation workflow. |
| [#40](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/40) | Done | bianh13 | Sprint 2 | Archive is persisted, archived versions leave inference, and the current Free model is protected. |
| [#41](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/41) | Chưa triển khai | nguyentue110 | Sprint 2 | No CSV dataset upload with column validation and preview; downloading a fixed Kaggle CSV is not this feature. |
| [#42](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/42) | Done | bianh13 | Sprint 2 | Dataset statistics, missingness, grouped split sizes and model provenance/hash links are available. |
| [#43](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/43) | Chưa triển khai | nguyentue110 | Sprint 2 | No user list/search screen with prediction counts. |
| [#44](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/44) | Chưa triển khai | nguyentue110 | Sprint 2 | No user deactivation flow. |
| [#45](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/45) | Chưa triển khai | nguyentue110 | Sprint 2 | No admin wrong-estimate report review. |
| [#46](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/46) | Chưa triển khai | nguyentue110 | Sprint 2 | No report closure with administrator note. |
| [#47](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/47) | Chưa triển khai | VuSiSi | Sprint 2 | No prediction-endpoint rate limiter. |
| [#48](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/48) | Done | bianh13 | Sprint 2 | The static How It Works and FAQ page explains inference, Premium, sandbox payment and data limitations. |
| [#49](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/49) | Chưa triển khai | bianh13 | Sprint 3 | No CSV export flow. |
| [#50](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/50) | Chưa triển khai | nguyentue110 | Sprint 3 | No administrator promotion/demotion workflow. |
| [#51](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/51) | Done | bianh13 | Sprint 1 | The shared legacy mock/API contract and fixtures were merged in PR #60; current API integration remains in the same adapter. |

[Snapshot có đường dẫn mã nguồn cho từng issue](2026-10-01.json). Mỗi issue trên GitHub cũng được bổ sung phần audit và link commit cố định.
