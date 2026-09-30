# HomeVal — Model & Premium upgrade

Phiên bản đang làm chạy **backend thật**: huấn luyện ba mô hình từ Vietnam Housing
Dataset 2024, kiểm định độc lập, phân quyền admin/Premium và thanh toán giả lập.

```powershell
python -m pip install -r backend/requirements.txt
python scripts/download_dataset.py
python backend/bootstrap.py
python backend/run.py
```

Mở **http://127.0.0.1:8000**. Khi clone mới, chạy đủ bốn lệnh trên để tải dataset và tạo mô hình local.
Sau lần thiết lập đầu tiên, chỉ cần chạy lại lệnh cuối để mở ứng dụng.

- Tài khoản thường: `anh@example.com` / `password123`.
- Admin local: `admin@homeval.vn` / `admin123`.
- API docs: http://127.0.0.1:8000/docs.
- [Hướng dẫn kiểm tra, sai số và giới hạn](docs/model-upgrade/README.md).
- [Bản tối ưu UX: quận/huyện, Premium tại chỗ, chuyển động](docs/ux-polish/README.md).

`backend/run.py` chỉ mở localhost, tự tạo tài khoản demo và bật thanh toán sandbox
để review. Không dùng cấu hình demo này để triển khai công khai.

## Tài liệu bản nộp Milestone 2 trước đây

Nội dung dưới đây được giữ để bảo toàn lịch sử đóng góp; không mô tả backend mới.

> **Giao diện mới:** chạy `node scripts/preview.mjs` từ thư mục gốc, rồi mở
> http://127.0.0.1:4173. Mã nguồn mới nằm trong `frontend/`.
> Xem [bản V2: giao diện, bản đồ, Premium và đất nền](docs/redesign-v2/README.md).
> Các phần bên dưới mô tả bản nộp Milestone 2 trước khi thiết kế lại;
> các ZIP/bản đóng gói cũ chưa được tạo lại.

## 1. Project Overview

HomeVal is a house-price estimation frontend. Users enter property details,
view an illustrative price range and model information, and save predictions
to their account history. Administrators can explore model-management screens.

This submission demonstrates HTML, CSS and JavaScript interfaces using JSON
fixtures and browser storage. It does not perform real house-price inference.
No backend, database, model training or production authentication is required
to review this milestone.

## 2. Implemented Screens and Features

Statuses describe the delivered frontend against the planned project scope.
"Completed" refers to the indicated mock UI, not a production backend.

| Screen / feature | Submission file | Status | Implemented scope / remaining limitation |
| --- | --- | --- | --- |
| Home | `index.html` | Completed | Product introduction, prediction/history links, static model overview and disclaimer. |
| About the Model | `about-model.html` | Completed | Mock dataset, algorithm, metrics, limitations and disclaimer with loading/error handling. |
| Login | `login.html` | Completed | Demo credentials, validation, invalid-login feedback and return navigation. |
| Register | `register.html` | Completed | Account form, password confirmation, duplicate-email feedback and local mock account persistence. |
| Prediction form | `predict.html` | Partially Completed | Six property fields and browser validation; the full planned form and quota states are incomplete. |
| Prediction result | `predict-result.html` | Partially Completed | Price, interval, model version, input summary and disclaimer; current implementation requires login to see results. |
| Save prediction | `predict-result.html` | Completed | Optional label and local saved-history entry for the signed-in user. |
| My Predictions | `predictions.html` | Completed | User-specific history, search, empty state, detail links and delete confirmation in the demo. |
| Saved prediction detail | `detail.html?id=...` | Partially Completed | Saved inputs, price/model version and delete action; confidence interval is not displayed. |
| Profile / Settings | `profile.html` | Partially Completed | Edit display name/phone and change mock password; email editing is not implemented. |
| Admin dashboard | `admin.html` | Completed | Mock KPIs, activity/chart and admin access guard. |
| Model management | `admin-models.html` | Completed | Mock model list, metrics, state badges and activation/archive confirmation UI. Changes are not persisted. |
| Upload model | `admin-models-new.html` | Completed | File/type/size validation and simulated upload feedback; no model is processed or stored. |
| Error pages | `404.html`, `500.html` | Completed | Error messages and recovery links. |
| Legacy history entry | `list.html` | Completed | Redirects into the current history experience. |
| Shared layout | `css/`, `js/components/` | Partially Completed | Shared header/footer, responsive styles and UI helpers; minor template text remains. |
| Quota displays; advanced validation | No completed dedicated UI | Not Implemented | Remaining work is tracked for follow-up, not presented as finished M2 functionality. |
| Insights/charts, comparison, datasets/users/reports management, FAQ, CSV export, password reset | No implemented screens | Not Implemented | Planned later work; the presence of mock data or adapters does not mean these screens exist. |

