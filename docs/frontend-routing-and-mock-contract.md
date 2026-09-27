# Frontend routing and mock contract (#51)

## Open the demo

Developers: `npm ci`, `npm test`, `npm run package` (Node 22+). The build writes
`dist/team5.zip` and a fresh `dist/team5-*/` directory. Extract the ZIP and open
its root `index.html` directly. No server, Node installation or backend is
needed by the reviewer. `dist/latest.json` identifies the latest build folder.

The build bundles each page's modules into one classic script and embeds all
JSON fixtures in a local script. This avoids both module and JSON-fetch CORS
restrictions on `file://`. Original frontend sources are included under
`source/frontend/` in the ZIP; edit that copy when rebuilding an extracted ZIP.
Rebuild after source changes. Source HTML in `frontend/` still uses modules;
serve it with `python -m http.server` during development.

## Demo authentication

| Role | Email | Password |
| --- | --- | --- |
| User | `anh@example.com` | `HomeVal123!` |
| Admin | `admin@homeval.vn` | `Admin123!` |

These are deliberately public, fictional demo credentials. `users.json` is a
list response for UI rendering and MUST NOT contain passwords or hashes.
`login(email, password)` validates the pair, normalises email case and returns
401 on mismatch. Registration returns 409 for a duplicate email, 422 for
invalid data, and persists demo accounts locally so login works after navigation.
Only a digest is stored for newly registered mock passwords. This is a frontend
simulation, not production password security; use throwaway demo credentials.
Real authentication remains the backend's responsibility (bcrypt/JWT).

## API contract

`frontend/js/api.js` is the page-facing boundary. `USE_MOCK` selects the mock
or real request branch. The backend currently implements only scaffold routes;
prediction/insight/admin endpoints below are PROPOSED contracts, not verified
backend implementations. Switching the flag alone is not an integration test.

| Function | Fixture / mock operation | Proposed endpoint |
| --- | --- | --- |
| `getModelInfo()` | `model.json` | `GET /api/model` |
| `createPrediction(input)` | `prediction-result.json` | `POST /api/predictions` |
| `getPredictionHistory({q,page,pageSize})` | `prediction-history.json` | `GET /api/me/predictions` |
| `getPrediction(id)` | matching full record in `prediction-history.json` | `GET /api/me/predictions/{id}` |
| `getMarketInsights()` | `market-insights.json` | `GET /api/insights` |
| `getAdminStats()` | `admin-stats.json` | `GET /api/admin/stats` |
| `listModels()` | `models.json` | `GET /api/admin/models` |
| `listDatasets()` | `datasets.json` | `GET /api/admin/datasets` |
| `listUsers({q,page,pageSize})` | `users.json` | `GET /api/admin/users` |

`createPrediction` currently accepts the fixture's 11 fields: `city`, `district`,
`property_type`, `area_m2` (floor area), `land_area_m2`, `bedrooms`, `bathrooms`,
`floors`, `frontage_m`, `year_built`, `legal_status`. It validates positive areas,
integer counts and BR-7 cross-field limits. The assigned 13-field prediction
form still needs a team-approved mapping; this adapter does not claim that
mapping is final. Extra input fields are preserved in the snapshot.

Price results and saved records include `estimated_price`, `currency`,
`confidence_interval`, `model_version`, `disclaimer`, `input`, `warnings`, and
`is_mock`. Prediction output is fixed illustrative data, not model inference.
New preview IDs are not saved-history IDs: save/delete/profile operations are
not yet implemented in this adapter. `getPrediction(id)` returns a complete
fixture record or a typed 404. Each read returns independent data.

Search/pagination is implemented for history and users. Pages are one-based;
page size is clamped to 1..100; responses contain `items,total,page,page_size`.

## Repeatable UI-state testing

Import `setMockScenario` from `api.js` in a test harness:

```js
setMockScenario('createPrediction', 'quota'); // next calls reject with 429
setMockScenario('createPrediction', 'success'); // reset
setMockScenario('prediction-history', 'empty'); // empty list
setMockScenario('login', 'loading'); // 1.2 second delay, then real mock result
```

Alternatively append `?mockOperation=model&mockScenario=server` to Home's URL
to exercise the actual loading/error/retry UI. Remove the query to recover.
JSON reads use fixture names (`model`, `users`, `prediction-history`, etc.);
auth/prediction mutations use `login`, `register`, `createPrediction`.
Supported error scenarios: `validation` (422), `unauthorized` (401),
`notFound` (404), `quota` (429), `server` (500), `network` (0).
`empty` applies to list fixtures. Scenarios run only in mock mode.

## Route ownership and known gaps

Existing pages: Home (`frontend/index.html`), login/register, three admin
pages, 404/500, plus legacy shop/list/detail templates. Root `index.html`
redirects to Home. Links to prediction/About Model in other members' work
must be verified after those pages merge; this PR does not implement them.
Mock fixture cities/model versions across public/admin pages still differ
and need team alignment before the final handoff.

The ZIP build fixes offline execution of existing pages. It does not certify
all M2 screens, navigation or contributions as complete. #51 integration is
partial until owners map their form fields, consume the adapter, and verify
the full guest/user/admin journeys. #7/#8 cover the final integration/QA pass.

## Verification

- `npm test`: auth success/failure, registration, no password leakage, BR-7,
  result/detail shapes, snapshot isolation, pagination and mock scenarios.
- `npm run package` then `npm run test:browser`: Chromium extracts the ZIP and opens root via
  `file://`, loads Home data, rejects a wrong password, logs in, opens admin
  dashboard/models, and verifies user navigation without HTTP requests.
- First browser setup: `npx playwright install chromium`.
  If using installed Chrome instead, set `PLAYWRIGHT_CHANNEL=chrome`.
