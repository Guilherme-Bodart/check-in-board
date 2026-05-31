import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { getWriteRateLimitConfig } from "../../plugins/rate-limit.js";
import type { Env } from "../../shared/env.js";
import { AuthError, authenticateRequest } from "../auth/guard.js";

export type FinanceModuleOptions = {
  env: Env;
};

const financeFilterSchema = z.object({
  apartmentId: z.string().trim().min(1).optional(),
  dateFrom: z.string().trim().min(1),
  dateTo: z.string().trim().min(1),
  ownerId: z.string().trim().min(1).optional(),
});

const financialEntryPayloadSchema = z.object({
  amountCents: z.number().int().positive(),
  apartmentId: z.string().trim().min(1),
  category: z.string().trim().min(1).max(120),
  currency: z.string().trim().min(3).max(8),
  description: z.string().trim().max(1000).nullable().optional(),
  occurredOn: z.string().trim().min(1),
  type: z.enum(["revenue", "expense"]),
});

function sendError(code: string, message: string) {
  return {
    error: {
      code,
      message,
    },
  };
}

function parseDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function endExclusive(date: Date) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  return nextDate;
}

async function getAccessibleOrganizationIds(userId: string) {
  const { prisma } = await import("../../db/prisma.js");
  const memberships = await prisma.organizationMembership.findMany({
    select: {
      organizationId: true,
    },
    where: {
      isActive: true,
      userId,
    },
  });

  return memberships.map((membership) => membership.organizationId);
}

async function getApartmentForUser(userId: string, apartmentId: string) {
  const { prisma } = await import("../../db/prisma.js");

  return await prisma.apartment.findFirst({
    include: {
      owner: true,
    },
    where: {
      id: apartmentId,
      memberships: {
        some: {
          canView: true,
          userId,
        },
      },
    },
  });
}

function mapFinancialEntry(entry: {
  amountCents: number;
  apartment: {
    name: string;
  };
  apartmentId: string;
  category: string;
  currency: string;
  description: string | null;
  id: string;
  occurredOn: Date;
  owner: {
    id: string;
    name: string;
  } | null;
  ownerId: string | null;
  type: "revenue" | "expense";
}) {
  return {
    amountCents: entry.amountCents,
    apartmentId: entry.apartmentId,
    apartmentName: entry.apartment.name,
    category: entry.category,
    currency: entry.currency,
    description: entry.description,
    id: entry.id,
    occurredOn: entry.occurredOn.toISOString().slice(0, 10),
    ownerId: entry.ownerId ?? "",
    ownerName: entry.owner?.name ?? "Sem proprietario",
    type: entry.type,
  };
}

function createSummaryItem(input: {
  expenseCents: number;
  id: string;
  name: string;
  revenueCents: number;
}) {
  return {
    expenseCents: input.expenseCents,
    id: input.id,
    name: input.name,
    profitCents: input.revenueCents - input.expenseCents,
    revenueCents: input.revenueCents,
  };
}

