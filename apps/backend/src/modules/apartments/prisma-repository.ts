import type { PrismaClient } from "@prisma/client";

import type {
  ApartmentsRepository,
  CreateApartmentForUserInput,
} from "./repository.js";
import type {
  ApartmentMembership,
  ApartmentSummary,
  PrimaryOrganizationAccess,
} from "./types.js";

function mapApartmentMembership(record: {
  canManageIntegrations: boolean;
  canUpdateTaskStatus: boolean;
  canView: boolean;
  id: string;
  role: "host_admin" | "co_host" | "team";
}): ApartmentMembership {
  return {
    canManageIntegrations: record.canManageIntegrations,
    canUpdateTaskStatus: record.canUpdateTaskStatus,
    canView: record.canView,
    id: record.id,
    role: record.role,
  };
}

function mapApartment(record: {
  id: string;
  memberships: Array<{
    canManageIntegrations: boolean;
    canUpdateTaskStatus: boolean;
    canView: boolean;
    id: string;
    role: "host_admin" | "co_host" | "team";
  }>;
  name: string;
  organizationId: string;
  timezone: string;
}): ApartmentSummary {
  const membership = record.memberships[0];

  if (!membership) {
    throw new Error("Apartment membership is required.");
  }

  return {
    id: record.id,
    membership: mapApartmentMembership(membership),
    name: record.name,
    organizationId: record.organizationId,
    timezone: record.timezone,
  };
}

export class PrismaApartmentsRepository implements ApartmentsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createApartmentForUser(
    input: CreateApartmentForUserInput,
  ): Promise<ApartmentSummary> {
    return await this.prisma.$transaction(async (tx) => {
      const apartment = await tx.apartment.create({
        data: {
          name: input.name,
          organizationId: input.organizationId,
          timezone: input.timezone,
        },
      });

      await tx.apartmentMembership.upsert({
        create: {
          apartmentId: apartment.id,
          canManageIntegrations: true,
          canUpdateTaskStatus: true,
          canView: true,
          role: "host_admin",
          userId: input.userId,
        },
        update: {
          canManageIntegrations: true,
          canUpdateTaskStatus: true,
          canView: true,
          role: "host_admin",
        },
        where: {
          apartmentId_userId: {
            apartmentId: apartment.id,
            userId: input.userId,
          },
        },
      });

      const createdApartment = await tx.apartment.findUnique({
        include: {
          memberships: {
            take: 1,
            where: {
              userId: input.userId,
            },
          },
        },
        where: {
          id: apartment.id,
        },
      });

      if (!createdApartment) {
        throw new Error("Apartment creation failed.");
      }

      return mapApartment(createdApartment);
    });
  }

  async getPrimaryOrganizationAccess(
    userId: string,
  ): Promise<PrimaryOrganizationAccess | null> {
    const membership = await this.prisma.organizationMembership.findFirst({
      orderBy: {
        createdAt: "asc",
      },
      where: {
        userId,
      },
    });

    return membership
      ? {
          isActive: membership.isActive,
          organizationId: membership.organizationId,
          role: membership.role,
          userId: membership.userId,
        }
      : null;
  }

  async listAccessibleApartments(userId: string): Promise<ApartmentSummary[]> {
    const apartments = await this.prisma.apartment.findMany({
      include: {
        memberships: {
          take: 1,
          where: {
            canView: true,
            userId,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
      where: {
        memberships: {
          some: {
            canView: true,
            userId,
          },
        },
      },
    });

    return apartments.map(mapApartment);
  }
}
