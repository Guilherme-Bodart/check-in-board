import { apiRequest, type Owner, type OwnerType } from "../../api";

export const COMMISSION_PRESET_PERCENTS = [0, 10, 15, 20, 25] as const;

export function parseCommissionBps(value: string): number {
  const normalized = Number(value.trim().replace(",", "."));

  if (!Number.isFinite(normalized) || normalized < 0) {
    return 0;
  }

  return Math.min(10000, Math.round(normalized * 100));
}

export function formatCommissionPercent(bps?: number | null): string {
  const safeBps = typeof bps === "number" && Number.isFinite(bps) && bps >= 0 ? bps : 0;
  return String(safeBps / 100).replace(".", ",");
}

export type OwnerFormValues = {
  name: string;
  type: OwnerType;
  contactName?: string;
  email?: string;
  phone?: string;
  notes?: string;
  defaultCommissionBps?: number;
};

export type CreateOwnerPayload = {
  name: string;
  type: OwnerType;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  defaultCommissionBps?: number;
};

export type UpdateOwnerPayload = CreateOwnerPayload;

function normalizeOwnerPayload(values: OwnerFormValues): CreateOwnerPayload {
  return {
    name: values.name.trim(),
    type: values.type,
    contactName: values.contactName?.trim() || null,
    email: values.email?.trim() || null,
    phone: values.phone?.trim() || null,
    notes: values.notes?.trim() || null,
    ...(values.defaultCommissionBps !== undefined
      ? { defaultCommissionBps: values.defaultCommissionBps }
      : {}),
  };
}

export async function fetchOwners(token: string) {
  const response = await apiRequest<{ owners: Owner[] }>("/owners", { token });

  return response.owners;
}

export async function fetchOwner(token: string, ownerId: string) {
  const response = await apiRequest<{ owner: Owner }>(`/owners/${ownerId}`, {
    token,
  });

  return response.owner;
}

export async function createOwner(token: string, values: OwnerFormValues) {
  const response = await apiRequest<{ owner: Owner }>("/owners", {
    method: "POST",
    token,
    body: normalizeOwnerPayload(values),
  });

  return response.owner;
}

export async function updateOwner(
  token: string,
  ownerId: string,
  values: OwnerFormValues,
) {
  const response = await apiRequest<{ owner: Owner }>(`/owners/${ownerId}`, {
    method: "PUT",
    token,
    body: normalizeOwnerPayload(values),
  });

  return response.owner;
}

export async function deleteOwner(token: string, ownerId: string) {
  await apiRequest<void>(`/owners/${ownerId}`, {
    method: "DELETE",
    token,
  });
}
