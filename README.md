# HomeVal - House Price Prediction Web App

## Project overview

HomeVal is a responsive web application that helps visitors estimate a house
price from property information. A result must show the estimate, confidence
interval, model version, and an informational disclaimer. Registered users can
save and review estimates; administrators manage model versions.

This repository currently contains the Milestone 2 frontend mock and a FastAPI
backend scaffold. The detailed product specification, business rules, screen
map, and team plan are in [docs/milestone-1-revised.md](docs/milestone-1-revised.md).

## Implemented screens and features

The table records the actual state of the `main` branch. “Completed” means the
screen is implemented with Milestone 2 mock data; it does not mean the FastAPI
or database implementation is complete.

| Screen / feature | Route or file | Status | Current scope |
| --- | --- | --- | --- |
| Admin Dashboard (AD-1) | `frontend/admin.html` | Completed | Mock KPI cards, daily activity chart, empty/error states, and mocked admin guard. |
| Model Management (AD-2) | `frontend/admin-models.html` | Completed | Mock model list, metrics, state badges, and confirmation flow. |
| Upload Model Version (AD-3) | `frontend/admin-models-new.html` | Completed | Browser validation for `.pkl`/`.joblib`, 100 MB limit, and mock smoke-test result. |
| Activate / rollback model (AD-4) | `frontend/admin-models.html` | Completed | Mock activation, confirmation, rejected-state restriction, and conflict notice path. |
| Error pages (SY-4) | `frontend/404.html`, `frontend/500.html` | Partially completed | Pages exist; the final recovery-flow verification is still open. |
| Home, About the Model, prediction form/result | Planned HomeVal routes | Not implemented | Existing generic template must be replaced with HomeVal screens. |
| Login, Register, Profile, My Predictions, Prediction Detail | Planned account routes | Not implemented | Existing template is not yet the specified HomeVal user area. |
| Charts, comparison, datasets, users, reports, FAQ, CSV export | Planned P1/P2 routes | Not implemented | Deferred until all P0 screens and the submission checklist are complete. |

## How to open and run

1. From the repository root, open the `frontend/` folder in a static web server.
   For example, use VS Code Live Server or run `python -m http.server` and open
   `frontend/index.html` through that server.
2. Use an email containing `admin` and any password except `sai` to enter the
   Milestone 2 mock admin flow.
3. The frontend runs with mock data by default (`frontend/js/config.js`). No
   FastAPI server is required for the completed admin screens.

> Current limitation: the submission-root `index.html` now redirects into the
> frontend, but the remaining HomeVal P0 navigation must still be finished and
> the final ZIP must be tested by opening it directly before submission.

## Team members and individual contributions

| No. | Student ID | Full name | Assigned screens/pages | Main contributions | Status |
| ---: | --- | --- | --- | --- | --- |
| 1 | 11247351 | Phạm Huy Thành | Routing, mock API boundary, charts/comparison, release QA | Coordinates the repository, API mock contract, integration, and release verification. | Partially completed |
| 2 | 11247372 | Phạm Quang Vũ | Predict input/result and validation | Owns the 13-field prediction flow, result contract, quota states, and browser validation. | Partially completed |
| 3 | 11247282 | Nguyễn Sơn Hải | Home, About the Model, shared layout/CSS | Owns HomeVal public pages, responsive shared components, and reusable empty-state presentation. | Partially completed |
| 4 | 11247345 | Lê Duy Quyền | Login, Register, Profile, My Predictions, Prediction Detail | Owns account screens, mock authentication states, saved-prediction history, and account settings. | Partially completed |
| 5 | 11247366 | Nguyễn Văn Tuệ | Admin Dashboard, Model Management, Upload Model, activation/rollback | Completed the four verified admin mock tasks AD-1 through AD-4, including validation and confirmation states. | Completed for AD-1--AD-4 |

## Incomplete screens and delivery requirements

- Replace generic/template screens with the HomeVal P0 home, prediction,
  account, and shared navigation flows.
- Verify every root-entry route and asset when the final ZIP is opened directly.
- Finish and verify SY-4 recovery navigation, responsive/mobile QA, and the
  release checklist.
- Update this README after each merge so its statuses and contributions match
  the final source files and GitHub Issues.

## Sprint board

The current Milestone 2 plan is in [docs/sprint-1-board.md](docs/sprint-1-board.md).
The GitHub Project is the operational board; it uses **Sprint 1**, **Sprint 2**,
and **Sprint 3** consistently.
