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

## Add Spring backend scripts

Added:

- `pnpm dev:backend-spring`;
- `pnpm test:backend-spring`;
- `pnpm build:backend-spring`.

Validation:

- Ran `pnpm test:backend-spring`.

Best next step:

- Start migrating the auth module into Spring with endpoint parity for sign-up, sign-in, and `/auth/me`.
