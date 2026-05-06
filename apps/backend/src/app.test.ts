import { describe, expect, it } from "vitest";

import { buildApp } from "./app.js";
import { parseEnv } from "./shared/env.js";

describe("health route", () => {
  it("returns service health metadata", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      service: "check-in-board-backend",
      status: "ok",
    });
    expect(response.json().timestamp).toEqual(expect.any(String));

    await app.close();
  });
});

describe("rate limiting", () => {
  it("limits repeated requests by IP outside test env allowlist", async () => {
    const app = buildApp({
      env: parseEnv({
        AUTH_JWT_SECRET: "test-auth-secret-with-at-least-thirty-two-characters",
        DATABASE_URL:
          "postgresql://postgres:postgres@localhost:5432/check_in_board_test?schema=public",
        NODE_ENV: "production",
        RATE_LIMIT_GLOBAL_MAX: "1",
        RATE_LIMIT_GLOBAL_WINDOW: "1 minute",
        SERVICE_NAME: "check-in-board-backend",
      }),
    });

    const firstResponse = await app.inject({
      method: "GET",
      remoteAddress: "203.0.113.10",
      url: "/health",
    });
    const secondResponse = await app.inject({
      method: "GET",
      remoteAddress: "203.0.113.10",
      url: "/health",
    });

    expect(firstResponse.statusCode).toBe(200);
    expect(secondResponse.statusCode).toBe(429);

    await app.close();
  });
});
