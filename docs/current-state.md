# Current State

## Working Mode

- Default to one executor to reduce usage overhead.
- Use subagents only when parallel work clearly saves time.
- Prefer medium-sized deliverables with one review/check cycle.
- Keep this file updated after each meaningful implementation step.

## Latest Completed Block

- Mobile task operations:
  - apartment detail can create manual operational tasks;
  - apartment detail lists tasks for that apartment;
  - task cards can mark work as done or not done;
  - Today Board task rows can now be marked as done or not done;
  - task form validation is covered by mobile tests.

## Implemented

- Planning foundation and product/technical docs.
- Monorepo foundation with `pnpm`.
- Mobile foundation with Expo, Expo Router, theme tokens, and base components.
- Backend foundation with Fastify, env validation, logs, and healthcheck.
- Prisma data model for users, organizations, apartments, iCal sources, reservations, tasks, invitations, sync runs, and audit logs.
- Development auth flow:
  - `POST /auth/dev/sign-up`
  - `GET /auth/me`
  - local JWT for development/test
  - mobile auth screen and session storage
- Protected apartments flow:
  - `GET /apartments`
  - `POST /apartments`
  - authorization by apartment membership
  - mobile apartment list and creation UI
- Protected iCal source flow:
  - `GET /apartments/:apartmentId/ical-sources`
  - `POST /apartments/:apartmentId/ical-sources`
  - hidden iCal URLs in responses
  - mobile apartment detail and channel form
- First reservation pipeline:
  - iCal `VEVENT` parser for UID, DTSTART, DTEND, SUMMARY
  - `POST /ical-sources/:icalSourceId/sync` with development/test `icsText`
  - idempotent reservation upsert by `icalSourceId + externalEventKey`
  - `GET /apartments/:apartmentId/reservations`
  - mobile upcoming reservations section in apartment detail
- Reservation-driven Today Board:
  - `GET /today-board`
  - derives `checkInToday`, `checkOutToday`, `inStay`, and `upcoming`
  - mobile Today Board loads via service with mock/API modes
  - summary cards now derive from reservations when API mode is enabled
- Operational tasks foundation:
  - `GET /apartments/:apartmentId/tasks`
  - `POST /apartments/:apartmentId/tasks`
  - `GET /tasks/today`
  - `PATCH /tasks/:taskId/status`
  - `host_admin` can create tasks
  - `team` can mark tasks when `canUpdateTaskStatus` is true
  - mobile Today Board merges reservation rows and task rows
  - Today Board filters now work
  - task board action can mark pending tasks as done or not done
  - reservation board action opens apartment detail when possible
- Mobile apartment task operations:
  - apartment detail loads tasks from mock/API mode
  - apartment detail can create manual tasks
  - apartment detail can mark apartment tasks as done or not done
  - reusable task card and task form components follow the app token system

## Test Status

Last full local validation:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- backend Prisma schema validate with temporary `DATABASE_URL`
- Expo Web smoke check at `http://localhost:8081`

## Current Test Coverage Shape

- Backend:
  - health route
  - dev auth service/routes
  - protected apartments routes
  - protected iCal source routes
  - iCal parser
  - reservation sync/listing routes
  - reservation-driven Today Board route
  - operational task routes
- Mobile:
  - auth form validation
  - apartment form validation
  - iCal source form validation
  - reservation period formatting
  - task form validation

## Next Implementation Step

Improve task UX and real integration testing:

- replace raw ISO task due date input with a better mobile date/time picker;
- add optional not-done reason/history;
- validate manual task creation against a real local Postgres database when available;
- later replace manual sync text with queued/fetched iCal sync.

## Known Local Environment Notes

- Docker is not currently available in PATH on this machine.
- Prisma DB integration can be schema-validated, but real DB flow needs Postgres installed/running.
- Expo Web has been testable at `http://localhost:8081`.
