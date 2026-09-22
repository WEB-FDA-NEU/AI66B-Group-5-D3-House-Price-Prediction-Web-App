# Milestone 2 Frontend Board

Repository: <https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App>

Sprint goal: complete Frontend only this week. Backend implementation is out
of scope; Frontend uses mock fixtures and a stable API adapter boundary.

The source of truth is the [GitHub feature backlog](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues).
The backlog contains **42 feature issues and 154 points**.

## GitHub Project field convention

- Use the GitHub Project **Iteration** field as the official planning field:
	`Iteration 1`, `Iteration 2`, and `Iteration 3`.
- Keep the existing `sprint-1`, `sprint-2`, and `sprint-3` labels only as
	searchable aliases. Do not create a second planning system.
- Use **Size** for the estimate on the board. The value is the point number in
	each issue title and body. If the board uses **Estimate** instead of Size,
	map the same number to Estimate.
- Use **Status** for `Todo`, `In Progress`, `Review`, and `Done`. Labels are
	only a fallback view until the Project board is connected.

The Project board uses the same fields for the nine FE packages below. The
42 feature issues remain the detailed acceptance backlog underneath them.

## Frontend packages

- [ ] [FE-01 Home, About and shared layout/CSS (8 pts) - Iteration 1](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/1) - `hai291`
- [ ] [FE-02 Frontend routing, mock data and API adapter (5 pts) - Iteration 1](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/51) - `bianh13`
- [ ] [FE-03 Login and Register (5 pts) - Iteration 1](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/6) - `pham-ha-gif`
- [ ] [FE-04 Prediction form, validation and result (8 pts) - Iteration 1](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/2) - `VuSiSi`
- [ ] [FE-05 Profile and My Predictions (8 pts) - Iteration 2](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/4) - `pham-ha-gif`
- [ ] [FE-06 Charts, Compare and Market Insights (5 pts) - Iteration 2](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/3) - `bianh13`
- [ ] [FE-07 Admin screens and error pages (13 pts) - Iteration 2](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/5) - `nguyentue110`
- [ ] [FE-08 Frontend integration and mock API boundary (5 pts) - Iteration 3](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/7) - `bianh13`
- [ ] [FE-09 Responsive QA and release checklist (5 pts) - Iteration 3](https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App/issues/8) - `bianh13`

Package estimate: **62 points**.

The detailed GU/US/AD/SY issues are acceptance subtasks. Backend-only items
such as rate limiting and `/docs` are excluded from this week's FE completion
target and remain Todo.

## Iteration allocation

- **Iteration 1**: foundation, routing, auth, prediction form/result - 26 pts.
- **Iteration 2**: account area, charts/comparison, admin/error screens - 26 pts.
- **Iteration 3**: integration, responsive QA, release checklist - 10 pts.

Filter the board with labels: `sprint-1`, `sprint-2`, `sprint-3`, `status:in-progress`,
`status:todo`, `P0`, `P1`, and `P2`.

## In Progress

All nine FE packages are Frontend work. Their detailed Frontend subtasks use
`status:in-progress`; this means implementation may proceed with mock data, not
that Backend is complete.

## Todo

Backend-only issues, including SY-6 rate limiting and SY-7 API documentation,
are excluded from the weekly FE board and remain `Todo`.

## Assignment

- `hai291`: Home, About, About the Model, shared layout, CSS, responsive and empty states.
- `VuSiSi`: prediction form, validation, prediction result, 404/500, quota and wrong-estimate flow.
- `pham-ha-gif`: Login, Register, Profile, My Predictions, account settings and password flows.
- `bianh13`: charts, Market Insights, Compare, export and release verification.
- `nguyentue110`: admin Dashboard, Models, Datasets, Users, reports and API docs.

## Definition of done

- Acceptance criteria in the issue are checked.
- Changed files, routes, or API contracts are linked.
- Loading, empty, validation, error, responsive, and accessibility states are reviewed.
- A second team member verifies the result before the issue is closed.

## Coordination checkpoints

- Freeze the mock `POST /api/predict` request and response shape before UI integration.
- Confirm the thirteen prediction fields and BR-6/BR-7 validation rules.
- Use one shared disclaimer and ensure no screen displays a bare price.
- Review all P0 routes and failure states before starting P1 work.
- Backend implementation starts only after FE-08 records the agreed mock boundary.