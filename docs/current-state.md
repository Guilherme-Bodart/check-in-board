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
- Real iCal sync:
  - `POST /ical-sources/:icalSourceId/sync` can now fetch the stored iCal URL when `icsText` is not provided;
  - sync requests use a 15s timeout and calendar-friendly headers;
  - iCal source `lastSuccessAt` and `lastFailureAt` are updated after sync attempts;
  - mobile iCal cards now show `Sync now` and call the real sync path in API mode;
  - mock mode still creates a demo reservation for local UI testing.
- iCal abuse protection and low-cost auto sync:
  - iCal URLs are restricted to HTTP/HTTPS;
  - localhost, `.local`, embedded credentials, and private network targets are rejected;
  - stored iCal fetches do not follow redirects automatically;
  - fetched iCal content is limited to 2 MB;
  - stored iCal sync is throttled to once every 30 minutes per source;
  - listing apartment reservations triggers stale-source sync opportunistically, avoiding a paid cron for now.
- Task execution history:
  - marking a task as `not_done` now requires a note;
  - task status notes are stored in the existing task `result` JSON field;
  - mobile task cards collect and display the not-done reason.
- Task date/time UX:
  - mobile task creation no longer exposes raw ISO as the primary input;
  - task due date and due time are edited as separate local fields;
  - quick due-date presets remain available.
- Apartment members and invitations:
  - `GET /apartments/:apartmentId/members`
  - `POST /apartments/:apartmentId/invitations`
  - `POST /invitations/accept`
  - host admins can invite `co_host` or `team` users;
  - co-hosts get read-only apartment access;
  - team users get apartment access plus task-status update permission;
  - mobile apartment detail lists members and can create invitations.
- API abuse protection:
  - global IP-based rate limiting is enabled for backend routes;
  - auth routes have a stricter configurable limit;
  - write/sync routes have a separate configurable limit;
  - rate limit knobs are exposed through backend environment variables;
  - backend tests cover 429 behavior for repeated requests.
- Security and account hardening:
  - backend now registers CORS and Helmet security headers;
  - Fastify `trustProxy` is configurable for Render/proxy-aware IP handling;
  - new iCal URLs are encrypted with AES-256-GCM while legacy base64 values still decrypt;
  - password reset tokens are stored hashed in `password_reset_tokens`;
  - authenticated users can change password from the mobile Security screen;
  - mobile auth screen can request/confirm password reset tokens;
  - mobile has an invitation acceptance screen for pasted invite tokens;
  - mobile API client now gives a clearer message for HTTP `429`;
  - audit logs are written for iCal source creation/sync, invitation creation/acceptance, and task creation/status updates.

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
  - `POST /ical-sources/:icalSourceId/sync` with stored URL fetch or development/test `icsText`
  - idempotent reservation upsert by `icalSourceId + externalEventKey`
  - `GET /apartments/:apartmentId/reservations`
  - mobile upcoming reservations section in apartment detail
  - mobile iCal card can run real sync in API mode and demo sync in mock mode
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
  - `not_done` requires a reason in backend/API mode
  - reservation board action opens apartment detail when possible
- Mobile apartment task operations:
  - apartment detail loads tasks from mock/API mode
  - apartment detail can create manual tasks
  - apartment detail can mark apartment tasks as done or not done
  - reusable task card and task form components follow the app token system
- API protection:
  - `@fastify/rate-limit` protects backend routes with an in-memory store for the current single-instance MVP setup
  - configurable global, auth, and write-route limits
- Account and security flows:
  - `POST /auth/change-password`
  - `POST /auth/password-reset/request`
  - `POST /auth/password-reset/confirm`
  - `password_reset_tokens` table applied to Neon with `prisma db push`
  - CORS/Helmet plugins enabled in backend
  - iCal URL encryption helper with legacy decode fallback
  - protected mobile routes for accepting invites and changing password

## Test Status

Last full local validation:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- backend Prisma schema validate with temporary `DATABASE_URL`
- Expo Web smoke check at `http://localhost:8081`
- backend build after adding `dotenv`
- Neon schema push after adding password auth
- backend build after real iCal sync
- backend build after iCal protections and task not-done notes
- backend build after members/invitations
- backend tests/typecheck after API rate limiting
- backend tests/typecheck after security headers, password reset/change, iCal encryption, and audit logs
- Neon schema push after adding `password_reset_tokens`
- Render + Neon smoke test:
  - `/health`
  - `/auth/sign-up`
  - `/auth/sign-in`
  - `/auth/me`
  - create apartment
  - create iCal source
  - sync stored iCal URL
  - list imported reservations

## Current Test Coverage Shape

- Backend:
  - health route
  - dev auth service/routes
  - protected apartments routes
  - protected iCal source routes
  - iCal parser
  - reservation sync/listing routes
  - stored iCal URL fetch sync route
  - reservation-driven Today Board route
  - operational task routes
  - apartment member and invitation routes
  - password change/reset routes
  - secret encryption helper
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

Improve production UX and operations:

- connect a real email provider for password reset and invitation delivery;
- add audit log viewing/admin inspection endpoints;
- add better mobile copy/share UX for invitation links;
- add a persisted sync run table write path for sync observability;
- consider Redis/Upstash for rate limiting before horizontal scaling.

## Known Local Environment Notes

- Docker is not currently available in PATH on this machine.
- Prisma DB integration can be schema-validated, but real DB flow needs Postgres installed/running.
- Expo Web has been testable at `http://localhost:8081`.
- Render URL configured for cloud testing: `https://check-in-board.onrender.com`.
- Current rate limiting uses in-memory storage, which is fine for one Render instance; scaling to multiple instances should move rate-limit state to Redis/Upstash.
