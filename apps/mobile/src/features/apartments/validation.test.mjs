import assert from "node:assert/strict";
import test from "node:test";

import {
  defaultApartmentTimezone,
  hasApartmentErrors,
  normalizeApartmentValues,
  toCreateApartmentInput,
  validateApartmentValues,
} from "./validation.ts";

test("validateApartmentValues requires a name", () => {
  const errors = validateApartmentValues({
    name: "   ",
    timezone: defaultApartmentTimezone,
  });

  assert.equal(errors.name, "Apartment name is required.");
  assert.equal(hasApartmentErrors(errors), true);
});

test("normalizeApartmentValues restores the default timezone when blank", () => {
  assert.deepEqual(
    normalizeApartmentValues({
      name: "  Apto 204 ",
      timezone: "   ",
    }),
    {
      name: "Apto 204",
      timezone: defaultApartmentTimezone,
    },
  );
});

test("toCreateApartmentInput trims the payload before submit", () => {
  assert.deepEqual(
    toCreateApartmentInput({
      name: "  Studio 12B ",
      timezone: " America/Fortaleza ",
    }),
    {
      name: "Studio 12B",
      timezone: "America/Fortaleza",
    },
  );
});
