import { describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { parseEnv } from "../../shared/env.js";
import type { AuthRepository } from "./repository.js";
import type {
  AuthMembership,
  AuthOrganization,
  AuthUser,
  AuthenticatedUser,
  AuthenticatedUserWithPassword,
  PasswordResetTokenRecord,
} from "./types.js";

class InMemoryAuthRepository implements AuthRepository {
  private users = new Map<string, AuthenticatedUserWithPassword>();
  private usersByEmail = new Map<string, string>();
  private passwordResetTokens = new Map<string, PasswordResetTokenRecord>();
  private organizations = new Map<string, AuthOrganization>();
  private userSequence = 1;
  private organizationSequence = 1;
  private membershipSequence = 1;

  async findUserByEmail(email: string): Promise<AuthenticatedUser | null> {
    const userId = this.usersByEmail.get(email);
    return userId ? this.findUserById(userId) : null;
  }

  async findUserCredentialByEmail(
    email: string,
  ): Promise<AuthenticatedUserWithPassword | null> {
    const user = await this.findUserByEmail(email);

    return user
      ? {
          ...user,
          passwordHash: this.users.get(user.id)?.passwordHash ?? null,
        }
      : null;
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
    passwordHash?: string | null;
  }): Promise<AuthUser> {
    const id = `user-${this.userSequence++}`;
    const user: AuthenticatedUserWithPassword = {
      email: input.email,
      fullName: input.fullName,
      id,
      memberships: [],
      passwordHash: input.passwordHash ?? null,
    };

    this.users.set(id, user);
    this.usersByEmail.set(input.email, id);

    return {
      email: user.email,
      fullName: user.fullName,
      id: user.id,
    };
  }

  async updateUserPasswordHash(
    userId: string,
    passwordHash: string,
  ): Promise<AuthUser> {
    const user = this.users.get(userId);

    if (!user) {
      throw new Error("Missing user.");
    }

    user.passwordHash = passwordHash;

    return {
      email: user.email,
      fullName: user.fullName,
      id: user.id,
    };
  }

  async createPasswordResetToken(input: {
    expiresAt: Date;
    tokenHash: string;
    userId: string;
  }): Promise<PasswordResetTokenRecord> {
    const token = {
      expiresAt: input.expiresAt.toISOString(),
      id: `reset-${this.passwordResetTokens.size + 1}`,
      usedAt: null,
      userId: input.userId,
    };

    this.passwordResetTokens.set(input.tokenHash, token);

    return token;
  }

  async findPasswordResetTokenByHash(
    tokenHash: string,
  ): Promise<PasswordResetTokenRecord | null> {
    return this.passwordResetTokens.get(tokenHash) ?? null;
  }

  async markPasswordResetTokenUsed(tokenId: string): Promise<void> {
    for (const [hash, token] of this.passwordResetTokens.entries()) {
      if (token.id === tokenId) {
        this.passwordResetTokens.set(hash, {
          ...token,
          usedAt: new Date().toISOString(),
        });
      }
    }
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

function buildTestEnv(nodeEnv: "test" | "production" = "test") {
  return parseEnv({
    AUTH_PASSWORD_RESET_EXPOSE_TOKEN: "true",
    AUTH_JWT_SECRET: "test-auth-secret-with-at-least-thirty-two-characters",
    DATABASE_URL:
      "postgresql://postgres:postgres@localhost:5432/check_in_board_test?schema=public",
    NODE_ENV: nodeEnv,
    SERVICE_NAME: "check-in-board-backend",
  });
}

describe("auth routes", () => {
  it("creates and signs in with email and password", async () => {
    const app = buildApp({
      authRepository: new InMemoryAuthRepository(),
      env: buildTestEnv("production"),
    });

    const signUpResponse = await app.inject({
      method: "POST",
      payload: {
        email: "host@example.com",
        fullName: "Host Admin",
        organizationName: "Host Ops",
        password: "secure-password",
      },
      url: "/auth/sign-up",
    });

    expect(signUpResponse.statusCode).toBe(201);
    expect(signUpResponse.json()).toMatchObject({
      accessToken: expect.any(String),
      organization: {
        name: "Host Ops",
      },
      user: {
        email: "host@example.com",
        fullName: "Host Admin",
      },
    });

    const signInResponse = await app.inject({
      method: "POST",
      payload: {
        email: "host@example.com",
        password: "secure-password",
      },
      url: "/auth/sign-in",
    });

    expect(signInResponse.statusCode).toBe(200);
    expect(signInResponse.json()).toMatchObject({
      accessToken: expect.any(String),
      user: {
        email: "host@example.com",
      },
    });

    await app.close();
  });

  it("rejects incorrect passwords", async () => {
    const app = buildApp({
      authRepository: new InMemoryAuthRepository(),
      env: buildTestEnv("production"),
    });

    await app.inject({
      method: "POST",
      payload: {
        email: "host@example.com",
        fullName: "Host Admin",
        password: "secure-password",
      },
      url: "/auth/sign-up",
    });

    const response = await app.inject({
      method: "POST",
      payload: {
        email: "host@example.com",
        password: "wrong-password",
      },
      url: "/auth/sign-in",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Email or password is incorrect.",
      },
    });

    await app.close();
  });

  it("changes password for an authenticated user", async () => {
    const app = buildApp({
      authRepository: new InMemoryAuthRepository(),
      env: buildTestEnv("production"),
    });

    const signUpResponse = await app.inject({
      method: "POST",
      payload: {
        email: "host@example.com",
        fullName: "Host Admin",
        password: "secure-password",
      },
      url: "/auth/sign-up",
    });

    const changeResponse = await app.inject({
      headers: {
        authorization: `Bearer ${signUpResponse.json().accessToken}`,
      },
      method: "POST",
      payload: {
        currentPassword: "secure-password",
        newPassword: "new-secure-password",
      },
      url: "/auth/change-password",
    });

    expect(changeResponse.statusCode).toBe(200);

    const signInResponse = await app.inject({
      method: "POST",
      payload: {
        email: "host@example.com",
        password: "new-secure-password",
      },
      url: "/auth/sign-in",
    });

    expect(signInResponse.statusCode).toBe(200);

    await app.close();
  });

  it("resets password with an issued token", async () => {
    const app = buildApp({
      authRepository: new InMemoryAuthRepository(),
      env: buildTestEnv("production"),
    });

    await app.inject({
      method: "POST",
      payload: {
        email: "host@example.com",
        fullName: "Host Admin",
        password: "secure-password",
      },
      url: "/auth/sign-up",
    });

    const resetRequestResponse = await app.inject({
      method: "POST",
      payload: {
        email: "host@example.com",
      },
      url: "/auth/password-reset/request",
    });

    expect(resetRequestResponse.statusCode).toBe(202);
    const resetToken = resetRequestResponse.json().resetToken;
    expect(resetToken).toEqual(expect.any(String));

    const resetConfirmResponse = await app.inject({
      method: "POST",
      payload: {
        newPassword: "reset-secure-password",
        token: resetToken,
      },
      url: "/auth/password-reset/confirm",
    });

    expect(resetConfirmResponse.statusCode).toBe(200);

    const signInResponse = await app.inject({
      method: "POST",
      payload: {
        email: "host@example.com",
        password: "reset-secure-password",
      },
      url: "/auth/sign-in",
    });

    expect(signInResponse.statusCode).toBe(200);

    await app.close();
  });

  it("signs up with dev auth and returns the authenticated user", async () => {
    const app = buildApp({
      authRepository: new InMemoryAuthRepository(),
      env: buildTestEnv(),
    });

    const signUpResponse = await app.inject({
      method: "POST",
      payload: {
        email: "host@example.com",
        fullName: "Host Admin",
        organizationName: "Host Ops",
      },
      url: "/auth/dev/sign-up",
    });

    expect(signUpResponse.statusCode).toBe(200);

    const signUpPayload = signUpResponse.json();
    const meResponse = await app.inject({
      headers: {
        authorization: `Bearer ${signUpPayload.accessToken}`,
      },
      method: "GET",
      url: "/auth/me",
    });

    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.json()).toEqual({
      memberships: [
        {
          id: expect.any(String),
          isActive: true,
          organization: {
            id: expect.any(String),
            name: "Host Ops",
          },
          role: "host_admin",
        },
      ],
      user: {
        email: "host@example.com",
        fullName: "Host Admin",
        id: expect.any(String),
      },
    });

    await app.close();
  });

  it("rejects /auth/me without a bearer token", async () => {
    const app = buildApp({
      authRepository: new InMemoryAuthRepository(),
      env: buildTestEnv(),
    });

    const response = await app.inject({
      method: "GET",
      url: "/auth/me",
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

  it("blocks dev sign-up in production", async () => {
    const app = buildApp({
      authRepository: new InMemoryAuthRepository(),
      env: buildTestEnv("production"),
    });

    const response = await app.inject({
      method: "POST",
      payload: {
        email: "host@example.com",
        fullName: "Host Admin",
      },
      url: "/auth/dev/sign-up",
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: {
        code: "DEV_AUTH_DISABLED",
        message: "Dev auth is disabled in production.",
      },
    });

    await app.close();
  });
});
