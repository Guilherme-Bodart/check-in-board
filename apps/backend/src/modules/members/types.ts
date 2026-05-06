import type { AuthRole } from "../auth/types.js";

export type ApartmentMember = {
  canManageIntegrations: boolean;
  canUpdateTaskStatus: boolean;
  canView: boolean;
  email: string;
  fullName: string;
  id: string;
  role: AuthRole;
  userId: string;
};

export type ApartmentMemberAccess = {
  apartmentId: string;
  organizationId: string;
  role: AuthRole;
};

export type InvitationSummary = {
  apartmentId: string | null;
  email: string;
  expiresAt: string;
  id: string;
  role: AuthRole;
  status: "pending" | "accepted" | "revoked" | "expired";
  token?: string;
};

export type CreateInvitationInput = {
  apartmentId: string;
  email: string;
  invitedByUserId: string;
  role: Exclude<AuthRole, "host_admin">;
};

export type AcceptInvitationInput = {
  token: string;
  userId: string;
};
