# FE-09 release QA (#8)

Build: PR #110 branch (`feat/ui-luxe-architect`), checked 13 November 2026 in Edge (Playwright) against the
live backend on an isolated copy of the database.

Every page was checked at **1366 px and 390 px** for:
- **colour contrast** with axe-core 4.10 (`color-contrast`, `link-in-text-block`, WCAG 2 AA),
- **console errors** (any `pageerror` or `console.error`),
- **horizontal overflow** of the document.

Signed-in pages were checked **signed in**: as the demo user (with two saved predictions created for the run)
and as the admin. This closes the gap noted in the 12 November checklist, which covered them only as a guest.

## Result: 52 checks, 0 problems

| Page | As | 1366 px | 390 px |
| --- | --- | :---: | :---: |
| Đã lưu | user | ✓ | ✓ |
| Chi tiết | user | ✓ | ✓ |
| So sánh | user | ✓ | ✓ |
| Hồ sơ | user | ✓ | ✓ |
| Định giá (user) | user | ✓ | ✓ |
| Kết quả (user) | user | ✓ | ✓ |
| Báo sai lệch | user | ✓ | ✓ |
| Admin | admin | ✓ | ✓ |
| Admin · mô hình | admin | ✓ | ✓ |
| Admin · huấn luyện | admin | ✓ | ✓ |
| Admin · người dùng | admin | ✓ | ✓ |
| Admin · dataset | admin | ✓ | ✓ |
| Admin · báo cáo | admin | ✓ | ✓ |
| Trang chủ | khách | ✓ | ✓ |
| Thị trường | khách | ✓ | ✓ |
| Về mô hình | khách | ✓ | ✓ |
| Premium | khách | ✓ | ✓ |
| Bản đồ | khách | ✓ | ✓ |
| Cách hoạt động | khách | ✓ | ✓ |
| Nguồn dữ liệu | khách | ✓ | ✓ |
| Nguồn ảnh | khách | ✓ | ✓ |
| Đăng nhập | khách | ✓ | ✓ |
| Đăng ký | khách | ✓ | ✓ |
| 404 | khách | ✓ | ✓ |
| 500 | khách | ✓ | ✓ |
| list → redirect | khách | ✓ | ✓ |

## Fixed during this pass
| Finding | Fix |
| --- | --- |
| About the model: figure captions under the data strip at 4.38:1 (data loads after the page, so an earlier pass missed it) | theme grey `--lux-grey` (≥ 4.9:1) |
| Map demo: listing card meta at 3.72:1 and the land tag at 4.26:1 | theme grey; land tag `#736436` (5.8:1 on white, 5.2:1 on plaster) |
| Admin datasets at 390 px: the Kaggle URL in the dataset facts widened the page by 8 px | `.facts dd { overflow-wrap: anywhere; min-width: 0 }` |
| 12 Nov contrast fixes lived inside the generated `luxe-remap.css`, so re-running the generator would undo them | moved into the hand-written `luxe.css`; the generated file is regenerated clean |

## Still to do by the team
- A reviewer other than the implementer opens the release build after #110 merges and ticks the checklist on #8.
- Confirm the contribution report (report section 10) with the team.
