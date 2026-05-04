import type {
  AuthFieldErrors,
  AuthFormValues,
  AuthMode,
  AuthSubmitInput,
} from "./types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeAuthValues(values: AuthFormValues): AuthFormValues {
  return {
    email: values.email.trim().toLowerCase(),
    name: values.name.trim(),
    organizationName: values.organizationName.trim(),
  };
}

export function validateAuthValues(
  mode: AuthMode,
  values: AuthFormValues,
): AuthFieldErrors {
  const normalized = normalizeAuthValues(values);
  const errors: AuthFieldErrors = {};

  if (!normalized.email) {
    errors.email = "Email is required.";
  } else if (!emailPattern.test(normalized.email)) {
    errors.email = "Enter a valid email.";
  }

  if (mode === "create" && !normalized.name) {
    errors.name = "Name is required to create an account.";
  }

  return errors;
}

export function hasAuthErrors(errors: AuthFieldErrors) {
  return Object.values(errors).some(Boolean);
}

export function toSubmitInput(
  mode: AuthMode,
  values: AuthFormValues,
): AuthSubmitInput {
  const normalized = normalizeAuthValues(values);

  return {
    email: normalized.email,
    mode,
    name: normalized.name || undefined,
    organizationName: normalized.organizationName || undefined,
  };
}
