import type { ApartmentsRepository } from "./repository.js";
import type { CreateApartmentInput } from "./types.js";

export class ApartmentsServiceError extends Error {
  constructor(
    public readonly code: "FORBIDDEN",
    message: string,
  ) {
    super(message);
  }
}

export async function listAccessibleApartments(
  userId: string,
  repository: ApartmentsRepository,
) {
  return await repository.listAccessibleApartments(userId);
}

export async function createApartmentForAuthenticatedUser(
  userId: string,
  input: CreateApartmentInput,
  repository: ApartmentsRepository,
) {
  const access = await repository.getPrimaryOrganizationAccess(userId);

  if (!access?.isActive || access.role !== "host_admin") {
    throw new ApartmentsServiceError(
      "FORBIDDEN",
      "You do not have permission to create apartments.",
    );
  }

  return await repository.createApartmentForUser({
    name: input.name,
    organizationId: access.organizationId,
    timezone: input.timezone,
    userId,
  });
}
