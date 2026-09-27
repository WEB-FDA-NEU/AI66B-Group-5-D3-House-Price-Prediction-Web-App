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
| Home | `frontend/index.html` | Partially completed | HomeVal content and mock model metrics exist; links to pending pages still need integration. |
| About the Model, prediction form/result | Planned HomeVal routes | Not implemented | Pending implementation/merge on this branch. |
| Login, Register, Profile, My Predictions, Prediction Detail | Planned account routes | Not implemented | Existing template is not yet the specified HomeVal user area. |
| Charts, comparison, datasets, users, reports, FAQ, CSV export | Planned P1/P2 routes | Not implemented | Deferred until all P0 screens and the submission checklist are complete. |

## How to open and run

1. For a submitted ZIP: extract `team5.zip`, then open its root `index.html`
   directly in a modern browser. No server or backend is required.
2. To build that ZIP from source: install Node 22+, run `npm ci`, then
   `npm run package`. The output is `dist/team5.zip`. Rebuild after code changes.
3. To develop against the source files: run `python -m http.server` at the
   repository root and visit `http://localhost:8000/frontend/index.html`.
4. Demo admin: `admin@homeval.vn` / `Admin123!`; demo user:
   `anh@example.com` / `HomeVal123!`. Use only throwaway credentials when trying
   mock registration. Incorrect credentials are rejected.
5. `npm test` checks the adapter. `npm run package` followed by
   `npm run test:browser` checks the offline build (install Chromium first with
   `npx playwright install chromium`). To use installed Chrome instead, set
   `PLAYWRIGHT_CHANNEL=chrome` in your shell.

> The build enables direct-file execution of existing pages. Remaining P0
> screens and links still need completion; generating a ZIP is not evidence
> that the full milestone is complete. Source module HTML requires a static
> server; use the generated ZIP for direct-file review.

Shared adapter details, proposed endpoints, mock error scenarios and known
integration gaps: [frontend contract](docs/frontend-routing-and-mock-contract.md).

## Team members and individual contributions

| No. | Student ID | Full name | Assigned screens/pages | Main contributions | Status |
| ---: | --- | --- | --- | --- | --- |
| 1 | 11247351 | Phạm Huy Thành | Routing, mock API boundary, charts/comparison, release QA | Implemented the shared mock adapter, demo authentication, prediction fixtures, offline ZIP build and regression tests; full screen integration remains pending. | Partially completed |
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