export const financeModule: FastifyPluginAsync<FinanceModuleOptions> =
  async function financeModule(app, options) {
    async function listEntries(
      userId: string,
      query: z.infer<typeof financeFilterSchema>,
    ) {
      const dateFrom = parseDate(query.dateFrom);
      const dateTo = parseDate(query.dateTo);

      if (!dateFrom || !dateTo) {
        throw new Error("BAD_DATE");
      }

      const organizationIds = await getAccessibleOrganizationIds(userId);
      const { prisma } = await import("../../db/prisma.js");

      return await prisma.financialEntry.findMany({
        include: {
          apartment: true,
          owner: true,
        },
        orderBy: {
          occurredOn: "desc",
        },
        where: {
          apartmentId: query.apartmentId,
          occurredOn: {
            gte: dateFrom,
            lt: endExclusive(dateTo),
          },
          organizationId: {
            in: organizationIds,
          },
          ownerId: query.ownerId,
        },
      });
    }

    app.get("/financial-entries", async (request, reply) => {
      try {
        const auth = await authenticateRequest(request, options.env);
        const parsedQuery = financeFilterSchema.safeParse(request.query);

        if (!parsedQuery.success) {
          return reply
            .code(400)
            .send(sendError("BAD_REQUEST", "Invalid finance filters."));
        }

        const entries = await listEntries(auth.userId, parsedQuery.data);

        return reply.code(200).send({
          financialEntries: entries.map(mapFinancialEntry),
        });
      } catch (error) {
        if (error instanceof Error && error.message === "BAD_DATE") {
          return reply
            .code(400)
            .send(sendError("BAD_REQUEST", "Invalid date range."));
        }

        if (!(error instanceof AuthError)) {
          throw error;
        }

        return reply
          .code(401)
          .send(sendError("UNAUTHORIZED", "Authentication is required."));
      }
    });

    app.get("/financial-summary", async (request, reply) => {
      try {
        const auth = await authenticateRequest(request, options.env);
        const parsedQuery = financeFilterSchema.safeParse(request.query);

        if (!parsedQuery.success) {
          return reply
            .code(400)
            .send(sendError("BAD_REQUEST", "Invalid finance filters."));
        }

        const entries = await listEntries(auth.userId, parsedQuery.data);
        const totals = entries.reduce(
          (accumulator, entry) => {
            if (entry.type === "revenue") {
              accumulator.revenueCents += entry.amountCents;
            } else {
              accumulator.expenseCents += entry.amountCents;
            }

            return accumulator;
          },
          { expenseCents: 0, revenueCents: 0 },
        );
        const byOwner = new Map<
          string,
          { expenseCents: number; id: string; name: string; revenueCents: number }
        >();
        const byApartment = new Map<
          string,
          { expenseCents: number; id: string; name: string; revenueCents: number }
        >();

        for (const entry of entries) {
          const ownerId = entry.ownerId ?? "none";
          const ownerSummary =
            byOwner.get(ownerId) ??
            createSummaryItem({
              expenseCents: 0,
              id: ownerId,
              name: entry.owner?.name ?? "Sem proprietario",
              revenueCents: 0,
            });
          const apartmentSummary =
            byApartment.get(entry.apartmentId) ??
            createSummaryItem({
              expenseCents: 0,
              id: entry.apartmentId,
              name: entry.apartment.name,
              revenueCents: 0,
            });

          if (entry.type === "revenue") {
            ownerSummary.revenueCents += entry.amountCents;
            apartmentSummary.revenueCents += entry.amountCents;
          } else {
            ownerSummary.expenseCents += entry.amountCents;
            apartmentSummary.expenseCents += entry.amountCents;
          }

          byOwner.set(ownerId, ownerSummary);
          byApartment.set(entry.apartmentId, apartmentSummary);
        }

        return reply.code(200).send({
          byApartment: [...byApartment.values()].map(createSummaryItem),
          byOwner: [...byOwner.values()].map(createSummaryItem),
          dateFrom: parsedQuery.data.dateFrom,
          dateTo: parsedQuery.data.dateTo,
          expenseCents: totals.expenseCents,
          profitCents: totals.revenueCents - totals.expenseCents,
          revenueCents: totals.revenueCents,
        });
      } catch (error) {
        if (error instanceof Error && error.message === "BAD_DATE") {
          return reply
            .code(400)
            .send(sendError("BAD_REQUEST", "Invalid date range."));
        }

        if (!(error instanceof AuthError)) {
          throw error;
        }

        return reply
          .code(401)
          .send(sendError("UNAUTHORIZED", "Authentication is required."));
      }
    });

    app.post(
      "/financial-entries",
      getWriteRateLimitConfig(options.env),
      async (request, reply) => {
        try {
          const auth = await authenticateRequest(request, options.env);
          const parsedBody = financialEntryPayloadSchema.safeParse(
            request.body,
          );

          if (!parsedBody.success) {
            return reply
              .code(400)
              .send(sendError("BAD_REQUEST", "Invalid financial payload."));
          }

          const apartment = await getApartmentForUser(
            auth.userId,
            parsedBody.data.apartmentId,
          );

          if (!apartment) {
            return reply
              .code(403)
              .send(sendError("FORBIDDEN", "Apartment access is required."));
          }

          const { prisma } = await import("../../db/prisma.js");
          const financialEntry = await prisma.financialEntry.create({
            data: {
              ...parsedBody.data,
              currency: parsedBody.data.currency.toUpperCase(),
              description: parsedBody.data.description ?? null,
              occurredOn: new Date(parsedBody.data.occurredOn),
              organizationId: apartment.organizationId,
              ownerId: apartment.ownerId,
            },
            include: {
              apartment: true,
              owner: true,
            },
          });

          return reply
            .code(201)
            .send({ financialEntry: mapFinancialEntry(financialEntry) });
        } catch (error) {
          if (!(error instanceof AuthError)) {
            throw error;
          }

          return reply
            .code(401)
            .send(sendError("UNAUTHORIZED", "Authentication is required."));
        }
      },
    );

    app.put(
      "/financial-entries/:entryId",
      getWriteRateLimitConfig(options.env),
      async (request, reply) => {
        const params = request.params as { entryId?: string };

        try {
          const auth = await authenticateRequest(request, options.env);
          const parsedBody = financialEntryPayloadSchema.safeParse(
            request.body,
          );

          if (!parsedBody.success) {
            return reply
              .code(400)
              .send(sendError("BAD_REQUEST", "Invalid financial payload."));
          }

          const apartment = await getApartmentForUser(
            auth.userId,
            parsedBody.data.apartmentId,
          );

          if (!apartment) {
            return reply
              .code(403)
              .send(sendError("FORBIDDEN", "Apartment access is required."));
          }

          const { prisma } = await import("../../db/prisma.js");
          const existingEntry = await prisma.financialEntry.findFirst({
            where: {
              id: params.entryId ?? "",
              organizationId: apartment.organizationId,
            },
          });

          if (!existingEntry) {
            return reply
              .code(404)
              .send(sendError("ENTRY_NOT_FOUND", "Entry was not found."));
          }

          const financialEntry = await prisma.financialEntry.update({
            data: {
              ...parsedBody.data,
              currency: parsedBody.data.currency.toUpperCase(),
              description: parsedBody.data.description ?? null,
              occurredOn: new Date(parsedBody.data.occurredOn),
              organizationId: apartment.organizationId,
              ownerId: apartment.ownerId,
            },
            include: {
              apartment: true,
              owner: true,
            },
            where: {
              id: existingEntry.id,
            },
          });

          return reply
            .code(200)
            .send({ financialEntry: mapFinancialEntry(financialEntry) });
        } catch (error) {
          if (!(error instanceof AuthError)) {
            throw error;
          }

          return reply
            .code(401)
            .send(sendError("UNAUTHORIZED", "Authentication is required."));
        }
      },
    );

    app.delete(
      "/financial-entries/:entryId",
      getWriteRateLimitConfig(options.env),
      async (request, reply) => {
        const params = request.params as { entryId?: string };

        try {
          const auth = await authenticateRequest(request, options.env);
          const organizationIds = await getAccessibleOrganizationIds(auth.userId);
          const { prisma } = await import("../../db/prisma.js");
          const existingEntry = await prisma.financialEntry.findFirst({
            where: {
              id: params.entryId ?? "",
              organizationId: {
                in: organizationIds,
              },
            },
          });

          if (!existingEntry) {
            return reply
              .code(404)
              .send(sendError("ENTRY_NOT_FOUND", "Entry was not found."));
          }

          await prisma.financialEntry.delete({
            where: {
              id: existingEntry.id,
            },
          });

          return reply.code(204).send();
        } catch (error) {
          if (!(error instanceof AuthError)) {
            throw error;
          }

          return reply
            .code(401)
            .send(sendError("UNAUTHORIZED", "Authentication is required."));
        }
      },
    );
  };