## 3. Instructions to Open / Run

### Submitted ZIP (recommended for review)

1. Extract **team5.zip** completely into a folder. Do not open HTML from inside
   the ZIP preview.
2. Open **index.html at the extracted folder's root** in Chrome or Edge.
3. Use the navigation and the demo accounts below. No installation, server,
   API key or backend is needed for the packaged copy.

| Role | Email | Password |
| --- | --- | --- |
| User | `anh@example.com` | `password123` |
| Administrator | `admin@homeval.vn` | `admin123` |

All accounts/data are fictional. Registration, profile changes, passwords and
saved predictions use browser storage for demonstration only. Do not enter
real passwords or personal information. Use a fresh browser profile or clear
this demo's site data if an earlier test changed the demo password.

Suggested walkthrough: Home -> Predict -> Result (login when requested) ->
Save -> My Predictions -> Detail -> delete confirmation. For admin review,
log out, sign in as the administrator, then open Admin -> Models -> Upload.
The model-management page is also available directly as `admin-models.html`
after admin login.

### Source development copy

The ZIP retains original source under `source/frontend/`. Those original HTML
files use ES modules and require a static server, for example
`python -m http.server 8000` from `source/frontend/`, followed by
`http://localhost:8000/index.html`. The repository equivalent is `frontend/`.
Python is only an optional development server; it is not needed to view the ZIP.

The review copy bundles the existing page modules and embeds the shipped JSON
fixtures so it can run over `file://`. Application behavior is unchanged.
Use the root HTML pages, not `source/frontend/index.html`, for direct-file review.

## 4. Team Members and Individual Contributions

The table separates implementation evidence from initial assignments. Merged
PRs and source files support the contributions listed below. Unmerged PR #64
is not counted as delivered application work.

| No. | Student ID | Full Name | Assigned Screens/Pages | Main Contributions | Status |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | 11247351 | Phạm Huy Thành (`bianh13`) | Shared routing/mock-data/API foundation; integration and handoff | Implemented initial prediction/history/insights/dataset/user fixtures and adapter functions in #60; prepared documentation, offline packaging and handoff checks. Later adapter changes are shared with Quyền through #66. | Shared foundation completed; integration/QA partially completed pending known gaps and peer sign-off. |
| 2 | 11247372 | Phạm Quang Vũ (`VuSiSi`) | Prediction input/result, quota and validation (#2/#10/#11/#14/#27) | Assigned prediction work. Current merged form/result implementation was delivered in Quyền's PR #66; Vũ's individual implementation contribution needs team confirmation before final submission. | Prediction screens partially completed; individual contribution confirmation pending. |
| 3 | 11247282 | Nguyễn Sơn Hải (`hai291`) | Home, About the Model, shared header/footer/CSS | Implemented public pages, reusable layout, model-information rendering and responsive work in #56/#57/#59/#62. Home was subsequently revised during #66/#67 integration. | Public pages completed; shared layout has minor remaining polish. |
| 4 | 11247345 | Lê Duy Quyền (`pham-ha-gif`) | Login/Register, Profile, History/Detail; prediction integration | Delivered local-storage authentication/profile/password/history/save/delete behavior and integrated prediction form/result in #66; revised Home and removed the duplicate root entry in #67. | Login/Register/History completed; Profile/Detail and guest prediction flow partially completed as noted above. |
| 5 | 11247366 | Nguyễn Văn Tuệ (`nguyentue110`) | Admin dashboard, model management/upload, error pages | Implemented admin UI, fixtures, validation, confirmations and error/recovery screens in #52-#55; helped merge the team's final changes. | Admin/error mock UI completed; persistent model operations are outside this demonstration. |

Workload is evidenced by files and merged changes, not by story-point totals.
Where multiple members touched a screen, the initial implementation and later
integration are identified above. The team must confirm Vũ's actual work;
PR authorship alone is not conclusive proof of who wrote shared code.

## 5. Incomplete Features and Screens

- Guest users are redirected to Login before seeing a prediction result.
- The prediction form implements six fields; the full planned form, complete
  cross-field validation, low-confidence UI and 5/100-per-day quota displays
  are not complete.
- Saved detail/history do not show confidence intervals; Profile does not edit
  email. Some titles still contain template text and Home has a stray code fence.
- Admin upload/activation/archive are UI simulations without persistence.
- Insights/comparison, dataset/user/report management, FAQ, export and password
  reset screens are not implemented; fixtures are not finished screens.
- Full production API/model/database behavior is outside Milestone 2.
- Final peer review, remaining integration/QA acceptance items and upload to
  the course submission page remain the team's responsibility.

These limitations are disclosed rather than marking all planned work complete.
See [verification notes](docs/m2-verification.md) for the handoff checks.
