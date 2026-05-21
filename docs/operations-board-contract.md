# Operations Board Contract

This is the golden contract for the operational dashboard. Frontend, mobile, and backend should treat this response shape as the source of truth for reservation operations.

Endpoint:

- `GET /apartments/{apartmentId}/operations-board?date=YYYY-MM-DD&days=7`

Top-level fields:

- `apartmentId`: apartment represented by this board.
- `date`: local board date in `YYYY-MM-DD`.
- `days`: forward-looking window size used for upcoming reservations.
- `timezone`: apartment timezone used by backend classification.
- `checkIns`: reservations that start on `date`.
- `checkOuts`: reservations that end on `date`.
- `inHouse`: reservations that overlap `date`, including stays that started earlier or start today.
- `upcoming`: reservations after `date` and before the end of the board window.
- `totals`: numeric counters for the four sections.

Section shape:

- `count`: section reservation count.
- `reservations`: reservation cards in this section.

Reservation card shape:

- `id`: internal reservation id.
- `apartmentId`: apartment id.
- `icalSourceId`: source calendar id.
- `provider`: source provider, currently usually `airbnb`.
- `status`: reservation lifecycle, currently `confirmed`, `cancelled`, or `missing_in_feed`.
- `startsAt`: UTC ISO instant for stay start/check-in boundary.
- `endsAt`: UTC ISO instant for stay end/check-out boundary.
- `rawSummary`: raw iCal summary from the source. Airbnb often sends `Reserved`, so do not depend on guest names here.

Frontend rules:

- Render the four board sections explicitly, even when empty.
- Use `totals` for metric cards.
- Use section membership, not only dates, to decide visual grouping.
- Treat all timestamps as instants and format them for display.
- Do not infer guest names from `rawSummary`; show it as source text only.
- Preserve the selected `date`, `days`, and `timezone` in the UI because they explain why a reservation appears in a section.

Example insight from the current test object:

- `checkIns.count = 0`: no reservations start on `2026-05-21`.
- `checkOuts.count = 0`: no reservations end on `2026-05-21`.
- `inHouse.count = 2`: two reservations overlap `2026-05-21`.
- `upcoming.count = 1`: one reservation starts later inside the seven-day window.
