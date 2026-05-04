import assert from "node:assert/strict";
import test from "node:test";

import {
  defaultApartmentTimezone,
  hasApartmentErrors,
  normalizeApartmentValues,
  normalizeIcalSourceValues,
  toCreateApartmentInput,
  toCreateIcalSourceInput,
  validateApartmentValues,
  validateIcalSourceValues,
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

test("validateIcalSourceValues requires provider, label, and http URL", () => {
  const errors = validateIcalSourceValues({
    icalUrl: "ftp://example.com/calendar.ics",
    label: "",
    provider: "",
  });

  assert.equal(errors.provider, "Provider is required.");
  assert.equal(errors.label, "Label is required.");
  assert.equal(errors.icalUrl, "Enter a valid http or https iCal URL.");
});

test("toCreateIcalSourceInput normalizes provider and trims payload", () => {
  assert.deepEqual(
    toCreateIcalSourceInput({
      icalUrl: " https://example.com/calendar.ics ",
      label: " Airbnb Main ",
      provider: " Airbnb ",
    }),
    {
      icalUrl: "https://example.com/calendar.ics",
      label: "Airbnb Main",
      provider: "airbnb",
    },
  );
  assert.deepEqual(
    normalizeIcalSourceValues({
      icalUrl: " http://example.com/a.ics ",
      label: " Booking ",
      provider: " Booking ",
    }),
    {
      icalUrl: "http://example.com/a.ics",
      label: "Booking",
      provider: "booking",
    },
  );
});
