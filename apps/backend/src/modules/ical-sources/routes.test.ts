import { describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { parseEnv } from "../../shared/env.js";
import { issueAccessToken } from "../auth/token.js";
import type { AuthUser } from "../auth/types.js";
import type {
  CreateIcalSourceRecordInput,
  IcalSourcesRepository,
} from "./repository.js";
import type { ApartmentIcalAccess, IcalSourceSummary } from "./types.js";

class InMemoryIcalSourcesRepository implements IcalSourcesRepository {
  private accessByUserAndApartment = new Map<string, ApartmentIcalAccess>();
  private sourceSequence = 1;
  private sourcesByApartment = new Map<string, IcalSourceSummary[]>();
  encryptedUrls: string[] = [];

  setApartmentAccess(userId: string, access: ApartmentIcalAccess) {
    this.accessByUserAndApartment.set(
      `${userId}:${access.apartmentId}`,
      access,
    );
  }

  seedSource(apartmentId: string, source: IcalSourceSummary) {
    const existingSources = this.sourcesByApartment.get(apartmentId) ?? [];
    this.sourcesByApartment.set(apartmentId, [...existingSources, source]);
  }

  async createIcalSource(
    input: CreateIcalSourceRecordInput,
  ): Promise<IcalSourceSummary> {
    this.encryptedUrls.push(input.icalUrlEncrypted);

    const source: IcalSourceSummary = {
      id: `ical-source-${this.sourceSequence++}`,
      label: input.label,
      lastFailureAt: null,
      lastSuccessAt: null,
      provider: input.provider,
      syncEnabled: true,
    };

    this.seedSource(input.apartmentId, source);

    return source;
  }

  async getApartmentAccess(
    userId: string,
    apartmentId: string,
  ): Promise<ApartmentIcalAccess | null> {
    return this.accessByUserAndApartment.get(`${userId}:${apartmentId}`) ?? null;
  }

  async listIcalSources(apartmentId: string): Promise<IcalSourceSummary[]> {
    return this.sourcesByApartment.get(apartmentId) ?? [];
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

describe("iCal source routes", () => {
  it("returns 401 without a bearer token", async () => {
    const app = buildApp({
      env: buildTestEnv(),
      icalSourcesRepository: new InMemoryIcalSourcesRepository(),
    });

    const response = await app.inject({
      method: "GET",
      url: "/apartments/apartment-1/ical-sources",
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it("does not list sources without apartment access", async () => {
    const repository = new InMemoryIcalSourcesRepository();
    const user: AuthUser = {
      email: "host@example.com",
      fullName: "Host Admin",
      id: "user-host",
    };
    const app = buildApp({
      env: buildTestEnv(),
      icalSourcesRepository: repository,
    });

    const response = await app.inject({
      headers: {
        authorization: `Bearer ${await createAccessToken(user)}`,
      },
      method: "GET",
      url: "/apartments/apartment-1/ical-sources",
    });

    expect(response.statusCode).toBe(403);

    await app.close();
  });

  it("rejects creation when team cannot manage integrations", async () => {
    const repository = new InMemoryIcalSourcesRepository();
    const user: AuthUser = {
      email: "team@example.com",
      fullName: "Team User",
      id: "user-team",
    };

    repository.setApartmentAccess(user.id, {
      apartmentId: "apartment-1",
      canManageIntegrations: false,
      canView: true,
      role: "team",
    });

    const app = buildApp({
      env: buildTestEnv(),
      icalSourcesRepository: repository,
    });

    const response = await app.inject({
      headers: {
        authorization: `Bearer ${await createAccessToken(user)}`,
      },
      method: "POST",
      payload: {
        icalUrl: "https://example.com/calendar.ics",
        label: "Airbnb main",
        provider: "airbnb",
      },
      url: "/apartments/apartment-1/ical-sources",
    });

    expect(response.statusCode).toBe(403);

    await app.close();
  });

  it("lets host admin create a source without leaking the iCal URL", async () => {
    const repository = new InMemoryIcalSourcesRepository();
    const user: AuthUser = {
      email: "host@example.com",
      fullName: "Host Admin",
      id: "user-host",
    };

    repository.setApartmentAccess(user.id, {
      apartmentId: "apartment-1",
      canManageIntegrations: false,
      canView: true,
      role: "host_admin",
    });

    const app = buildApp({
      env: buildTestEnv(),
      icalSourcesRepository: repository,
    });

    const response = await app.inject({
      headers: {
        authorization: `Bearer ${await createAccessToken(user)}`,
      },
      method: "POST",
      payload: {
        icalUrl: "https://example.com/private-calendar.ics",
        label: "Airbnb main",
        provider: "airbnb",
      },
      url: "/apartments/apartment-1/ical-sources",
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      icalSource: {
        id: expect.any(String),
        label: "Airbnb main",
        lastFailureAt: null,
        lastSuccessAt: null,
        provider: "airbnb",
        syncEnabled: true,
      },
    });
    expect(JSON.stringify(response.json())).not.toContain(
      "private-calendar.ics",
    );
    expect(repository.encryptedUrls[0]).not.toBe(
      "https://example.com/private-calendar.ics",
    );

    await app.close();
  });
});
