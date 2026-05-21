# Java And Spring Engineering Standards

## Goal

This document defines how the Spring Boot backend should be built so the codebase stays clear while the product grows into a SaaS.

## Runtime And Tooling

- Use Java 21 as the production target.
- Use Spring Boot with Maven Wrapper from `apps/backend-spring`.
- Prefer explicit Java code over magic-heavy shortcuts.
- Do not require global Maven installation; use `mvnw` or `mvnw.cmd`.
- Keep the backend deployable as a standalone API service, separate from Vercel.

## Project Shape

Use package-by-feature for domain modules:

```text
com.checkinboard.backend
  config
  shared
    error
    security
    web
  modules
    auth
    apartments
    icalsources
    reservations
    tasks
    members
    audit
```

Each feature should usually have:

```text
<feature>
  <Feature>Controller.java
  <Feature>Service.java
  <Feature>Repository.java
  dto/
  model/
```

Keep controllers thin. Put business rules in services. Keep persistence details behind repositories.

## API Design

- Keep REST paths stable once introduced, and version or document intentional contract changes.
- Return JSON only.
- Use request and response DTOs instead of exposing JPA entities.
- Use Java `record` types for DTOs when they are simple data carriers.
- Validate request DTOs with Jakarta Bean Validation annotations.
- Keep error responses consistent:

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid request."
  }
}
```

## Validation

- Validate all external input at controller boundaries.
- Use `@Valid`, `@NotBlank`, `@Email`, `@Size`, and domain-specific checks.
- Keep validation messages short and user-safe.
- Never trust apartment, organization, or user IDs from the client without authorization checks.

## Persistence

- PostgreSQL is the source of truth.
- Use Flyway for schema migrations.
- Do not use Hibernate `ddl-auto=update` outside local experiments.
- Store timestamps in UTC.
- Use timezone fields on domain entities where product behavior needs local dates.
- Do not expose encrypted secrets or sensitive integration URLs through DTOs.

## Security

- Spring Security owns authentication and authorization boundaries.
- Protected endpoints must resolve the authenticated user before touching domain data.
- Authorization is centered on apartment access.
- Host-only actions must be enforced in services, not just hidden in the UI.
- Never log passwords, JWTs, iCal URLs, reset tokens, or invite tokens.
- Passwords must be hashed with a modern password encoder.
- New Spring-created passwords use BCrypt.
- Legacy password hashes from previous backend experiments are not part of the Spring cutover.

## Transactions

- Use `@Transactional` on service methods that change multiple records or need consistent reads.
- Keep transaction scopes small.
- Avoid doing slow external calls inside database transactions.

## Error Handling

- Use a global exception handler for API errors.
- Convert validation, auth, permission, and domain errors into the standard error shape.
- Keep internal exception messages out of public responses.

## Testing

- Every module should have focused service tests for domain rules.
- Controllers should have HTTP tests for status codes, validation, and error shapes.
- Persistence-heavy rules should use integration tests with a real database when possible.
- Test permissions aggressively: wrong apartment, wrong role, missing membership, expired invite.
- Prefer tests that protect product behavior over shallow coverage.

## OpenAPI

- Spring controllers and DTOs should generate OpenAPI.
- Web and mobile clients should eventually consume a generated TypeScript API client.
- Contract changes should be intentional and reviewed before updating clients.

## Style

- Prefer clear names over abbreviations.
- Prefer small methods with one domain idea.
- Prefer constructor injection.
- Avoid Lombok for now so the code remains easier to learn.
- Avoid static utility classes unless the logic is truly stateless and domain-neutral.
- Keep comments for why something is done, not what each line does.

## Migration Rule

The Spring backend is the new backend direction. Existing code can be used as product reference, but new Spring contracts should prioritize the SaaS shape we want for web and mobile clients.
