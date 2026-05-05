import assert from "node:assert/strict";
import test from "node:test";

import { formatReservationPeriod } from "./format.ts";

test("formatReservationPeriod formats check-in and check-out dates", () => {
  assert.equal(
    formatReservationPeriod(
      "2026-05-10T18:00:00.000Z",
      "2026-05-12T15:00:00.000Z",
    ),
    "May 10 -> May 12",
  );
});
