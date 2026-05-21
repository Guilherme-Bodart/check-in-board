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
