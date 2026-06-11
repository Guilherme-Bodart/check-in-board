import { apiRequest, type Owner, type OwnerType } from "../../api";

export type OwnerFormValues = {
  name: string;
  type: OwnerType;
  contactName?: string;
  email?: string;
  phone?: string;
  notes?: string;
};

function normalizeOwnerPayload(values: OwnerFormValues) {
  return {
    name: values.name.trim(),
    type: values.type,
    contactName: values.contactName?.trim() || null,
    email: values.email?.trim() || null,
    phone: values.phone?.trim() || null,
    notes: values.notes?.trim() || null,
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
