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
- iCal demo sync and Today Board navigation:
  - iCal source cards can trigger a demo sync;
  - demo sync creates one sample reservation in mock mode;
  - API mode calls `POST /ical-sources/:icalSourceId/sync` with generated ICS text;
  - reservation-driven Today Board rows include `apartmentId`;
  - reservation board actions now open the apartment screen consistently.
- Task form UX:
  - task due date defaults to an operational preset;
  - task form has quick due date presets for `In 2 hours`, `Tomorrow 09:00`, and `Tomorrow 11:00`;
  - presets are covered by mobile tests.
- Initial cloud setup:
  - backend can load local `.env` files through `dotenv`;
  - local backend `.env` points to the Neon project for development testing;
  - mobile `.env` points to the Render backend URL;
  - Neon schema was applied with `prisma db push`.
- Real email/password auth:
  - `POST /auth/sign-up` creates host admin users with password hashes;
  - `POST /auth/sign-in` validates email/password and returns JWT sessions;
  - passwords are hashed with Node `scrypt`;
  - existing dev-auth users can attach a password through sign-up;
  - mobile auth screen now requires password and calls real auth endpoints in API mode;
  - Neon schema includes `users.password_hash`.

## Implemented

- Planning foundation and product/technical docs.
- Monorepo foundation with `pnpm`.
- Mobile foundation with Expo, Expo Router, theme tokens, and base components.
- Backend foundation with Fastify, env validation, logs, and healthcheck.
- Prisma data model for users, organizations, apartments, iCal sources, reservations, tasks, invitations, sync runs, and audit logs.
- Development auth flow:
  - `POST /auth/sign-up`
  - `POST /auth/sign-in`
  - `POST /auth/dev/sign-up`
  - `GET /auth/me`
  - local JWT for development/test
  - mobile auth screen with email/password and session storage
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
  - mobile iCal card can run a demo sync to make this flow testable from the UI
- Reservation-driven Today Board:
  - `GET /today-board`
  - derives `checkInToday`, `checkOutToday`, `inStay`, and `upcoming`
  - returns `apartmentId` for reservation rows
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
- backend build after adding `dotenv`
- Neon schema push after adding password auth

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
  - auth password validation
  - apartment form validation
  - iCal source form validation
  - demo iCal text generation
  - reservation period formatting
  - task due date presets
  - task form validation

## Next Implementation Step

Improve task UX and real integration testing:

- replace raw ISO task due date input with a better mobile date/time picker;
- add optional not-done reason/history;
- validate manual task creation against a real local Postgres database when available;
- replace demo/manual iCal sync with backend fetch from stored iCal URLs and a periodic sync queue.

## Known Local Environment Notes

- Docker is not currently available in PATH on this machine.
- Prisma DB integration can be schema-validated, but real DB flow needs Postgres installed/running.
- Expo Web has been testable at `http://localhost:8081`.
- Render URL configured for cloud testing: `https://check-in-board.onrender.com`.
