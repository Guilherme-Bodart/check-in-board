# Current State

## Working Mode

- Default to one executor to reduce usage overhead.
- Use subagents only when parallel work clearly saves time.
- Prefer medium-sized deliverables with one review/check cycle.
- Keep this file updated after each meaningful implementation step.

## Last Published Commit

- `7f7bdae Add protected iCal sources flow`

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

## Test Status

Last full local validation:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- backend Prisma schema validate with temporary `DATABASE_URL`

## Current Test Coverage Shape

- Backend:
  - health route
  - dev auth service/routes
  - protected apartments routes
  - protected iCal source routes
  - iCal parser
  - reservation sync/listing routes
- Mobile:
  - auth form validation
  - apartment form validation
  - iCal source form validation
  - reservation period formatting

## Next Implementation Step

Connect reservations to the operational board and start task generation:

- derive check-in/check-out operational statuses from reservations;
- show reservation-driven rows on Today Board;
- create first task model flow for manual tasks or reservation-linked tasks;
- later replace manual sync text with queued/fetched iCal sync.

## Known Local Environment Notes

- Docker is not currently available in PATH on this machine.
- Prisma DB integration can be schema-validated, but real DB flow needs Postgres installed/running.
- Expo Web has been testable at `http://localhost:8081`.
