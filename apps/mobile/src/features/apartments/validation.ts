import type {
  ApartmentFieldErrors,
  ApartmentFormValues,
  CreateApartmentInput,
} from "./types";

export const defaultApartmentTimezone = "America/Sao_Paulo";

export function normalizeApartmentValues(
  values: ApartmentFormValues,
): ApartmentFormValues {
  return {
    name: values.name.trim(),
    timezone: values.timezone.trim() || defaultApartmentTimezone,
  };
}

export function validateApartmentValues(
  values: ApartmentFormValues,
): ApartmentFieldErrors {
  const normalized = normalizeApartmentValues(values);
  const errors: ApartmentFieldErrors = {};

  if (!normalized.name) {
    errors.name = "Apartment name is required.";
  }

  if (!normalized.timezone) {
    errors.timezone = "Timezone is required.";
  }

  return errors;
}

export function hasApartmentErrors(errors: ApartmentFieldErrors) {
  return Object.values(errors).some(Boolean);
}

export function toCreateApartmentInput(
  values: ApartmentFormValues,
): CreateApartmentInput {
  const normalized = normalizeApartmentValues(values);

  return {
    name: normalized.name,
    timezone: normalized.timezone,
  };
}
