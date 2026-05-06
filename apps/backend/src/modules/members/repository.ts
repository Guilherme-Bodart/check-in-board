import type {
  ApartmentMember,
  ApartmentMemberAccess,
  InvitationSummary,
} from "./types.js";

export type CreateInvitationRecordInput = {
  apartmentId: string;
  email: string;
  expiresAt: Date;
  invitedByUserId: string;
  organizationId: string;
  role: "co_host" | "team";
  tokenHash: string;
};

export type AcceptInvitationRecordInput = {
  invitationId: string;
  userId: string;
};

export interface MembersRepository {
  acceptInvitation(
    input: AcceptInvitationRecordInput,
  ): Promise<InvitationSummary>;
  createInvitation(
    input: CreateInvitationRecordInput,
  ): Promise<InvitationSummary>;
  findInvitationByTokenHash(
    tokenHash: string,
  ): Promise<(InvitationSummary & { tokenHash: string }) | null>;
  getApartmentAccess(
    userId: string,
    apartmentId: string,
  ): Promise<ApartmentMemberAccess | null>;
  getUserEmail(userId: string): Promise<string | null>;
  listApartmentMembers(apartmentId: string): Promise<ApartmentMember[]>;
}
