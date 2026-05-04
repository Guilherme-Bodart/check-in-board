import type { PrismaClient } from "@prisma/client";

import type {
  AuthMembership,
  AuthOrganization,
  AuthRole,
  AuthUser,
  AuthenticatedUser,
} from "./types.js";
import type {
  AuthRepository,
  CreateOrganizationInput,
  CreateOrganizationMembershipInput,
  CreateUserInput,
} from "./repository.js";

function mapUser(record: {
  id: string;
  email: string;
  fullName: string;
}): AuthUser {
  return {
    email: record.email,
    fullName: record.fullName,
    id: record.id,
  };
}

function mapOrganization(record: {
  id: string;
  name: string;
}): AuthOrganization {
  return {
    id: record.id,
    name: record.name,
  };
}

function mapMembership(record: {
  id: string;
  isActive: boolean;
  role: string;
  organization: {
    id: string;
    name: string;
  };
}): AuthMembership {
  return {
    id: record.id,
    isActive: record.isActive,
    organization: mapOrganization(record.organization),
    role: record.role as AuthRole,
  };
}

function mapAuthenticatedUser(record: {
  id: string;
  email: string;
  fullName: string;
  organizationMemberships: Array<{
    id: string;
    isActive: boolean;
    role: string;
    organization: {
      id: string;
      name: string;
    };
  }>;
}): AuthenticatedUser {
  return {
    ...mapUser(record),
    memberships: record.organizationMemberships.map(mapMembership),
  };
}

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findUserByEmail(email: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      include: {
        organizationMemberships: {
          include: {
            organization: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      where: {
        email,
      },
    });

    return user ? mapAuthenticatedUser(user) : null;
  }

  async findUserById(userId: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      include: {
        organizationMemberships: {
          include: {
            organization: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      where: {
        id: userId,
      },
    });

    return user ? mapAuthenticatedUser(user) : null;
  }

  async createUser(input: CreateUserInput): Promise<AuthUser> {
    const user = await this.prisma.user.create({
      data: {
        authProvider: input.authProvider,
        authSubject: input.authSubject,
        email: input.email,
        fullName: input.fullName,
      },
    });

    return mapUser(user);
  }

  async createOrganization(
    input: CreateOrganizationInput,
  ): Promise<AuthOrganization> {
    const organization = await this.prisma.organization.create({
      data: {
        name: input.name,
      },
    });

    return mapOrganization(organization);
  }

  async createOrganizationMembership(
    input: CreateOrganizationMembershipInput,
  ): Promise<AuthMembership> {
    const membership = await this.prisma.organizationMembership.create({
      data: {
        organizationId: input.organizationId,
        role: input.role,
        userId: input.userId,
      },
      include: {
        organization: true,
      },
    });

    return mapMembership(membership);
  }
}
