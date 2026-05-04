import type { PrismaClient } from "@prisma/client";

import type {
  CreateIcalSourceRecordInput,
  IcalSourcesRepository,
} from "./repository.js";
import type { ApartmentIcalAccess, IcalSourceSummary } from "./types.js";

function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export class PrismaIcalSourcesRepository implements IcalSourcesRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createIcalSource(
    input: CreateIcalSourceRecordInput,
  ): Promise<IcalSourceSummary> {
    const source = await this.prisma.icalSource.create({
      data: {
        apartmentId: input.apartmentId,
        icalUrlEncrypted: input.icalUrlEncrypted,
        label: input.label,
        provider: input.provider,
      },
    });

    return {
      id: source.id,
      label: source.label,
      lastFailureAt: toIsoString(source.lastFailureAt),
      lastSuccessAt: toIsoString(source.lastSuccessAt),
      provider: source.provider,
      syncEnabled: source.syncEnabled,
    };
  }

  async getApartmentAccess(
    userId: string,
    apartmentId: string,
  ): Promise<ApartmentIcalAccess | null> {
    const membership = await this.prisma.apartmentMembership.findUnique({
      where: {
        apartmentId_userId: {
          apartmentId,
          userId,
        },
      },
    });

    if (!membership) {
      return null;
    }

    return {
      apartmentId: membership.apartmentId,
      canManageIntegrations: membership.canManageIntegrations,
      canView: membership.canView,
      role: membership.role,
    };
  }

  async listIcalSources(apartmentId: string): Promise<IcalSourceSummary[]> {
    const sources = await this.prisma.icalSource.findMany({
      orderBy: {
        createdAt: "desc",
      },
      where: {
        apartmentId,
        deletedAt: null,
      },
    });

    return sources.map((source) => ({
      id: source.id,
      label: source.label,
      lastFailureAt: toIsoString(source.lastFailureAt),
      lastSuccessAt: toIsoString(source.lastSuccessAt),
      provider: source.provider,
      syncEnabled: source.syncEnabled,
    }));
  }
}
