# Check-In Board

Check-In Board is a mobile-first operational app for short-term rental hosts who need a simple view of reservations, check-ins, check-outs, and tasks across multiple apartments and booking channels.

The first MVP focuses on:

- mobile-only usage for iPhone and Android;
- multi-apartment operations;
- multiple iCal sources per apartment;
- role-based access per apartment;
- operational tasks before and after stays;
- simple, low-cost validation before deeper channel integrations.

## Planning Documents

- [Implementation Blueprint](docs/implementation-blueprint.md)
- [Product Plan](docs/product-plan.md)
- [Technical Architecture](docs/technical-architecture.md)
- [Design System](docs/design-system.md)
- [Engineering Standards](docs/engineering-standards.md)
- [Backlog](docs/backlog.md)
- [Agent Workflow](docs/agent-workflow.md)
- [Pre-Coding Checklist](docs/pre-coding-checklist.md)

## Current Status

The project has a planning foundation, mobile app foundation, backend foundation, Prisma data model, and development auth flow.

## Local Development

Start Postgres:

```bash
docker compose up -d postgres
```

Prepare the backend database:

```bash
cp apps/backend/.env.example apps/backend/.env
pnpm --filter @check-in-board/backend db:generate
pnpm --filter @check-in-board/backend db:push
```

Run the apps:

```bash
pnpm dev:backend
pnpm dev:mobile
```
