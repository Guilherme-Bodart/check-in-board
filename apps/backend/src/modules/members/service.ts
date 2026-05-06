import { createHash, randomBytes } from "node:crypto";

import type { MembersRepository } from "./repository.js";
import type { AcceptInvitationInput, CreateInvitationInput } from "./types.js";

export class MembersServiceError extends Error {
  constructor(
    public readonly code:
      | "FORBIDDEN"
      | "INVITATION_EMAIL_MISMATCH"
      | "INVITATION_EXPIRED"
      | "INVITATION_NOT_FOUND",
    message: string,
  ) {
    super(message);
  }
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createInvitationToken() {
  return randomBytes(32).toString("base64url");
}

function getDefaultPermissions(role: "co_host" | "team") {
  if (role === "team") {
    return {
      canManageIntegrations: false,
      canUpdateTaskStatus: true,
      canView: true,
    };
  }

  return {
    canManageIntegrations: false,
    canUpdateTaskStatus: false,
    canView: true,
  };
}

function assertHostAdmin(access: { role: string } | null) {
  if (access?.role !== "host_admin") {
    throw new MembersServiceError(
      "FORBIDDEN",
      "Only host admins can manage apartment members.",
    );
  }
}

export async function listApartmentMembersForUser(
  userId: string,
  apartmentId: string,
  repository: MembersRepository,
) {
  const access = await repository.getApartmentAccess(userId, apartmentId);

  if (!access) {
    throw new MembersServiceError(
      "FORBIDDEN",
      "You do not have access to this apartment.",
    );
  }

  return await repository.listApartmentMembers(apartmentId);
}

export async function createApartmentInvitation(
  input: CreateInvitationInput,
  repository: MembersRepository,
) {
  const access = await repository.getApartmentAccess(
    input.invitedByUserId,
    input.apartmentId,
  );

  assertHostAdmin(access);

  const token = createInvitationToken();
  const expiresAt = new Date();

  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitation = await repository.createInvitation({
    apartmentId: input.apartmentId,
    email: input.email,
    expiresAt,
    invitedByUserId: input.invitedByUserId,
    organizationId: access!.organizationId,
    role: input.role,
    tokenHash: hashToken(token),
  });

  return {
    ...invitation,
    token,
  };
}

export async function acceptApartmentInvitation(
  input: AcceptInvitationInput,
  repository: MembersRepository,
) {
  const invitation = await repository.findInvitationByTokenHash(
    hashToken(input.token),
  );

  if (!invitation || invitation.status !== "pending") {
    throw new MembersServiceError(
      "INVITATION_NOT_FOUND",
      "Invitation was not found or is no longer pending.",
    );
  }

  if (new Date(invitation.expiresAt) < new Date()) {
    throw new MembersServiceError(
      "INVITATION_EXPIRED",
      "Invitation has expired.",
    );
  }

  const userEmail = await repository.getUserEmail(input.userId);

  if (userEmail !== invitation.email) {
    throw new MembersServiceError(
      "INVITATION_EMAIL_MISMATCH",
      "This invitation belongs to another email.",
    );
  }

  return await repository.acceptInvitation({
    invitationId: invitation.id,
    userId: input.userId,
  });
}

export { getDefaultPermissions };
