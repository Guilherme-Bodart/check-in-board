import type { IcalSourcesRepository } from "./repository.js";
import type { CreateIcalSourceInput } from "./types.js";

export class IcalSourcesServiceError extends Error {
  constructor(
    public readonly code: "FORBIDDEN",
    message: string,
  ) {
    super(message);
  }
}

function encodeIcalUrl(icalUrl: string): string {
  // TODO: replace this placeholder with real encryption before production.
  return Buffer.from(icalUrl, "utf8").toString("base64");
}

function canManageIcalSources(access: {
  canManageIntegrations: boolean;
  role: string;
}) {
  return access.role === "host_admin" || access.canManageIntegrations;
}

export async function listIcalSourcesForApartment(
  userId: string,
  apartmentId: string,
  repository: IcalSourcesRepository,
) {
  const access = await repository.getApartmentAccess(userId, apartmentId);

  if (!access?.canView) {
    throw new IcalSourcesServiceError(
      "FORBIDDEN",
      "You do not have access to this apartment.",
    );
  }

  return await repository.listIcalSources(apartmentId);
}

export async function createIcalSourceForApartment(
  userId: string,
  input: CreateIcalSourceInput,
  repository: IcalSourcesRepository,
) {
  const access = await repository.getApartmentAccess(userId, input.apartmentId);

  if (!access || !canManageIcalSources(access)) {
    throw new IcalSourcesServiceError(
      "FORBIDDEN",
      "You do not have permission to manage iCal sources.",
    );
  }

  return await repository.createIcalSource({
    ...input,
    icalUrlEncrypted: encodeIcalUrl(input.icalUrl),
  });
}
