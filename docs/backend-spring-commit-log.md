# Backend Spring Commit Log

This file tracks the Spring backend migration commits and the next best step after each one.

## 0906c76 - Add Spring Boot backend scaffold

Created `apps/backend-spring` with:

- Spring Boot application entrypoint;
- Maven Wrapper;
- Spring Web;
- Spring Security;
- Spring Validation;
- Spring Data JPA;
- PostgreSQL driver;
- Flyway;
- Actuator;
- Springdoc OpenAPI;
- H2 runtime support for lightweight local tests.

Validation:

- Ran `apps/backend-spring/mvnw.cmd test`.

Best next step:

- Add project standards, API base configuration, a public health endpoint, a standard error response, and controller tests.

## 7c43f40 - Document Java backend standards

Added:

- Java and Spring engineering standards;
- backend Spring commit log;
- guidance for package structure, DTOs, validation, persistence, security, transactions, errors, tests, and OpenAPI.

Validation:

- Documentation-only commit.

Best next step:

- Implement the first API foundation commit with health, security defaults, error shape, and tests.

## 7601a9c - Add Spring API foundation

Added:

- `GET /health`;
- public `/actuator/health`;
- stateless Spring Security defaults;
- JSON auth error handler;
- standard API error response records;
- global exception handler;
- `application.yml` with service name, H2 fallback, Flyway, JPA validation, OpenAPI toggles, and port config;
- `MockMvc` tests for health, actuator health, and protected endpoint auth behavior;
- Maven Surefire test override to prevent local `DEBUG` environment values from making test logs noisy.

Validation:

- Ran `apps/backend-spring/mvnw.cmd clean test`.

Best next step:

- Add root scripts for running, testing, and building the Spring backend, then start the first domain migration with auth.

## bfd05a7 - Add Spring backend scripts

Added:

- `pnpm dev:backend-spring`;
- `pnpm test:backend-spring`;
- `pnpm build:backend-spring`.

Validation:

- Ran `pnpm test:backend-spring`.

Best next step:

- Start migrating the auth module into Spring with endpoint parity for sign-up, sign-in, and `/auth/me`.

## eecd80d - Add Spring auth schema migration

Added:

- Flyway migration for `users`;
- Flyway migration for `organizations`;
- Flyway migration for `organization_memberships`;
- role check constraint for `host_admin`, `co_host`, and `team`;
- basic indexes and uniqueness constraints used by auth.

Validation:

- Ran `pnpm test:backend-spring`.

Best next step:

- Add JPA entities, repositories, JWT issuing/verification, and password hashing for auth.

## 54a774d - Add Spring auth domain

Added:

- JPA entities for users, organizations, and organization memberships;
- Spring Data repositories;
- auth DTO records;
- auth service for sign-up, sign-in, and `/auth/me` response mapping;
- JWT service using HS256;
- BCrypt password encoder for new Spring-created users;
- app properties for service name and JWT secret.

Validation:

- Ran `pnpm test:backend-spring`.

Best next step:

- Expose auth controllers and wire JWT bearer authentication into Spring Security.

## 79abe12 - Add Spring auth endpoints

Added:

- `POST /auth/sign-up`;
- `POST /auth/sign-in`;
- `GET /auth/me`;
- bearer-token authentication filter;
- authenticated principal model;
- auth service exception handling through the standard error envelope;
- tests for sign-up, sign-in, duplicate email, invalid password, `/auth/me`, missing bearer token, and invalid payloads.

Validation:

- Ran `pnpm test:backend-spring`.

Best next step:

- Add password reset/change-password parity or start apartments, depending on whether account hardening or product flow continuity matters more for the next cut.

## 1628629 - Add Spring password reset schema

Added:

- Flyway migration for `password_reset_tokens`;
- hashed token storage instead of raw reset token storage;
- expiration and single-use columns;
- indexes for user lookup, token lookup, and token cleanup.

Validation:

- Ran `pnpm test:backend-spring`.

Best next step:

- Implement account password flows on top of the new schema.

## 2e9f8ef - Add Spring account password flows

Added:

