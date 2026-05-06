import { describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { parseEnv } from "../../shared/env.js";
import { issueAccessToken } from "../auth/token.js";
import type { AuthUser } from "../auth/types.js";
import type {
  AcceptInvitationRecordInput,
  CreateInvitationRecordInput,
  MembersRepository,
} from "./repository.js";
import type {
  ApartmentMember,
  ApartmentMemberAccess,
  InvitationSummary,
} from "./types.js";

class InMemoryMembersRepository implements MembersRepository {
  private accessByUserAndApartment = new Map<string, ApartmentMemberAccess>();
  private invitations = new Map<
    string,
    InvitationSummary & { tokenHash: string; organizationId: string }
  >();
  private membersByApartment = new Map<string, ApartmentMember[]>();
  private userEmails = new Map<string, string>();
  private invitationSequence = 1;
  private memberSequence = 1;

  setApartmentAccess(userId: string, access: ApartmentMemberAccess) {
    this.accessByUserAndApartment.set(
      `${userId}:${access.apartmentId}`,
      access,
    );
  }

  setUser(user: AuthUser) {
    this.userEmails.set(user.id, user.email);
  }

  seedMember(apartmentId: string, member: ApartmentMember) {
    const currentMembers = this.membersByApartment.get(apartmentId) ?? [];
    this.membersByApartment.set(apartmentId, [...currentMembers, member]);
  }

  async acceptInvitation(
    input: AcceptInvitationRecordInput,
  ): Promise<InvitationSummary> {
    const invitation = [...this.invitations.values()].find(
      (currentInvitation) => currentInvitation.id === input.invitationId,
    );

    if (!invitation) {
      throw new Error("Missing invitation.");
    }

    invitation.status = "accepted";

    if (invitation.apartmentId) {
      this.seedMember(invitation.apartmentId, {
        canManageIntegrations: false,
        canUpdateTaskStatus: invitation.role === "team",
        canView: true,
        email: invitation.email,
        fullName: "Invited User",
        id: `member-${this.memberSequence++}`,
        role: invitation.role,
        userId: input.userId,
      });
    }

    return invitation;
  }

  async createInvitation(
    input: CreateInvitationRecordInput,
  ): Promise<InvitationSummary> {
    const invitation = {
      apartmentId: input.apartmentId,
      email: input.email,
      expiresAt: input.expiresAt.toISOString(),
      id: `invitation-${this.invitationSequence++}`,
      organizationId: input.organizationId,
      role: input.role,
      status: "pending" as const,
      tokenHash: input.tokenHash,
    };

    this.invitations.set(input.tokenHash, invitation);

    return invitation;
  }

  async findInvitationByTokenHash(tokenHash: string) {
    return this.invitations.get(tokenHash) ?? null;
  }

  async getApartmentAccess(
    userId: string,
    apartmentId: string,
  ): Promise<ApartmentMemberAccess | null> {
    return this.accessByUserAndApartment.get(`${userId}:${apartmentId}`) ?? null;
  }

  async getUserEmail(userId: string): Promise<string | null> {
    return this.userEmails.get(userId) ?? null;
  }

  async listApartmentMembers(apartmentId: string): Promise<ApartmentMember[]> {
    return this.membersByApartment.get(apartmentId) ?? [];
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

describe("member routes", () => {
  it("lets host admin invite and invited user accept apartment membership", async () => {
    const repository = new InMemoryMembersRepository();
    const host: AuthUser = {
      email: "host@example.com",
      fullName: "Host Admin",
      id: "user-host",
    };
    const invitedUser: AuthUser = {
      email: "team@example.com",
      fullName: "Team User",
      id: "user-team",
    };

    repository.setUser(host);
    repository.setUser(invitedUser);
    repository.setApartmentAccess(host.id, {
      apartmentId: "apartment-1",
      organizationId: "organization-1",
      role: "host_admin",
    });
    repository.seedMember("apartment-1", {
      canManageIntegrations: true,
      canUpdateTaskStatus: true,
      canView: true,
      email: host.email,
      fullName: host.fullName,
      id: "member-host",
      role: "host_admin",
      userId: host.id,
    });

    const app = buildApp({
      env: buildTestEnv(),
      membersRepository: repository,
    });
    const inviteResponse = await app.inject({
      headers: {
        authorization: `Bearer ${await createAccessToken(host)}`,
      },
      method: "POST",
      payload: {
        email: invitedUser.email,
        role: "team",
      },
      url: "/apartments/apartment-1/invitations",
    });

    expect(inviteResponse.statusCode).toBe(201);
    expect(inviteResponse.json().invitation.token).toEqual(expect.any(String));

    const acceptResponse = await app.inject({
      headers: {
        authorization: `Bearer ${await createAccessToken(invitedUser)}`,
      },
      method: "POST",
      payload: {
        token: inviteResponse.json().invitation.token,
      },
      url: "/invitations/accept",
    });
    const membersResponse = await app.inject({
      headers: {
        authorization: `Bearer ${await createAccessToken(host)}`,
      },
      method: "GET",
      url: "/apartments/apartment-1/members",
    });

    expect(acceptResponse.statusCode).toBe(200);
    expect(membersResponse.statusCode).toBe(200);
    expect(membersResponse.json().members).toHaveLength(2);
    expect(membersResponse.json().members[1]).toMatchObject({
      canUpdateTaskStatus: true,
      email: invitedUser.email,
      role: "team",
    });

    await app.close();
  });

  it("blocks non-host-admin invitation creation", async () => {
    const repository = new InMemoryMembersRepository();
    const coHost: AuthUser = {
      email: "cohost@example.com",
      fullName: "Co Host",
      id: "user-cohost",
    };

    repository.setUser(coHost);
    repository.setApartmentAccess(coHost.id, {
      apartmentId: "apartment-1",
      organizationId: "organization-1",
      role: "co_host",
    });

    const app = buildApp({
      env: buildTestEnv(),
      membersRepository: repository,
    });
    const response = await app.inject({
      headers: {
        authorization: `Bearer ${await createAccessToken(coHost)}`,
      },
      method: "POST",
      payload: {
        email: "team@example.com",
        role: "team",
      },
      url: "/apartments/apartment-1/invitations",
    });

    expect(response.statusCode).toBe(403);

    await app.close();
  });
});
