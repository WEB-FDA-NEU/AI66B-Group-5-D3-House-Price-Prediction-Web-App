# HomeVal - Milestone 1 Revised Requirements

## Project

HomeVal is an informational house-price prediction web app for one city and one
currency (VND). A visitor enters a property's features and receives an
estimated price, confidence interval, model version, feature-importance chart,
and disclaimer. Registered users can save and compare estimates. Administrators
manage model versions and review wrong-estimate reports.

HomeVal is not a marketplace, listing site, professional appraisal service,
payment service, or training system. Models are trained offline and loaded by
the FastAPI backend at startup.

## Priorities

- **P0**: required for a usable first release.
- **P1**: build after all P0 work is complete.
- **P2**: stretch work and first to be dropped when the schedule slips.

P2 drop order: CSV export, role changes, FAQ page, in-app dataset management,
admin user management, wrong-estimate reports, prediction comparison, market
insights, and password reset.

## Feature Backlog

### Guest

| ID | Requirement | Priority |
| --- | --- | --- |
| GU-1 | Home page with proposition, live-model accuracy, and estimate CTA | P0 |
| GU-2 | Run a prediction without an account | P0 |
| GU-3 | Show price, confidence interval, and model version | P0 |
| GU-4 | Show feature-importance chart | P1 |
| GU-5 | About the Model: dataset, algorithm, metrics, and limitations | P0 |
| GU-6 | Market Insights charts | P1 |
| GU-7 | How It Works / FAQ | P2 |
| GU-8 | Register and log in | P0 |
| GU-9 | Guest quota and restrictions | P0 |

### Registered user

| ID | Requirement | Priority |
| --- | --- | --- |
| US-1 | Save an estimate with an optional label | P0 |
| US-2 | View prediction history | P0 |
| US-3 | Search, filter, sort, and paginate history | P1 |
| US-4 | Open a saved estimate in detail | P0 |
| US-5 | Soft-delete a saved estimate with confirmation | P0 |
| US-6 | Re-run an estimate against the active model | P1 |
| US-7 | Compare two or three saved estimates | P1 |
| US-8 | Export history or a result to CSV | P2 |
| US-9 | Report a wrong estimate | P1 |
| US-10 | Edit profile name and email | P0 |
| US-11 | Change password | P0 |
| US-12 | Reset a forgotten password | P1 |
| US-13 | Delete the account and saved estimates | P1 |
| US-14 | Increase quota to 100 predictions per day | P0 |

### Administrator

| ID | Requirement | Priority |
| --- | --- | --- |
| AD-1 | Dashboard KPIs and recent activity | P0 |
| AD-2 | List model versions and metrics | P0 |
| AD-3 | Upload and smoke-test a model version | P0 |
| AD-4 | Activate or roll back exactly one live model | P0 |
| AD-5 | Archive a model version | P1 |
| AD-6 | Upload and validate a CSV dataset | P1 |
| AD-7 | Show dataset statistics and model links | P1 |
| AD-8 | List and search users | P1 |
| AD-9 | Change a user's role | P2 |
| AD-10 | Deactivate a user with confirmation | P1 |
| AD-11 | Review wrong-estimate reports | P1 |
| AD-12 | Close a report with an audit record | P1 |

### Cross-cutting

| ID | Requirement | Priority |
| --- | --- | --- |
| SY-1 | Responsive desktop and mobile layout | P0 |
| SY-2 | Browser validation plus authoritative Pydantic validation | P0 |
| SY-3 | Bcrypt password hashing, JWT auth, and protected routes | P0 |
| SY-4 | Dedicated 404 and 500 pages | P0 |
| SY-5 | Empty state on every list screen | P0 |
| SY-6 | Server-side rate limiting | P1 |
| SY-7 | FastAPI generated API docs at `/docs` | P0 |

## Business Rules

- **BR-1**: model states are `Uploaded -> Validated -> Active -> Archived`, or
  `Uploaded -> Rejected`; rejected models cannot be activated.
- **BR-2**: exactly one model is active. Activation archives the current model
  and uses a transaction plus a unique partial index to handle races.
- **BR-3**: every prediction stores an immutable input snapshot and model ID.
- **BR-4**: prediction deletion is soft deletion; account deletion removes the
  user's predictions within 24 hours.
- **BR-5**: guests get five predictions per rolling 24 hours per IP; users get
  100 per day; quota enforcement is server-side.
- **BR-6**: Pydantic is the server authority and returns HTTP 422 with field
  errors for invalid requests.
- **BR-7**: floor area must be at most land area x floors x 1.5; bathrooms must
  be at most bedrooms + 2; year built cannot exceed the current year.
- **BR-8**: out-of-distribution inputs return a widened interval and a
  `low_confidence` warning rather than being hidden.
- **BR-9**: every price response includes interval, model version, and
  disclaimer; a bare number is invalid.
- **BR-10**: users can access only their own predictions; another user's ID
  resolves to 404.
- **BR-11**: email uniqueness is case-insensitive and database-enforced.
- **BR-12**: passwords require eight characters with a letter and digit; JWTs
  expire after 60 minutes; password-reset links expire after 30 minutes.
