import { describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { parseEnv } from "../../shared/env.js";
import { issueAccessToken } from "../auth/token.js";
import type { AuthUser } from "../auth/types.js";
import type { ReservationsRepository } from "./repository.js";
import type {
  AccessibleReservationSummary,
  IcalSourceSyncTarget,
  ReservationSummary,
  UpsertReservationInput,
} from "./types.js";

class InMemoryReservationsRepository implements ReservationsRepository {
  private apartmentAccess = new Map<string, boolean>();
  private sourceTargets = new Map<string, IcalSourceSyncTarget>();
  private reservations = new Map<string, ReservationSummary>();
  private reservationSequence = 1;

  setApartmentCanView(userId: string, apartmentId: string, canView: boolean) {
    this.apartmentAccess.set(`${userId}:${apartmentId}`, canView);
  }

  setSourceTarget(userId: string, target: IcalSourceSyncTarget) {
    this.sourceTargets.set(`${userId}:${target.id}`, target);
  }

  async getApartmentCanView(
    userId: string,
    apartmentId: string,
  ): Promise<boolean> {
    return this.apartmentAccess.get(`${userId}:${apartmentId}`) ?? false;
  }

  async getIcalSourceSyncTarget(
    userId: string,
    icalSourceId: string,
  ): Promise<IcalSourceSyncTarget | null> {
    return this.sourceTargets.get(`${userId}:${icalSourceId}`) ?? null;
  }

  async listReservations(apartmentId: string): Promise<ReservationSummary[]> {
    return [...this.reservations.values()].filter(
      (reservation) => reservation.apartmentId === apartmentId,
    );
  }

  async listAccessibleReservationsForDate(
    userId: string,
    startsBefore: Date,
    endsAfter: Date,
  ): Promise<AccessibleReservationSummary[]> {
    if (!this.apartmentAccess.get(`${userId}:apartment-1`)) {
      return [];
    }

    return [...this.reservations.values()]
      .filter(
        (reservation) =>
          new Date(reservation.startsAt) < startsBefore &&
          new Date(reservation.endsAt) > endsAfter,
      )
      .map((reservation) => ({
        ...reservation,
        apartmentName: "Apto 204",
      }));
  }

  async upsertReservation(
    input: UpsertReservationInput,
  ): Promise<ReservationSummary> {
    const key = `${input.icalSourceId}:${input.externalEventKey}`;
    const existingReservation = this.reservations.get(key);
    const reservation: ReservationSummary = {
      apartmentId: input.apartmentId,
      endsAt: input.endsAt.toISOString(),
      externalEventKey: input.externalEventKey,
      externalUid: input.externalUid,
      icalSourceId: input.icalSourceId,
      id: existingReservation?.id ?? `reservation-${this.reservationSequence++}`,
      provider: "airbnb",
      rawSummary: input.rawSummary,
      startsAt: input.startsAt.toISOString(),
      status: "confirmed",
    };

    this.reservations.set(key, reservation);

    return reservation;
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

const sampleIcs = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:reservation-1@example.com
DTSTART:20260510T180000Z
DTEND:20260512T150000Z
SUMMARY:Reserved - Airbnb
END:VEVENT
END:VCALENDAR`;

describe("reservation routes", () => {
  it("requires apartment access to list reservations", async () => {
    const repository = new InMemoryReservationsRepository();
    const user: AuthUser = {
      email: "host@example.com",
      fullName: "Host Admin",
      id: "user-host",
    };
    const app = buildApp({
      env: buildTestEnv(),
      reservationsRepository: repository,
    });

    const response = await app.inject({
      headers: {
        authorization: `Bearer ${await createAccessToken(user)}`,
      },
      method: "GET",
      url: "/apartments/apartment-1/reservations",
    });

    expect(response.statusCode).toBe(403);

    await app.close();
  });

  it("syncs reservations idempotently from iCal text", async () => {
    const repository = new InMemoryReservationsRepository();
    const user: AuthUser = {
      email: "host@example.com",
      fullName: "Host Admin",
      id: "user-host",
    };

    repository.setSourceTarget(user.id, {
      apartmentId: "apartment-1",
      canManageIntegrations: true,
      canView: true,
      id: "ical-source-1",
      provider: "airbnb",
      role: "host_admin",
    });

    const app = buildApp({
      env: buildTestEnv(),
      reservationsRepository: repository,
    });
    const token = await createAccessToken(user);

    const firstSync = await app.inject({
      headers: {
        authorization: `Bearer ${token}`,
      },
      method: "POST",
      payload: {
        icsText: sampleIcs,
      },
      url: "/ical-sources/ical-source-1/sync",
    });
    const secondSync = await app.inject({
      headers: {
        authorization: `Bearer ${token}`,
      },
      method: "POST",
      payload: {
        icsText: sampleIcs,
      },
      url: "/ical-sources/ical-source-1/sync",
    });

    expect(firstSync.statusCode).toBe(200);
    expect(firstSync.json().summary).toEqual({
      eventsSeen: 1,
      reservationsUpserted: 1,
    });
    expect(secondSync.statusCode).toBe(200);
    expect(secondSync.json().reservations[0].id).toBe(
      firstSync.json().reservations[0].id,
    );
    expect(await repository.listReservations("apartment-1")).toHaveLength(1);

    await app.close();
  });

  it("builds today board rows from accessible reservations", async () => {
    const repository = new InMemoryReservationsRepository();
    const user: AuthUser = {
      email: "host@example.com",
      fullName: "Host Admin",
      id: "user-host",
    };

    repository.setApartmentCanView(user.id, "apartment-1", true);
    await repository.upsertReservation({
      apartmentId: "apartment-1",
      endsAt: new Date("2026-05-12T15:00:00.000Z"),
      externalEventKey: "reservation-1@example.com",
      externalUid: "reservation-1@example.com",
      icalSourceId: "ical-source-1",
      rawPayload: {},
      rawSummary: "Reserved - Airbnb",
      startsAt: new Date("2026-05-10T18:00:00.000Z"),
    });

    const app = buildApp({
      env: buildTestEnv(),
      reservationsRepository: repository,
    });

    const response = await app.inject({
      headers: {
        authorization: `Bearer ${await createAccessToken(user)}`,
      },
      method: "GET",
      url: "/today-board?date=2026-05-10T12:00:00.000Z",
    });

    expect(response.statusCode).toBe(200);
    const responseBody = response.json();

    expect(responseBody.boardItems[0]).toMatchObject({
      apartment: "Apto 204",
      headline: "Reserved - Airbnb",
      status: "checkInToday",
    });
    expect(responseBody.summaryCards[0]).toMatchObject({
      label: "Check-ins",
      value: "1",
    });

    await app.close();
  });
});
