import { describe, expect, it } from "vitest";

import { parseEnv } from "../../shared/env.js";
import type { AuthRepository } from "./repository.js";
import { signUpWithDevAuth } from "./service.js";
import type {
  AuthMembership,
  AuthOrganization,
  AuthUser,
  AuthenticatedUser,
} from "./types.js";

class InMemoryAuthRepository implements AuthRepository {
  private users = new Map<string, AuthenticatedUser>();
  private usersByEmail = new Map<string, string>();
  private organizations = new Map<string, AuthOrganization>();
  private userSequence = 1;
  private organizationSequence = 1;
  private membershipSequence = 1;

  async findUserByEmail(email: string): Promise<AuthenticatedUser | null> {
    const userId = this.usersByEmail.get(email);
    return userId ? this.findUserById(userId) : null;
  }

  async findUserById(userId: string): Promise<AuthenticatedUser | null> {
    const user = this.users.get(userId);

    return user
      ? {
          ...user,
          memberships: user.memberships.map((membership) => ({
            ...membership,
            organization: { ...membership.organization },
          })),
        }
      : null;
  }

  async createUser(input: {
    email: string;
    fullName: string;
    authProvider: string;
    authSubject: string;
  }): Promise<AuthUser> {
    const id = `user-${this.userSequence++}`;
    const user: AuthenticatedUser = {
      email: input.email,
      fullName: input.fullName,
      id,
      memberships: [],
    };

    this.users.set(id, user);
    this.usersByEmail.set(input.email, id);

    return {
      email: user.email,
      fullName: user.fullName,
      id: user.id,
    };
  }

  async createOrganization(input: { name: string }): Promise<AuthOrganization> {
    const organization = {
      id: `org-${this.organizationSequence++}`,
      name: input.name,
    };

    this.organizations.set(organization.id, organization);

    return { ...organization };
  }

  async createOrganizationMembership(input: {
    organizationId: string;
    userId: string;
    role: AuthMembership["role"];
  }): Promise<AuthMembership> {
    const organization = this.organizations.get(input.organizationId);
    const user = this.users.get(input.userId);

    if (!organization || !user) {
      throw new Error("Missing organization or user.");
    }

    const membership: AuthMembership = {
      id: `membership-${this.membershipSequence++}`,
      isActive: true,
      organization: { ...organization },
      role: input.role,
    };

    user.memberships.push(membership);

    return {
      ...membership,
      organization: { ...membership.organization },
    };
  }
}

describe("signUpWithDevAuth", () => {
  it("creates a user, organization, and host admin membership", async () => {
    const repository = new InMemoryAuthRepository();
    const testEnv = parseEnv({
      AUTH_JWT_SECRET: "test-auth-secret-with-at-least-thirty-two-characters",
      DATABASE_URL:
        "postgresql://postgres:postgres@localhost:5432/check_in_board_test?schema=public",
      NODE_ENV: "test",
      SERVICE_NAME: "check-in-board-backend",
    });

    const result = await signUpWithDevAuth(
      {
        email: "host@example.com",
        fullName: "Host Admin",
        organizationName: "Host Ops",
      },
      repository,
      testEnv,
    );

    expect(result.user).toMatchObject({
      email: "host@example.com",
      fullName: "Host Admin",
    });
    expect(result.organization).toMatchObject({
      name: "Host Ops",
    });
    expect(result.accessToken).toEqual(expect.any(String));

    const storedUser = await repository.findUserByEmail("host@example.com");

    expect(storedUser).not.toBeNull();
    expect(storedUser?.memberships).toHaveLength(1);
    expect(storedUser?.memberships[0]).toMatchObject({
      isActive: true,
      role: "host_admin",
    });
    expect(storedUser?.memberships[0].organization).toMatchObject({
      name: "Host Ops",
    });
  });
});