- protected `POST /auth/change-password`;
- public `POST /auth/password-reset/request`;
- public `POST /auth/password-reset/confirm`;
- password reset token entity and repository;
- secure random reset tokens with SHA-256 token hashes;
- opt-in `AUTH_PASSWORD_RESET_EXPOSE_TOKEN` config for local/test flows before an email provider exists;
- tests for password change, wrong current password, reset token use, reset token reuse, and unknown reset email behavior.

Validation:

- Ran `pnpm test:backend-spring`;
- Ran `pnpm build:backend-spring`.

Best next step:

- Start the apartments module in Spring: schema, organization-scoped ownership, CRUD endpoints, and tests. This is the first product domain needed before the future frontend and mobile flows can share the same API.

## 896cf4a - Add Spring apartments schema

Added:

- Flyway migration for `apartments`;
- Flyway migration for `apartment_memberships`;
- organization ownership for apartments;
- timezone storage per apartment;
- soft delete column for apartments;
- apartment-scoped membership permissions for view, task status updates, and integration management.

Validation:

- Ran `pnpm test:backend-spring`.

Best next step:

- Add JPA entities, repositories, service rules, controllers, and tests for apartment CRUD.

## d8de1d5 - Add Spring apartments API

Added:

- `GET /apartments`;
- `POST /apartments`;
- `GET /apartments/{apartmentId}`;
- `PUT /apartments/{apartmentId}`;
- `DELETE /apartments/{apartmentId}`;
- JPA entities and repositories for apartments and apartment memberships;
- organization membership queries for host-admin authorization;
- timezone validation using Java `ZoneId`;
- soft-delete behavior for apartment removal;
- tests for create/list/detail, update/delete, invalid timezone, non-host create rejection, cross-organization manage rejection, and missing auth.

Validation:

- Ran `pnpm test:backend-spring`;
- Ran `pnpm build:backend-spring`.

Best next step:

- Start iCal source management in Spring: encrypted source URL storage, apartment access checks, create/list endpoints, and tests. That unlocks reservation ingestion after it.

## d822472 - Add Spring iCal source schema

Added:

- Flyway migration for `ical_sources`;
- apartment ownership for calendar sources;
- encrypted iCal URL storage column;
- sync status and sync metadata columns;
- soft delete column for future source removal;
- index for apartment-scoped sync queries.

Validation:

- Ran `pnpm test:backend-spring`.

Best next step:

- Add iCal source entities, encrypted URL handling, URL safety policy, endpoints, and tests.

## 94778db - Add Spring iCal source API

Added:

- `GET /apartments/{apartmentId}/ical-sources`;
- `POST /apartments/{apartmentId}/ical-sources`;
- JPA entity and repository for iCal sources;
- AES-GCM secret encryption service for iCal URLs;
- `ICAL_URL_ENCRYPTION_KEY` app config with JWT-secret fallback for local development;
- iCal URL safety policy for HTTP/HTTPS only, no credentials, no local hosts, and no private network targets;
- apartment access checks for listing;
- integration management checks for creation;
- tests for create/list, encrypted URL storage, missing management permission, private URL rejection, cross-apartment access rejection, and missing auth.

Validation:

- Ran `pnpm test:backend-spring`;
- Ran `pnpm build:backend-spring`.

Best next step:

- Start reservations ingestion in Spring: schema for reservations/sync runs, iCal parsing, listing reservations by apartment, and the first sync service tests.

## d6e158e - Update Spring iCal migration log

Added:

- Commit-log entry for the iCal source schema/API migration;
- next-step guidance toward reservation ingestion.

Validation:

- Documentation-only commit.

Best next step:

- Add reservation and sync-run persistence before implementing parser and sync endpoints.

## 01ba0a5 - Add Spring reservations schema

Added:

- Flyway migration for `reservations`;
- Flyway migration for `sync_runs`;
- reservation status constraints for `confirmed`, `cancelled`, and `missing_in_feed`;
- sync-run status constraints for `running`, `succeeded`, `failed`, and `skipped`;
- unique source/event key constraint for idempotent iCal upserts;
- indexes for apartment reservation lists, iCal source reservation lookup, and sync history.

Validation:

- Ran `pnpm test:backend-spring`.

Best next step:

- Implement the iCal parser, manual sync endpoint, reservation listing endpoint, and controller tests.

## a42f229 - Add Spring reservation sync API

