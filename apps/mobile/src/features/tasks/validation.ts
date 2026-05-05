import type { CreateTaskInput, TaskFieldErrors, TaskFormValues } from "./types";

export function normalizeTaskValues(values: TaskFormValues): TaskFormValues {
  return {
    description: values.description.trim(),
    dueAt: values.dueAt.trim(),
    title: values.title.trim(),
  };
}

export function validateTaskValues(values: TaskFormValues): TaskFieldErrors {
  const normalized = normalizeTaskValues(values);
  const errors: TaskFieldErrors = {};

  if (!normalized.title) {
    errors.title = "Task title is required.";
  }

  if (!normalized.dueAt) {
    errors.dueAt = "Due date is required.";
  } else if (Number.isNaN(new Date(normalized.dueAt).getTime())) {
    errors.dueAt = "Use a valid ISO date, like 2026-05-05T14:00:00.000Z.";
  }

  return errors;
}

export function hasTaskErrors(errors: TaskFieldErrors) {
  return Object.values(errors).some(Boolean);
}

export function toCreateTaskInput(values: TaskFormValues): CreateTaskInput {
  const normalized = normalizeTaskValues(values);

  return {
    description: normalized.description || undefined,
    dueAt: new Date(normalized.dueAt).toISOString(),
    title: normalized.title,
  };
}
