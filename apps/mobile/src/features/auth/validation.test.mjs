import assert from "node:assert/strict";
import test from "node:test";

import {
  hasAuthErrors,
  normalizeAuthValues,
  toSubmitInput,
  validateAuthValues,
} from "./validation.ts";

test("validateAuthValues requires a valid email in all modes", () => {
  const errors = validateAuthValues("continue", {
    email: "wrong",
    name: "",
    organizationName: "",
  });

  assert.equal(errors.email, "Enter a valid email.");
});

test("validateAuthValues requires name only in create mode", () => {
  const continueErrors = validateAuthValues("continue", {
    email: "ops@example.com",
    name: "",
    organizationName: "",
  });
  const createErrors = validateAuthValues("create", {
    email: "ops@example.com",
    name: "",
    organizationName: "",
  });

  assert.equal(hasAuthErrors(continueErrors), false);
  assert.equal(createErrors.name, "Name is required to create an account.");
});

test("toSubmitInput trims values and omits empty optional fields", () => {
  const payload = toSubmitInput("create", {
    email: "  TEAM@EXAMPLE.COM ",
    name: "  Guilherme  ",
    organizationName: "  ",
  });

  assert.deepEqual(payload, {
    email: "team@example.com",
    mode: "create",
    name: "Guilherme",
    organizationName: undefined,
  });
  assert.deepEqual(
    normalizeAuthValues({
      email: " User@Example.com ",
      name: "  Ana ",
      organizationName: "  Ops ",
    }),
    {
      email: "user@example.com",
      name: "Ana",
      organizationName: "Ops",
    },
  );
});