Added:

- `GET /apartments/{apartmentId}/reservations`;
- `POST /ical-sources/{icalSourceId}/sync`;
- iCal4j-based parser for `VEVENT` reservations;
- JPA entities and repositories for reservations and sync runs;
- idempotent reservation upsert by iCal source and external event key;
- sync success/failure timestamps on iCal sources;
- apartment access checks for listing;
- integration-management checks for sync execution;
- tests for sync/list, idempotent update, permission rejection, apartment access rejection, and invalid iCal payloads.

Validation:

- Ran `pnpm test:backend-spring`;
- Ran `pnpm build:backend-spring`.

Best next step:

- Add stored URL sync: decrypt the saved iCal URL, fetch it with tight timeouts and bounded retries, then reuse the current parser/upsert pipeline. After that, start the first operational view APIs for the web/mobile experience.

## af3e451 - Add Spring stored iCal sync

Added:

- decryption support for stored iCal URLs;
- HTTP iCal feed client with timeout, no redirects, and bounded retry;
- sync by saved URL when `POST /ical-sources/{icalSourceId}/sync` is called without `icsText`;
- `GET /ical-sources/{icalSourceId}/sync-runs`;
- persisted failed sync runs by avoiding rollback for expected API sync errors;
- tests for stored URL sync, sync history, and failed fetch recording.

Validation:

- Ran `pnpm test:backend-spring`.

Best next step:

- Add operational board APIs that organize reservations into check-ins, check-outs, stays, and upcoming work.

## eebfaeb - Add Spring operations board API

Added:

- `GET /apartments/{apartmentId}/operations-board`;
- date/window parameters for predictable web and mobile views;
- apartment-timezone aware sections for check-ins, check-outs, in-house stays, and upcoming reservations;
- board totals and focused reservation cards;
- tests for board output and invalid window validation.

Validation:

- Ran `pnpm test:backend-spring`.

Best next step:

- Add tasks/checklists so the board can combine reservations with operational work.

## dd00394 - Add Spring tasks schema

Added:

- Flyway migration for `tasks`;
- optional reservation linkage;
- status lifecycle for `pending`, `done`, `not_done`, and `cancelled`;
- completion, assignment, creator, and status note columns;
- indexes for apartment due-date lists, status/due-date lookups, and reservation task lookup.

Validation:

- Ran `pnpm test:backend-spring`.

Best next step:

- Add task endpoints with host-admin creation and lightweight mobile status updates.

## 8703d76 - Add Spring tasks API

Added:

- `GET /apartments/{apartmentId}/tasks`;
- `POST /apartments/{apartmentId}/tasks`;
- `PATCH /tasks/{taskId}/status`;
- `GET /tasks/today`;
- JPA entity and repository for tasks;
- host-admin-only task creation;
- task status updates for host admins or members with `canUpdateTaskStatus`;
- note requirement for `not_done`;
- tests for create/list/today, updater permissions, missing not-done note, and create permission rejection.

Validation:

- Ran `pnpm test:backend-spring`.

Best next step:

- Create shared design tokens and start the web app shell so frontend and mobile can converge on the same product language.

## 5ed416c - Add shared design system and web app shell

Added:

- `packages/design-system` with shared palette, semantic colors, spacing, radius, typography tokens, and CSS variable helpers;
- mobile theme color/spacing/radius sources wired to the shared design system package;
- `apps/web` React/Vite app shell prepared for Vercel;
- web dashboard first screen with operational metrics, reservations/actions, iCal sync status, and field-task actions;
- root scripts for `pnpm dev:web` and `pnpm build:web`.

Validation:

- Ran `pnpm --filter @check-in-board/design-system typecheck`;
- Ran `pnpm --filter @check-in-board/mobile typecheck`;
- Ran `pnpm build:web`.

Best next step:

- Wire the web dashboard to real Spring endpoints, then add authenticated web flows for sign-in, apartment selection, board, reservations, iCal sources, and tasks.

## 0184fdf - Configure Spring CORS for web app

Added:

- `CORS_ALLOWED_ORIGINS` application setting;
- default local Vite origins for `http://localhost:5173` and `http://localhost:5174`;
- explicit Spring `CorsConfigurationSource` for authenticated browser calls;
- allowed HTTP methods and headers used by the web app.

