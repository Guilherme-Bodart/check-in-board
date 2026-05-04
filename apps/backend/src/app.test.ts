import { describe, expect, it } from "vitest";

import { buildApp } from "./app.js";

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
  });
});
