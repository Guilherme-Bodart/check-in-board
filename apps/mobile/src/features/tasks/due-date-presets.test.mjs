import { strict as assert } from "node:assert";
import test from "node:test";

import { getTaskDueDatePresetValue } from "./due-date-presets.ts";

const now = new Date("2026-05-05T12:34:00.000Z");

test("getTaskDueDatePresetValue creates a rounded two-hour preset", () => {
  assert.equal(
    getTaskDueDatePresetValue("inTwoHours", now),
    "2026-05-05T14:00:00.000Z",
  );
});

test("getTaskDueDatePresetValue creates tomorrow operation presets", () => {
  const tomorrowMorning = new Date(
    getTaskDueDatePresetValue("tomorrowMorning", now),
  );
  const tomorrowCheckoutPrep = new Date(
    getTaskDueDatePresetValue("tomorrowCheckoutPrep", now),
  );

  assert.equal(tomorrowMorning.getDate(), new Date(now).getDate() + 1);
  assert.equal(tomorrowMorning.getHours(), 9);
  assert.equal(tomorrowMorning.getMinutes(), 0);
  assert.equal(tomorrowCheckoutPrep.getDate(), new Date(now).getDate() + 1);
  assert.equal(tomorrowCheckoutPrep.getHours(), 11);
  assert.equal(tomorrowCheckoutPrep.getMinutes(), 0);
});
