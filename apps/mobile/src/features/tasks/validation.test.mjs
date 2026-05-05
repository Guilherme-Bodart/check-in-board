import assert from "node:assert/strict";
import test from "node:test";

import {
  hasTaskErrors,
  normalizeTaskValues,
  toCreateTaskInput,
  validateTaskValues,
} from "./validation.ts";

test("validateTaskValues requires a title and valid ISO due date", () => {
  const errors = validateTaskValues({
    description: "",
    dueAt: "tomorrow",
    title: " ",
  });

  assert.equal(errors.title, "Task title is required.");
  assert.equal(
    errors.dueAt,
    "Use a valid ISO date, like 2026-05-05T14:00:00.000Z.",
  );
  assert.equal(hasTaskErrors(errors), true);
});

test("toCreateTaskInput trims fields and omits empty description", () => {
  assert.deepEqual(
    toCreateTaskInput({
      description: " ",
      dueAt: "2026-05-05T14:00:00.000Z",
      title: "  Prepare apartment ",
    }),
    {
      description: undefined,
      dueAt: "2026-05-05T14:00:00.000Z",
      title: "Prepare apartment",
    },
  );
  assert.deepEqual(
    normalizeTaskValues({
      description: " Towels ",
      dueAt: " 2026-05-05T14:00:00.000Z ",
      title: " Cleaning ",
    }),
    {
      description: "Towels",
      dueAt: "2026-05-05T14:00:00.000Z",
      title: "Cleaning",
    },
  );
});