- **BR-13**: datasets are CSV and at most 20 MB; models are PKL/JOBLIB and at
  most 100 MB; both require validation before storage or activation.
- **BR-14**: one report per prediction; report states are `New -> Reviewed ->
  Closed`, and only administrators can change state.

## Required Screens and Routes

| # | Screen | Route | Access | Priority |
| --- | --- | --- | --- | --- |
| 1 | Home | `/` | G/U/A | P0 |
| 2 | Predict - Input Form | `/predict` | G/U/A | P0 |
| 3 | Prediction Result | `/predict/result` | G/U/A | P0 |
| 4 | Market Insights | `/insights` | G/U/A | P1 |
| 5 | About the Model | `/about-model` | G/U/A | P0 |
| 6 | How It Works / FAQ | `/about` | G/U/A | P2 |
| 7 | Login | `/login` | G | P0 |
| 8 | Register | `/register` | G | P0 |
| 9 | Forgot Password | `/forgot-password` | G | P1 |
| 10 | Reset Password | `/reset-password?token=` | G | P1 |
| 11 | Profile & Settings | `/me/profile` | U/A | P0 |
| 12 | My Predictions | `/me/predictions` | U/A | P0 |
| 13 | Prediction Detail | `/predictions/{id}` | U/A | P0 |
| 14 | Compare Predictions | `/compare?ids=` | U/A | P1 |
| 15 | Report Wrong Estimate | `/predictions/{id}/report` | U/A | P1 |
| 16 | Admin Dashboard | `/admin` | A | P0 |
| 17 | Model Management | `/admin/models` | A | P0 |
| 18 | Upload Model Version | `/admin/models/new` | A | P0 |
| 19 | Dataset Management | `/admin/datasets` | A | P1 |
| 20 | Upload Dataset | `/admin/datasets/new` | A | P1 |
| 21 | User Management | `/admin/users` | A | P1 |
| 22 | Feedback / Reports | `/admin/feedback` | A | P1 |
| 23 | Report Detail | `/admin/feedback/{id}` | A | P1 |
| 24 | Confirmation Dialog | overlay or `/confirm` | U/A | P0 |
| 25 | 404 - Not Found | `/404` | G/U/A | P0 |
| 26 | 500 - Service Unavailable | `/500` | G/U/A | P0 |

Shared components: auth-aware header, disclaimer footer, form field group,
result card, feature chart, chart block, prediction row, status badge,
confirmation dialog, toast, empty state, pagination, and loading state.

## User Flows

- **F1**: Home -> Predict -> Result; invalid input stays on Predict; model
  failure goes to 500; guest quota failure invites registration.
- **F2**: Result -> Register/Login -> Result -> My Predictions.
- **F3**: Home -> FAQ -> Insights -> About the Model -> Predict -> Result.
- **F4**: Login -> Home -> Predict -> Result -> My Predictions.
- **F5**: My Predictions -> Detail -> My Predictions; empty history links to
  Predict; unauthorized IDs resolve to 404.
- **F6**: Detail -> Confirmation -> My Predictions, with a cancel branch.
- **F7**: Detail -> Result -> My Predictions for a new model run.
- **F8**: My Predictions -> Compare -> Detail; fewer than two selections show
  an empty state.
- **F9**: Detail -> Report -> Detail; duplicate reports are refused.
- **F10**: Login -> Profile -> Login after password change -> Home.
- **F11**: Login -> Forgot Password -> Reset Password -> Login -> Home.
- **F12**: protected screen -> Login on token expiry -> original screen.
- **F13**: Login -> Admin -> Models -> Upload Model -> Models -> Confirmation.
- **F14**: Admin -> Datasets -> Upload Dataset -> Datasets -> Models.
- **F15**: Admin -> Reports -> Report Detail -> Datasets or Reports.
- **F16**: Admin -> Users -> Confirmation -> Users.
- **F17**: bad address or inaccessible record -> 404 -> Home.

## Team and Sprint 1 Assignment

| Member | Ownership | P0 deliverables | P1/P2 follow-up |
| --- | --- | --- | --- |
| Nguyen Son Hai | Shared layout and public pages | Header, footer, form fields, toast, empty state, pagination, badge, confirmation, Home, About Model | FAQ |
| Pham Quang Vu | Prediction and model owner | Predict form, Prediction Result, Prediction Detail | Wrong-estimate form |
| Le Duy Quyen | Accounts and history | Login, Register, Profile, My Predictions | Password reset |
| Pham Huy Thanh | Charts and comparison | Chart and feature-importance components | Insights, Compare |
| Nguyen Van Tue | Administration and errors | Admin Dashboard, Model Management, Upload Model, 404, 500 | Datasets, Users, Reports |

## Definition of Done

Each issue must include its route or API contract, browser and server
validation, responsive behavior, loading/empty/error states, and a linked test
or manual verification note. The team should finish all P0 issues before
starting P1 or P2 issues.

Repository: <https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App>