Validation:

- Ran `pnpm build:backend-spring`.

Best next step:

- Connect the web app to real Spring endpoints now that browser requests are allowed.

## da14e59 - Connect web dashboard to Spring API

Added:

- API client for Spring requests and standard API error messages;
- local web session persistence with JWT bearer token;
- sign-in and first-account sign-up flows;
- apartment loading, selection, and first-apartment creation;
- live operations board data from `GET /apartments/{apartmentId}/operations-board`;
- live iCal source listing, source creation, and manual sync trigger;
- live task listing, task creation, and mark-done action;
- connected empty states and loading/error messages for the dashboard.

Validation:

- Ran `pnpm build:web`;
- Ran `pnpm build:backend-spring`.

Best next step:

- Add route structure and richer admin flows: edit apartment, manage team permissions, inspect sync history, and replace the single-page state with dedicated screens.

## 8173bdf - Document operations board contract

Added:

- golden contract documentation for `GET /apartments/{apartmentId}/operations-board`;
- field-by-field reference for `apartmentId`, `date`, `days`, `timezone`, board sections, reservation cards, and totals;
- frontend interpretation rules for `checkIns`, `checkOuts`, `inHouse`, and `upcoming`;
- guidance that the UI should preserve each section instead of flattening reservations into a single list.

Validation:

- Documentation-only commit.

Best next step:

- Migrate the web app from Vite to Next and make the operations board UI follow this contract directly.

## c0859ce - Migrate web app to Next

Added:

- Next App Router setup for `apps/web`;
- Vite entrypoint removal and Next scripts for dev, build, and start;
- `NEXT_PUBLIC_API_BASE_URL` support for browser API configuration;
- shared design-system CSS variables applied through the Next root layout;
- operations board rendering by contract section: `checkIns`, `checkOuts`, `inHouse`, and `upcoming`;
- local CORS default for `http://localhost:3000`;
- `.next/` ignored as build output.

Validation:

- Ran `pnpm build:web`;
- Ran `pnpm build:backend-spring`.

Best next step:

- Split the web app into dedicated Next screens for login, dashboard, apartments, iCal sources, tasks, and future admin views.

## f1be07b - Ignore generated Next env types

Added:

- `apps/web/next-env.d.ts` to `.gitignore`;
- removal of the generated Next environment type file from version control.

Validation:

- Confirmed the worktree stayed clean after starting the Next dev server.

Best next step:

- Keep using `next build` and `next dev` as the source of generated Next type files.

## a5725f3 - Refactor web dashboard into Next feature modules

Added:

- Next-style route entry with `src/app/page.tsx` delegating to a dashboard client boundary;
- `features/auth` for the authentication panel;
- `features/dashboard` for dashboard orchestration, API calls, types, operations-board view model, and UI sections;
- shared layout components for sidebar and workspace shell;
- shared UI components for messages and metric cards;
- `lib` helpers for session storage and date formatting;
- `src/app/globals.css` as the App Router global stylesheet.

Removed:

- monolithic `src/App.tsx`;
- dashboard-specific formatting helpers from the generic API client;
- stale reservation row CSS left over from the first dashboard pass.

Validation:

- Ran `pnpm --filter @check-in-board/web typecheck`;
- Ran `pnpm build:web`.

Best next step:

- Add route groups/screens for dashboard, apartments, iCal sources, tasks, and admin settings when those flows grow beyond the current single dashboard screen.

## 906c394 - Show reservation date ranges instead of times

Added:

- reservation cards now render date ranges instead of clock times;
- date-only formatting helper for reservation cards.

Validation:

- Ran `pnpm --filter @check-in-board/web typecheck`;
- Ran `pnpm build:web`.

Best next step:

- Fix the backend parser so all-day iCal dates are stored in the apartment timezone instead of UTC midnight.

## 261e571 - Parse all-day iCal reservations in apartment timezone

Added:

- apartment timezone passed into iCal parsing;
- all-day `VALUE=DATE` events converted at apartment local midnight;
- local datetime fallback converted with the apartment timezone instead of UTC;
- regression test for Airbnb-style all-day reservations in `America/Sao_Paulo`.

Validation:

