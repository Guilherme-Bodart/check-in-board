import type {
  ApartmentFieldErrors,
  ApartmentFormValues,
  CreateApartmentInput,
  CreateIcalSourceInput,
  IcalSourceFieldErrors,
  IcalSourceFormValues,
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

export function normalizeIcalSourceValues(
  values: IcalSourceFormValues,
): IcalSourceFormValues {
  return {
    icalUrl: values.icalUrl.trim(),
    label: values.label.trim(),
    provider: values.provider.trim().toLowerCase(),
  };
}

export function validateIcalSourceValues(
  values: IcalSourceFormValues,
): IcalSourceFieldErrors {
  const normalized = normalizeIcalSourceValues(values);
  const errors: IcalSourceFieldErrors = {};

  if (!normalized.provider) {
    errors.provider = "Provider is required.";
  }

  if (!normalized.label) {
    errors.label = "Label is required.";
  }

  if (!normalized.icalUrl) {
    errors.icalUrl = "iCal URL is required.";
  } else if (!/^https?:\/\/.+/i.test(normalized.icalUrl)) {
    errors.icalUrl = "Enter a valid http or https iCal URL.";
  }

  return errors;
}

export function hasIcalSourceErrors(errors: IcalSourceFieldErrors) {
  return Object.values(errors).some(Boolean);
}

export function toCreateIcalSourceInput(
  values: IcalSourceFormValues,
): CreateIcalSourceInput {
  const normalized = normalizeIcalSourceValues(values);

  return {
    icalUrl: normalized.icalUrl,
    label: normalized.label,
    provider: normalized.provider,
  };
}
