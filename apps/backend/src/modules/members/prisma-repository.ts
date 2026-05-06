import type { PrismaClient } from "@prisma/client";

import type {
  AcceptInvitationRecordInput,
  CreateInvitationRecordInput,
  MembersRepository,
} from "./repository.js";
import { getDefaultPermissions } from "./service.js";
import type {
  ApartmentMember,
  ApartmentMemberAccess,
  InvitationSummary,
} from "./types.js";

function toIsoString(value: Date) {
  return value.toISOString();
}

function mapInvitation(record: {
  apartmentId: string | null;
  email: string;
  expiresAt: Date;
  id: string;
  role: "co_host" | "team" | "host_admin";
  status: "pending" | "accepted" | "revoked" | "expired";
}): InvitationSummary {
  return {
    apartmentId: record.apartmentId,
    email: record.email,
    expiresAt: toIsoString(record.expiresAt),
    id: record.id,
    role: record.role === "host_admin" ? "co_host" : record.role,
    status: record.status,
  };
}

export class PrismaMembersRepository implements MembersRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async acceptInvitation(
    input: AcceptInvitationRecordInput,
  ): Promise<InvitationSummary> {
    return await this.prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.update({
        data: {
          acceptedAt: new Date(),
          status: "accepted",
        },
        where: {
          id: input.invitationId,
        },
      });

      await tx.organizationMembership.upsert({
        create: {
          organizationId: invitation.organizationId,
          role: invitation.role,
          userId: input.userId,
        },
        update: {
          isActive: true,
          role: invitation.role,
        },
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId: input.userId,
          },
        },
      });

      if (invitation.apartmentId) {
        await tx.apartmentMembership.upsert({
          create: {
            apartmentId: invitation.apartmentId,
            role: invitation.role,
            userId: input.userId,
            ...getDefaultPermissions(
              invitation.role === "host_admin" ? "co_host" : invitation.role,
            ),
          },
          update: {
            role: invitation.role,
            ...getDefaultPermissions(
              invitation.role === "host_admin" ? "co_host" : invitation.role,
            ),
          },
          where: {
            apartmentId_userId: {
              apartmentId: invitation.apartmentId,
              userId: input.userId,
            },
          },
        });
      }

      return mapInvitation(invitation);
    });
  }

  async createInvitation(
    input: CreateInvitationRecordInput,
  ): Promise<InvitationSummary> {
    const invitation = await this.prisma.invitation.create({
      data: {
        apartmentId: input.apartmentId,
        email: input.email,
        expiresAt: input.expiresAt,
        invitedByUserId: input.invitedByUserId,
        organizationId: input.organizationId,
        role: input.role,
        tokenHash: input.tokenHash,
      },
    });

    return mapInvitation(invitation);
  }

  async findInvitationByTokenHash(tokenHash: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: {
        tokenHash,
      },
    });

    return invitation
      ? {
          ...mapInvitation(invitation),
          tokenHash: invitation.tokenHash,
        }
      : null;
  }

  async getApartmentAccess(
    userId: string,
    apartmentId: string,
  ): Promise<ApartmentMemberAccess | null> {
    const membership = await this.prisma.apartmentMembership.findUnique({
      include: {
        apartment: true,
      },
      where: {
        apartmentId_userId: {
          apartmentId,
          userId,
        },
      },
    });

    return membership
      ? {
          apartmentId: membership.apartmentId,
          organizationId: membership.apartment.organizationId,
          role: membership.role,
        }
      : null;
  }

  async getUserEmail(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      select: {
        email: true,
      },
      where: {
        id: userId,
      },
    });

    return user?.email ?? null;
  }

  async listApartmentMembers(apartmentId: string): Promise<ApartmentMember[]> {
    const memberships = await this.prisma.apartmentMembership.findMany({
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      where: {
        apartmentId,
      },
    });

    return memberships.map((membership) => ({
      canManageIntegrations: membership.canManageIntegrations,
      canUpdateTaskStatus: membership.canUpdateTaskStatus,
      canView: membership.canView,
      email: membership.user.email,
      fullName: membership.user.fullName,
      id: membership.id,
      role: membership.role,
      userId: membership.userId,
    }));
  }
}
