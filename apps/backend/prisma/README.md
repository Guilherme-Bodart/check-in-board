# Prisma modeling notes

This folder holds the initial Prisma data model for the backend MVP foundation.

## Decisions taken now

- PostgreSQL is the target datasource, following the project architecture.
- Prisma models use PascalCase and relation-friendly field names in code, while tables and columns map to `snake_case` with `@@map` and `@map`.
- `Role`, `TaskStatus`, `ReservationStatus`, `InvitationStatus`, and `SyncStatus` are enums to avoid magic strings in auth, tasks, reservations, invites, and sync flows.
- Enum values intentionally mirror the lowercase domain values already documented and shared in `packages/schemas` where those contracts exist.
- Main entities carry `created_at` and `updated_at`; sync and audit also preserve operational timestamps like `started_at` and `finished_at`.
- `Apartment.timezone` is explicit because scheduling, reservation windows, and task due dates depend on the apartment's local context even though timestamps are stored in UTC.
- `Reservation` is unique by `ical_source_id + external_event_key`, matching the idempotency rule from the architecture docs.
- `IcalSource` stores only the encrypted URL field (`ical_url_encrypted`) and sync metadata. The raw URL should never be logged or stored in plaintext.
- `Task` can optionally belong to a reservation so the schema supports both reservation-driven and manual tasks from the start.
- `Invitation` can optionally target a specific apartment, which gives us a path for apartment-scoped access without blocking future org-level invite flows.

## Expected refinements later

- Membership and user lifecycle statuses may become richer once auth and invitation flows are implemented.
- Provider-specific constraints for iCal sources can be tightened after we define the supported channel list.
- Task templates, device push tokens, and notification delivery tables are intentionally not modeled yet because they are outside this delivery.
- Audit taxonomy (`entity_type`, `action`) remains string-based for now until real domain events stabilize.
- Soft-delete coverage can expand as CRUD behavior and retention policies become clearer.

## How to validate after dependencies are installed

From the repository root:

```bash
cp apps/backend/.env.example apps/backend/.env
pnpm --filter @check-in-board/backend db:validate
pnpm --filter @check-in-board/backend db:generate
```

If you want Prisma to check the schema directly without the script:

```bash
pnpm --filter @check-in-board/backend exec prisma validate
```

`db:migrate:dev` was added for the next step, but no migration should be created until a real local database is configured.
