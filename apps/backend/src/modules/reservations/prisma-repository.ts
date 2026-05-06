import type { Prisma, PrismaClient } from "@prisma/client";

import type { ReservationsRepository } from "./repository.js";
import type {
  AccessibleReservationSummary,
  IcalSourceSyncTarget,
  ReservationSummary,
  UpsertReservationInput,
} from "./types.js";

function toIsoString(value: Date): string {
  return value.toISOString();
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export class PrismaReservationsRepository implements ReservationsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getApartmentCanView(
    userId: string,
    apartmentId: string,
  ): Promise<boolean> {
    const membership = await this.prisma.apartmentMembership.findUnique({
      where: {
        apartmentId_userId: {
          apartmentId,
          userId,
        },
      },
    });

    return membership?.canView ?? false;
  }

  async getIcalSourceSyncTarget(
    userId: string,
    icalSourceId: string,
  ): Promise<IcalSourceSyncTarget | null> {
    const source = await this.prisma.icalSource.findUnique({
      include: {
        apartment: {
          include: {
            memberships: {
              where: {
                userId,
              },
            },
          },
        },
      },
      where: {
        id: icalSourceId,
      },
    });
    const membership = source?.apartment.memberships[0];

    if (!source || !membership) {
      return null;
    }

    return {
      apartmentId: source.apartmentId,
      canManageIntegrations: membership.canManageIntegrations,
      canView: membership.canView,
      id: source.id,
      icalUrlEncrypted: source.icalUrlEncrypted,
      provider: source.provider,
      role: membership.role,
    };
  }

  async listReservations(apartmentId: string): Promise<ReservationSummary[]> {
    const reservations = await this.prisma.reservation.findMany({
      include: {
        icalSource: true,
      },
      orderBy: {
        startsAt: "asc",
      },
      where: {
        apartmentId,
      },
    });

    return reservations.map((reservation) => ({
      apartmentId: reservation.apartmentId,
      endsAt: toIsoString(reservation.endsAt),
      externalEventKey: reservation.externalEventKey,
      externalUid: reservation.externalUid,
      icalSourceId: reservation.icalSourceId,
      id: reservation.id,
      provider: reservation.icalSource.provider,
      rawSummary: reservation.rawSummary,
      startsAt: toIsoString(reservation.startsAt),
      status: reservation.status,
    }));
  }

  async listAccessibleReservationsForDate(
    userId: string,
    startsBefore: Date,
    endsAfter: Date,
  ): Promise<AccessibleReservationSummary[]> {
    const reservations = await this.prisma.reservation.findMany({
      include: {
        apartment: true,
        icalSource: true,
      },
      orderBy: {
        startsAt: "asc",
      },
      where: {
        apartment: {
          memberships: {
            some: {
              canView: true,
              userId,
            },
          },
        },
        endsAt: {
          gt: endsAfter,
        },
        startsAt: {
          lt: startsBefore,
        },
      },
    });

    return reservations.map((reservation) => ({
      apartmentId: reservation.apartmentId,
      apartmentName: reservation.apartment.name,
      endsAt: toIsoString(reservation.endsAt),
      externalEventKey: reservation.externalEventKey,
      externalUid: reservation.externalUid,
      icalSourceId: reservation.icalSourceId,
      id: reservation.id,
      provider: reservation.icalSource.provider,
      rawSummary: reservation.rawSummary,
      startsAt: toIsoString(reservation.startsAt),
      status: reservation.status,
    }));
  }

  async upsertReservation(
    input: UpsertReservationInput,
  ): Promise<ReservationSummary> {
    const reservation = await this.prisma.reservation.upsert({
      create: {
        apartmentId: input.apartmentId,
        endsAt: input.endsAt,
        externalEventKey: input.externalEventKey,
        externalUid: input.externalUid,
        icalSourceId: input.icalSourceId,
        lastSeenInFeedAt: new Date(),
        rawPayload: toPrismaJson(input.rawPayload),
        rawSummary: input.rawSummary,
        startsAt: input.startsAt,
      },
      include: {
        icalSource: true,
      },
      update: {
        endsAt: input.endsAt,
        externalUid: input.externalUid,
        lastSeenInFeedAt: new Date(),
        missingInFeedCount: 0,
        rawPayload: toPrismaJson(input.rawPayload),
        rawSummary: input.rawSummary,
        startsAt: input.startsAt,
        status: "confirmed",
      },
      where: {
        icalSourceId_externalEventKey: {
          externalEventKey: input.externalEventKey,
          icalSourceId: input.icalSourceId,
        },
      },
    });

    return {
      apartmentId: reservation.apartmentId,
      endsAt: toIsoString(reservation.endsAt),
      externalEventKey: reservation.externalEventKey,
      externalUid: reservation.externalUid,
      icalSourceId: reservation.icalSourceId,
      id: reservation.id,
      provider: reservation.icalSource.provider,
      rawSummary: reservation.rawSummary,
      startsAt: toIsoString(reservation.startsAt),
      status: reservation.status,
    };
  }

  async markIcalSourceSyncFailure(
    icalSourceId: string,
    failedAt: Date,
  ): Promise<void> {
    await this.prisma.icalSource.update({
      data: {
        lastFailureAt: failedAt,
      },
      where: {
        id: icalSourceId,
      },
    });
  }

  async markIcalSourceSyncSuccess(
    icalSourceId: string,
    syncedAt: Date,
  ): Promise<void> {
    await this.prisma.icalSource.update({
      data: {
        lastFailureAt: null,
        lastSuccessAt: syncedAt,
      },
      where: {
        id: icalSourceId,
      },
    });
  }
}