- Ran `pnpm test:backend-spring`;
- Ran `pnpm --filter @check-in-board/web typecheck`.

Best next step:

- Re-sync affected iCal sources locally so previously stored UTC-midnight reservations are rewritten with the corrected timezone instants.

## 33905d8 - Document frontend product architecture

Added:

- product architecture document for the SaaS frontend direction;
- business model for organization, platform user, owner, apartment, iCal source, reservation, and task;
- owner separation between own/internal properties and third-party client properties;
- authenticated route plan for dashboard, apartments, clients, reservations, calendar, and settings;
- Tailwind/shadcn-style UI direction and implementation priorities.

Validation:

- Documentation-only commit.

Best next step:

- Start the Tailwind migration and authenticated route structure while keeping real API data where endpoints already exist.

## 37f90c1 - Add Tailwind authenticated web routes

Added:

- Tailwind CSS v4/PostCSS setup for the web app;
- authenticated App Router layout with fixed sidebar and clean header;
- `/login`, `/dashboard`, `/apartamentos`, `/clientes`, `/reservas`, `/calendario`, and `/configuracoes` routes;
- Tailwind rewrite of the existing dashboard components;
- real dashboard data under `/dashboard`;
- `Todos os apartamentos` aggregation in the dashboard by fetching each apartment board;
- Recharts operational volume chart from real board sections;
- apartments management screen consuming real `GET /apartments`;
- apartment create UI with optional iCal creation;
- clients/owners page scaffold for the upcoming backend owner model.

Validation:

- Ran `pnpm --filter @check-in-board/web typecheck`;
- Ran `pnpm build:web`.

Best next step:

- Implement the backend Owner model and Apartment -> Owner relationship, then replace the temporary owner UI note with persisted owner data.

## 07ae389 - Update frontend architecture log

Added:

- commit-log entry for the Tailwind authenticated route work;
- next-step guidance toward the backend owner model and persisted apartment-owner relationships.

Validation:

- Documentation-only commit.

Best next step:

- Add the owner foundation in Spring so apartments can belong either to the SaaS user/organization itself or to client owners.

## 75ecd7c - Add owner foundation to Spring backend

Added:

- Flyway migration for `owners`;
- required `apartments.owner_id` relationship;
- default internal owner per organization for own properties;
- owner creation during host sign-up;
- apartment response owner data;
- optional `ownerId` support on apartment create/update;
- apartment owner validation scoped to the active organization;
- regression coverage for default apartment owner behavior.

Validation:

- Ran `pnpm test:backend-spring`.

Best next step:

- Add owner CRUD endpoints so the frontend can manage clients and own-property buckets directly.

## 9ebf454 - Add owner management API

Added:

- `GET /owners`;
- `POST /owners`;
- `GET /owners/{ownerId}`;
- `PUT /owners/{ownerId}`;
- `DELETE /owners/{ownerId}`;
- owner DTOs, service rules, and controller;
- apartment counts per owner;
- delete conflict when an owner still has apartments linked;
- authorization rules for same-organization access and host-admin management;
- tests for list, create, update, delete, linked-apartment conflict, role rejection, and cross-organization rejection.

Validation:

- Ran `pnpm test:backend-spring`;
- Ran `git diff --check`.

Best next step:

- Connect `/clientes` and `/apartamentos` in the Next frontend to the real `/owners` API.

## 83e4300 - Connect owners to web management

Added:

- shared web `Owner` and `OwnerType` API types;
- owners API client helpers for list/create/update/delete;
- `/clientes` screen backed by real `/owners` data;
- owner summary metrics, search, type filter, create/edit/delete form, and linked-apartment delete guard;
- `/apartamentos` screen loading real apartments and owners together;
- apartment create/edit/delete flow with real `ownerId` selection;
- optional iCal creation while creating an apartment;
- dashboard API helpers for apartment update/delete and provider-aware iCal creation.

Validation:

- Ran `pnpm --filter @check-in-board/web typecheck`;
- Ran `pnpm --filter @check-in-board/web build`;
- Ran `git diff --check`.

Best next step:

- Improve admin UX around apartment details and iCal source management: show sources per apartment, allow source sync/history outside the dashboard, and add safer confirmation/modals instead of browser confirm.
