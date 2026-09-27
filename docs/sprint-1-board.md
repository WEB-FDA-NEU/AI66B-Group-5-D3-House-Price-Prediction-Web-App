# Milestone 2 - Frontend Sprint Board

Repository: <https://github.com/WEB-FDA-NEU/AI66B-Group-5-D3-House-Price-Prediction-Web-App>

Sprint goal: deliver the reviewable Milestone 2 frontend with mock data, all
required P0 navigation, an entry page, and an honest README. FastAPI, the
database, real model inference, rate limiting, and generated API docs are not
frontend completion criteria for this milestone.

## One naming convention

Use **Sprint** everywhere. Do not use legacy planning terminology in an issue
title, Project field, Project value, document, or status update.

| Where | Required convention |
| --- | --- |
| GitHub Project planning field | `Sprint` |
| Project values | `Sprint 1`, `Sprint 2`, `Sprint 3` |
| Search labels | `sprint-1`, `sprint-2`, `sprint-3` |
| Issue titles | `- Sprint 1`, `- Sprint 2`, or `- Sprint 3` |
| Workflow field | `Todo`, `In Progress`, `Review`, `Done` |

`Status` on the GitHub Project is the workflow source of truth. The matching
`status:*` label is retained only to make the Issues page searchable. A closed
Issue must be `Done`; an open Issue must never be labelled `status:done`.

## Board scope and points

The Project retains the larger FE package Issues as planning epics and also
shows detailed GU/US/AD/SY feature Issues. Individual workload and completion
evidence are calculated from the detailed feature Issues only; package points
must never be counted a second time.

- **Sprint 1 - P0 Milestone 2 frontend:** Issues `#9`--`#30`, plus `#51` for
  the mock adapter/foundation, `#7` for final integration, and `#8` for
  release QA before submission.
- **Sprint 2 - P1 backlog:** Issues `#32`--`#47` after all Sprint 1 P0 work
  and QA are complete.
- **Sprint 3 - P2 backlog:** Issues `#48`--`#50`; export and FAQ are cut first
  if the schedule slips.
- **Outside the M2 frontend board:** `#31` (FastAPI `/docs`) and all backend
  implementation work.

Point estimates communicate relative effort only. Do not inflate, duplicate,
or change them simply to make a workload chart look even. Each completed Issue
needs a link to the changed files and a second-member verification note.

## Current verified progress

The four admin P0 Issues below are closed in GitHub and should be displayed as
**Done** on the Project, not `In Progress`:

- `#22` AD-1 Admin Dashboard - 3 pts - `nguyentue110`
- `#23` AD-2 Model Management - 3 pts - `nguyentue110`
- `#24` AD-3 Upload Model Version - 5 pts - `nguyentue110`
- `#25` AD-4 Activate / rollback model - 5 pts - `nguyentue110`

All remaining Sprint 1 Issues stay **In Progress** or **Todo** until their
acceptance criteria and changed files are verified. `#29` (404/500) belongs to
`nguyentue110` because error pages are part of the admin/error-page slice.

## Sprint 1 ownership

| Owner | P0 scope |
| --- | --- |
| `hai291` | Home, About the Model, shared layout, responsive presentation, empty-state component. |
| `VuSiSi` | Prediction input/result, guest quota state, and browser validation. |
| `pham-ha-gif` | Login/Register, profile, history, detail, deletion, password, and protected user states. |
| `bianh13` | Routing/mock adapter, integration, and final release QA. |
| `nguyentue110` | Admin Dashboard, Model Management, Upload Model, activate/rollback, and 404/500. |

## Definition of done for Milestone 2

- A reviewer can open root `index.html` directly and reach every implemented
  screen without a broken link or missing asset.
- The screen has its documented loading, empty, validation, error, and mobile
  state where applicable.
- The Issue links its changed files or merged pull request and has a reviewer
  note from another member.
- `README.md` lists the actual screen status and each member's real work.
- The final `team5.zip` contains the root entry page, README, HTML, CSS,
  JavaScript, mock data, and assets only as used by the interface.
