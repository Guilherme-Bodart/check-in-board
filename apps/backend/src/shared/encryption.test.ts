import { describe, expect, it } from "vitest";

import { parseEnv } from "./env.js";
import { decryptSecret, encryptSecret } from "./encryption.js";

const testEnv = parseEnv({
  AUTH_JWT_SECRET: "test-auth-secret-with-at-least-thirty-two-characters",
  DATABASE_URL:
    "postgresql://postgres:postgres@localhost:5432/check_in_board_test?schema=public",
  ICAL_URL_ENCRYPTION_KEY: "test-ical-key-with-at-least-thirty-two-chars",
  NODE_ENV: "test",
  SERVICE_NAME: "check-in-board-backend",
});

describe("secret encryption", () => {
  it("encrypts and decrypts stored secrets", () => {
    const value = "https://example.com/calendar.ics";
    const encrypted = encryptSecret(value, testEnv);

    expect(encrypted).not.toBe(value);
    expect(encrypted.startsWith("v1:")).toBe(true);
    expect(decryptSecret(encrypted, testEnv)).toBe(value);
  });

  it("can still decode legacy base64 values", () => {
    const value = "https://example.com/legacy.ics";
    const legacyValue = Buffer.from(value, "utf8").toString("base64");

    expect(decryptSecret(legacyValue, testEnv)).toBe(value);
  });
});
