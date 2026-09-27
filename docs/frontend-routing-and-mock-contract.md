# Frontend routing and mock contract

This document is the shared boundary for Milestone 2. Page owners import from
`frontend/js/api.js`; they do not call `fetch()` for mock data in page modules.
`frontend/js/config.js` is the only switch between mock and FastAPI mode.

## Run mode

| Setting | Local milestone value | Meaning |
| --- | --- | --- |
| `USE_MOCK` | `true` | Uses JSON fixtures in `frontend/mock/`; no FastAPI dependency. |
| `USE_MOCK` | `false` | Uses the matching endpoint below, with the token added by `api.js`. |

Serve the repository with a static local server while mock fixtures are JSON
files. Browsers block `fetch()` requests to local `file://` JSON files.

## Route map

| User flow | Target route | Shared function / state |
| --- | --- | --- |
| Home | `index.html` | `getItems()` during legacy-template migration |
| Login / Register | `login.html`, `register.html` | `login()`, `register()`, `saveSession()` |
| New estimate | `predict.html` | `createPrediction(input)` |
| Prediction result | `predict-result.html` | Return value of `createPrediction()` |
| My predictions | `me-predictions.html` | `getPredictionHistory()` / `getPrediction(id)` |
| Market insights | `insights.html` | `getMarketInsights()` |
| Admin dashboard / models | `admin.html`, `admin-models*.html` | `getAdminStats()`, `listModels()` |
| Admin datasets / users | `admin-datasets.html`, `admin-users.html` | `listDatasets()`, `listUsers()` |
| Recovery | `404.html`, `500.html` | `MOCK_UI_STATES` and visible recovery links |

Routes not yet implemented remain assigned to their own Issue. This foundation
provides data and navigation conventions, not another member's screen.

## API and fixture mapping

| Function | Mock fixture | FastAPI endpoint |
| --- | --- | --- |
| `createPrediction(input)` | `prediction-result.json` | `POST /api/predictions` |
| `getPredictionHistory()` | `prediction-history.json` | `GET /api/me/predictions` |
| `getPrediction(id)` | `prediction-history.json` | `GET /api/me/predictions/{id}` |
| `getMarketInsights()` | `market-insights.json` | `GET /api/insights` |
| `getAdminStats()` | `admin-stats.json` | `GET /api/admin/stats` |
| `listModels()` | `models.json` | `GET /api/admin/models` |
| `listDatasets()` | `datasets.json` | `GET /api/admin/datasets` |
| `listUsers()` | `users.json` | `GET /api/admin/users` |

## UI-state convention

Every owner handles loading, success, empty and error states in their page
module. Use `ApiError.status` to distinguish 401, 404, 422 and network errors;
use `MOCK_UI_STATES` for consistent Vietnamese fallback messages. No token or
API base URL is duplicated in page code.
