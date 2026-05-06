export type MemberRole = "host_admin" | "co_host" | "team";

export type ApartmentMember = {
  canManageIntegrations: boolean;
  canUpdateTaskStatus: boolean;
  canView: boolean;
  email: string;
  fullName: string;
  id: string;
  role: MemberRole;
  userId: string;
};

export type InvitationRole = Exclude<MemberRole, "host_admin">;

export type CreateInvitationInput = {
  email: string;
  role: InvitationRole;
};

export type ApartmentInvitation = {
  apartmentId: string | null;
  email: string;
  expiresAt: string;
  id: string;
  role: InvitationRole;
  status: "pending" | "accepted" | "revoked" | "expired";
  token?: string;
};
