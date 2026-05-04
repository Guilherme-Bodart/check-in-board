import { describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { parseEnv } from "../../shared/env.js";
import { issueAccessToken } from "../auth/token.js";
import type { AuthUser } from "../auth/types.js";
import type {
  ApartmentsRepository,
  CreateApartmentForUserInput,
} from "./repository.js";
import type { ApartmentSummary, PrimaryOrganizationAccess } from "./types.js";

type ScopedApartmentRecord = {
  apartment: ApartmentSummary;
  userId: string;
};

class InMemoryApartmentsRepository implements ApartmentsRepository {
  private apartments: ScopedApartmentRecord[] = [];
  private apartmentSequence = 1;
  private membershipSequence = 1;
  private primaryOrganizationAccess = new Map<
    string,
    PrimaryOrganizationAccess
  >();

  setPrimaryOrganizationAccess(access: PrimaryOrganizationAccess) {
    this.primaryOrganizationAccess.set(access.userId, access);
  }

  seedAccessibleApartment(userId: string, apartment: ApartmentSummary) {
    this.apartments.push({
      apartment,
      userId,
    });
  }

  async createApartmentForUser(
    input: CreateApartmentForUserInput,
  ): Promise<ApartmentSummary> {
    const apartment: ApartmentSummary = {
      id: `apartment-${this.apartmentSequence++}`,
      membership: {
        canManageIntegrations: true,
        canUpdateTaskStatus: true,
        canView: true,
        id: `apartment-membership-${this.membershipSequence++}`,
        role: "host_admin",
      },
      name: input.name,
      organizationId: input.organizationId,
      timezone: input.timezone,
    };

    this.apartments.push({
      apartment,
      userId: input.userId,
    });

    return apartment;
  }

  async getPrimaryOrganizationAccess(
    userId: string,
  ): Promise<PrimaryOrganizationAccess | null> {
    return this.primaryOrganizationAccess.get(userId) ?? null;
  }

  async listAccessibleApartments(userId: string): Promise<ApartmentSummary[]> {
    return this.apartments
      .filter((record) => record.userId === userId)
      .map((record) => record.apartment);
  }
}

function buildTestEnv() {
  return parseEnv({
    AUTH_JWT_SECRET: "test-auth-secret-with-at-least-thirty-two-characters",
    DATABASE_URL:
      "postgresql://postgres:postgres@localhost:5432/check_in_board_test?schema=public",
    NODE_ENV: "test",
    SERVICE_NAME: "check-in-board-backend",
  });
}

async function createAccessToken(user: AuthUser) {
  return await issueAccessToken(user, buildTestEnv());
}

describe("apartments routes", () => {
  it("returns 401 without a bearer token", async () => {
    const app = buildApp({
      apartmentsRepository: new InMemoryApartmentsRepository(),
      env: buildTestEnv(),
    });

    const response = await app.inject({
      method: "GET",
      url: "/apartments",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
      },
    });

    await app.close();
  });

  it("creates an apartment for the host admin and returns host admin membership", async () => {
    const repository = new InMemoryApartmentsRepository();
    const user: AuthUser = {
      email: "host@example.com",
      fullName: "Host Admin",
      id: "user-host",
    };

    repository.setPrimaryOrganizationAccess({
      isActive: true,
      organizationId: "org-1",
      role: "host_admin",
      userId: user.id,
    });

    const app = buildApp({
      apartmentsRepository: repository,
      env: buildTestEnv(),
    });

    const response = await app.inject({
      headers: {
        authorization: `Bearer ${await createAccessToken(user)}`,
      },
      method: "POST",
      payload: {
        name: "Ocean View",
        timezone: "America/Sao_Paulo",
      },
      url: "/apartments",
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      apartment: {
        id: expect.any(String),
        membership: {
          canManageIntegrations: true,
          canUpdateTaskStatus: true,
          canView: true,
          id: expect.any(String),
          role: "host_admin",
        },
        name: "Ocean View",
        organizationId: "org-1",
        timezone: "America/Sao_Paulo",
      },
    });

    const scopedApartments = await repository.listAccessibleApartments(user.id);

    expect(scopedApartments).toHaveLength(1);
    expect(scopedApartments[0]?.membership.role).toBe("host_admin");

    await app.close();
  });

  it("lists only apartments inside the authenticated user scope", async () => {
    const repository = new InMemoryApartmentsRepository();
    const hostUser: AuthUser = {
      email: "host@example.com",
      fullName: "Host Admin",
      id: "user-host",
    };
    const otherUser: AuthUser = {
      email: "other@example.com",
      fullName: "Other User",
      id: "user-other",
    };

    repository.seedAccessibleApartment(hostUser.id, {
      id: "apartment-1",
      membership: {
        canManageIntegrations: true,
        canUpdateTaskStatus: true,
        canView: true,
        id: "membership-1",
        role: "host_admin",
      },
      name: "Beach House",
      organizationId: "org-1",
      timezone: "America/Sao_Paulo",
    });
    repository.seedAccessibleApartment(hostUser.id, {
      id: "apartment-2",
      membership: {
        canManageIntegrations: false,
        canUpdateTaskStatus: true,
        canView: true,
        id: "membership-2",
        role: "team",
      },
      name: "City Loft",
      organizationId: "org-2",
      timezone: "America/New_York",
    });
    repository.seedAccessibleApartment(otherUser.id, {
      id: "apartment-3",
      membership: {
        canManageIntegrations: true,
        canUpdateTaskStatus: true,
        canView: true,
        id: "membership-3",
        role: "host_admin",
      },
      name: "Hidden Scope",
      organizationId: "org-3",
      timezone: "Europe/Lisbon",
    });

    const app = buildApp({
      apartmentsRepository: repository,
      env: buildTestEnv(),
    });

    const response = await app.inject({
      headers: {
        authorization: `Bearer ${await createAccessToken(hostUser)}`,
      },
      method: "GET",
      url: "/apartments",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      apartments: [
        {
          id: "apartment-1",
          membership: {
            canManageIntegrations: true,
            canUpdateTaskStatus: true,
            canView: true,
            id: "membership-1",
            role: "host_admin",
          },
          name: "Beach House",
          organizationId: "org-1",
          timezone: "America/Sao_Paulo",
        },
        {
          id: "apartment-2",
          membership: {
            canManageIntegrations: false,
            canUpdateTaskStatus: true,
            canView: true,
            id: "membership-2",
            role: "team",
          },
          name: "City Loft",
          organizationId: "org-2",
          timezone: "America/New_York",
        },
      ],
    });

    await app.close();
  });

  it("rejects apartment creation for non-host-admin organization access", async () => {
    const repository = new InMemoryApartmentsRepository();
    const user: AuthUser = {
      email: "team@example.com",
      fullName: "Team User",
      id: "user-team",
    };

    repository.setPrimaryOrganizationAccess({
      isActive: true,
      organizationId: "org-1",
      role: "team",
      userId: user.id,
    });

    const app = buildApp({
      apartmentsRepository: repository,
      env: buildTestEnv(),
    });

    const response = await app.inject({
      headers: {
        authorization: `Bearer ${await createAccessToken(user)}`,
      },
      method: "POST",
      payload: {
        name: "Unauthorized Apartment",
        timezone: "America/Sao_Paulo",
      },
      url: "/apartments",
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: {
        code: "FORBIDDEN",
        message: "You do not have permission to create apartments.",
      },
    });

    await app.close();
  });
});
