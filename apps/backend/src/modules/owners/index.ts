import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { getWriteRateLimitConfig } from "../../plugins/rate-limit.js";
import type { Env } from "../../shared/env.js";
import { AuthError, authenticateRequest } from "../auth/guard.js";

export type OwnersModuleOptions = {
  env: Env;
};

const ownerPayloadSchema = z.object({
  contactName: z.string().trim().min(1).max(120).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  name: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(2000).nullable().optional(),
  phone: z.string().trim().min(1).max(40).nullable().optional(),
  type: z.enum(["internal", "client"]),
});

function sendError(code: string, message: string) {
  return {
    error: {
      code,
      message,
    },
  };
}

async function getPrimaryAdminOrganizationId(userId: string) {
  const { prisma } = await import("../../db/prisma.js");
  const membership = await prisma.organizationMembership.findFirst({
    orderBy: {
      createdAt: "asc",
    },
    where: {
      isActive: true,
      role: "host_admin",
      userId,
    },
  });

  return membership?.organizationId ?? null;
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

function mapOwner(owner: {
  _count: {
    apartments: number;
  };
  contactName: string | null;
  email: string | null;
  id: string;
  name: string;
  notes: string | null;
  organizationId: string;
  phone: string | null;
  type: "internal" | "client";
}) {
  return {
    apartmentCount: owner._count.apartments,
    contactName: owner.contactName,
    email: owner.email,
    id: owner.id,
    name: owner.name,
    notes: owner.notes,
    organizationId: owner.organizationId,
    phone: owner.phone,
    type: owner.type,
  };
}

export const ownersModule: FastifyPluginAsync<OwnersModuleOptions> =
  async function ownersModule(app, options) {
    app.get("/", async (request, reply) => {
      try {
        const auth = await authenticateRequest(request, options.env);
        const organizationIds = await getAccessibleOrganizationIds(auth.userId);
        const { prisma } = await import("../../db/prisma.js");
        const owners = await prisma.owner.findMany({
          include: {
            _count: {
              select: {
                apartments: true,
              },
            },
          },
          orderBy: {
            name: "asc",
          },
          where: {
            organizationId: {
              in: organizationIds,
            },
          },
        });

        return reply.code(200).send({ owners: owners.map(mapOwner) });
      } catch (error) {
        if (!(error instanceof AuthError)) {
          throw error;
        }

        return reply
          .code(401)
          .send(sendError("UNAUTHORIZED", "Authentication is required."));
      }
    });

    app.post(
      "/",
      getWriteRateLimitConfig(options.env),
      async (request, reply) => {
        try {
          const auth = await authenticateRequest(request, options.env);
          const parsedBody = ownerPayloadSchema.safeParse(request.body);

          if (!parsedBody.success) {
            return reply
              .code(400)
              .send(sendError("BAD_REQUEST", "Invalid owner payload."));
          }

          const organizationId = await getPrimaryAdminOrganizationId(
            auth.userId,
          );

          if (!organizationId) {
            return reply
              .code(403)
              .send(sendError("FORBIDDEN", "Admin access is required."));
          }

          const { prisma } = await import("../../db/prisma.js");
          const owner = await prisma.owner.create({
            data: {
              ...parsedBody.data,
              organizationId,
            },
            include: {
              _count: {
                select: {
                  apartments: true,
                },
              },
            },
          });

          return reply.code(201).send({ owner: mapOwner(owner) });
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
      "/:ownerId",
      getWriteRateLimitConfig(options.env),
      async (request, reply) => {
        const params = request.params as { ownerId?: string };

        try {
          const auth = await authenticateRequest(request, options.env);
          const parsedBody = ownerPayloadSchema.safeParse(request.body);

          if (!parsedBody.success) {
            return reply
              .code(400)
              .send(sendError("BAD_REQUEST", "Invalid owner payload."));
          }

          const organizationId = await getPrimaryAdminOrganizationId(
            auth.userId,
          );

          if (!organizationId) {
            return reply
              .code(403)
              .send(sendError("FORBIDDEN", "Admin access is required."));
          }

          const { prisma } = await import("../../db/prisma.js");
          const existingOwner = await prisma.owner.findFirst({
            where: {
              id: params.ownerId ?? "",
              organizationId,
            },
          });

          if (!existingOwner) {
            return reply
              .code(404)
              .send(sendError("OWNER_NOT_FOUND", "Owner was not found."));
          }

          const owner = await prisma.owner.update({
            data: parsedBody.data,
            include: {
              _count: {
                select: {
                  apartments: true,
                },
              },
            },
            where: {
              id: existingOwner.id,
            },
          });

          return reply.code(200).send({ owner: mapOwner(owner) });
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
      "/:ownerId",
      getWriteRateLimitConfig(options.env),
      async (request, reply) => {
        const params = request.params as { ownerId?: string };

        try {
          const auth = await authenticateRequest(request, options.env);
          const organizationId = await getPrimaryAdminOrganizationId(
            auth.userId,
          );

          if (!organizationId) {
            return reply
              .code(403)
              .send(sendError("FORBIDDEN", "Admin access is required."));
          }

          const { prisma } = await import("../../db/prisma.js");
          const owner = await prisma.owner.findFirst({
            include: {
              _count: {
                select: {
                  apartments: true,
                },
              },
            },
            where: {
              id: params.ownerId ?? "",
              organizationId,
            },
          });

          if (!owner) {
            return reply
              .code(404)
              .send(sendError("OWNER_NOT_FOUND", "Owner was not found."));
          }

          if (owner._count.apartments > 0) {
            return reply
              .code(409)
              .send(
                sendError(
                  "OWNER_HAS_APARTMENTS",
                  "This owner still has apartments.",
                ),
              );
          }

          await prisma.owner.delete({
            where: {
              id: owner.id,
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
