# M2 integration and QA follow-up (#7 / #8)

Base application: main `d3bc1a1` (PR #66/#67). This follow-up uses the team's
current frontend and credentials. It does not restore PR #64, replace the
mock login/store, add backend behavior or implement quota enforcement.

## Changes for review

- Guest Home -> Predict -> Result is accessible. Clicking Save asks for login
  and returns to the result; only saving requires a user account.
- Saving preserves the original result interval/disclaimer. History/detail
  display them. Legacy records explicitly report a missing interval rather
  than inventing one. Model version, input snapshot and existing storage IDs
  are retained.
- All header admin links follow the current user's role. Protected admin
  pages redirect without throwing an uncaught `blocked` error.
- Remove obsolete marketplace/title text and stray code fence. Login/Register
  and 404/500 have usable recovery links; footer links lead to implemented pages.

## Shared data boundary

Page modules continue using the team's `js/api.js` and `USE_MOCK` setting.
Prediction input remains the six fields submitted by `predict.js`; this PR
does not impose the incompatible expanded fields from PR #64. Result data
contains `estimated_price`, `currency`, `confidence_interval`, `model`, `input`.
Saved records use `model_version`, with interval/disclaimer now also preserved.
Production endpoint implementation and enforcement remain future work.

## Reviewer walkthrough

1. Open the extracted ZIP root `index.html`. As a guest, predict a property;
   confirm price/range/model/disclaimer and the login-to-save action.
2. Login as `anh@example.com` / `password123`, return to Result, save, open
   History/Detail, and verify range/model/inputs. Cancel a delete, then confirm.
3. Try an empty history search, invalid form, incorrect login, expired/guest
   access and unavailable model data. Confirm visible recovery/retry actions.
4. Login as `admin@homeval.vn` / `admin123`: Dashboard -> Models -> Upload.
   Check empty models, invalid upload and confirmation cancel/accept paths.
5. Check desktop and 390px mobile widths, keyboard tab focus, field labels,
   and console output. Check About, Profile, Register, 404 and 500 navigation.

## Final acceptance

Verification executed with Chrome headless against both the source on a local
static server and an isolated ZIP extracted into a path containing spaces:

- 14 delivery assertions passed: Home/About data, login, form validation,
  result, save/history/detail/delete, profile feedback, dashboard/models,
  upload validation, no HTTP dependency and no console/page errors in the
  delivery walkthrough. Checked pages had no missing local file links or
  document-width overflow at 1366px and 390px.
- Seven additional scenario groups passed: guest result and login-to-save
  return path; admin redirects/role-aware header; empty history and legacy
  interval disclosure; About loading/error/retry; empty models/invalid upload;
  registration/login failure; keyboard tab focus and form labels. Escape
  cancels deletion without deleting the record. New saved intervals match the
  original result through History and Detail.

The test did not run a full accessibility audit or verify a real backend.
A team member other than the implementer must review this PR and the submission
copy before #7/#8 can be marked Done. Automated checks do not substitute for
that sign-off or for team agreement on the documented mock data contract.

Known scope gaps retained: quota displays (#14/#21), expanded prediction form
and advanced validation (#2/#27), profile email editing and persistent admin
mutations. These do not become completed by changing a sprint field.
