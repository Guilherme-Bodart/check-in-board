import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { getWriteRateLimitConfig } from "../../plugins/rate-limit.js";
import type { Env } from "../../shared/env.js";
import { AuthError, authenticateRequest } from "../auth/guard.js";
import { hashPassword } from "../auth/password.js";

export type TeamMembersModuleOptions = {
  env: Env;
};

const roleSchema = z.enum(["host_admin", "co_host", "team"]);

const apartmentPermissionSchema = z.object({
  apartmentId: z.string().trim().min(1),
  canManageIntegrations: z.boolean(),
  canUpdateTaskStatus: z.boolean(),
  canView: z.boolean(),
});

const createTeamMemberSchema = z.object({
  apartmentPermissions: z.array(apartmentPermissionSchema),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  fullName: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(128),
  role: roleSchema,
});

const updateTeamMemberSchema = z.object({
  active: z.boolean(),
  apartmentPermissions: z.array(apartmentPermissionSchema),
  role: roleSchema,
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

function mapTeamMember(member: {
  id: string;
  isActive: boolean;
  role: "host_admin" | "co_host" | "team";
  user: {
    apartmentMemberships: Array<{
      apartment: {
        name: string;
      };
      apartmentId: string;
      canManageIntegrations: boolean;
      canUpdateTaskStatus: boolean;
      canView: boolean;
    }>;
    email: string;
    fullName: string;
    id: string;
  };
}) {
  return {
    active: member.isActive,
    apartmentPermissions: member.user.apartmentMemberships.map(
      (permission) => ({
        apartmentId: permission.apartmentId,
        apartmentName: permission.apartment.name,
        canManageIntegrations: permission.canManageIntegrations,
        canUpdateTaskStatus: permission.canUpdateTaskStatus,
        canView: permission.canView,
      }),
    ),
    email: member.user.email,
    fullName: member.user.fullName,
    membershipId: member.id,
    role: member.role,
    userId: member.user.id,
  };
}

export const teamMembersModule: FastifyPluginAsync<TeamMembersModuleOptions> =
  async function teamMembersModule(app, options) {
    app.get("/", async (request, reply) => {
      try {
        const auth = await authenticateRequest(request, options.env);
        const organizationId = await getPrimaryAdminOrganizationId(auth.userId);

        if (!organizationId) {
          return reply
            .code(403)
            .send(sendError("FORBIDDEN", "Admin access is required."));
        }

        const { prisma } = await import("../../db/prisma.js");
        const teamMembers = await prisma.organizationMembership.findMany({
          include: {
            user: {
              include: {
                apartmentMemberships: {
                  include: {
                    apartment: true,
                  },
                  where: {
                    apartment: {
                      organizationId,
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
          where: {
            organizationId,
          },
        });

        return reply
          .code(200)
          .send({ teamMembers: teamMembers.map(mapTeamMember) });
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
          const parsedBody = createTeamMemberSchema.safeParse(request.body);

          if (!parsedBody.success) {
            return reply
              .code(400)
              .send(sendError("BAD_REQUEST", "Invalid team member payload."));
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
          const apartmentIds = parsedBody.data.apartmentPermissions.map(
            (permission) => permission.apartmentId,
          );
          const apartments = await prisma.apartment.findMany({
            select: {
              id: true,
            },
            where: {
              id: {
                in: apartmentIds,
              },
              organizationId,
            },
          });

          if (apartments.length !== new Set(apartmentIds).size) {
            return reply
              .code(403)
              .send(sendError("FORBIDDEN", "Apartment access is required."));
          }

          const teamMember = await prisma.$transaction(async (tx) => {
            const user = await tx.user.upsert({
              create: {
                authProvider: "password",
                authSubject: `password:${parsedBody.data.email}`,
                email: parsedBody.data.email,
                fullName: parsedBody.data.fullName,
                passwordHash: await hashPassword(parsedBody.data.password),
              },
              update: {
                fullName: parsedBody.data.fullName,
              },
              where: {
                email: parsedBody.data.email,
              },
            });

            const membership = await tx.organizationMembership.upsert({
              create: {
                organizationId,
                role: parsedBody.data.role,
                userId: user.id,
              },
              update: {
                isActive: true,
                role: parsedBody.data.role,
              },
              where: {
                organizationId_userId: {
                  organizationId,
                  userId: user.id,
                },
              },
            });

            for (const permission of parsedBody.data.apartmentPermissions) {
              await tx.apartmentMembership.upsert({
                create: {
                  ...permission,
                  role: parsedBody.data.role,
                  userId: user.id,
                },
                update: {
                  ...permission,
                  role: parsedBody.data.role,
                },
                where: {
                  apartmentId_userId: {
                    apartmentId: permission.apartmentId,
                    userId: user.id,
                  },
                },
              });
            }

            return await tx.organizationMembership.findUniqueOrThrow({
              include: {
                user: {
                  include: {
                    apartmentMemberships: {
                      include: {
                        apartment: true,
                      },
                      where: {
                        apartment: {
                          organizationId,
                        },
                      },
                    },
                  },
                },
              },
              where: {
                id: membership.id,
              },
            });
          });

          return reply.code(201).send({ teamMember: mapTeamMember(teamMember) });
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
      "/:membershipId",
      getWriteRateLimitConfig(options.env),
      async (request, reply) => {
        const params = request.params as { membershipId?: string };

        try {
          const auth = await authenticateRequest(request, options.env);
          const parsedBody = updateTeamMemberSchema.safeParse(request.body);

          if (!parsedBody.success) {
            return reply
              .code(400)
              .send(sendError("BAD_REQUEST", "Invalid team member payload."));
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
          const membership = await prisma.organizationMembership.findFirst({
            where: {
              id: params.membershipId ?? "",
              organizationId,
            },
          });

          if (!membership) {
            return reply
              .code(404)
              .send(sendError("MEMBER_NOT_FOUND", "Member was not found."));
          }

          const teamMember = await prisma.$transaction(async (tx) => {
            await tx.organizationMembership.update({
              data: {
                isActive: parsedBody.data.active,
                role: parsedBody.data.role,
              },
              where: {
                id: membership.id,
              },
            });

            for (const permission of parsedBody.data.apartmentPermissions) {
              const apartment = await tx.apartment.findFirst({
                where: {
                  id: permission.apartmentId,
                  organizationId,
                },
              });

              if (!apartment) {
                continue;
              }

              await tx.apartmentMembership.upsert({
                create: {
                  ...permission,
                  role: parsedBody.data.role,
                  userId: membership.userId,
                },
                update: {
                  ...permission,
                  role: parsedBody.data.role,
                },
                where: {
                  apartmentId_userId: {
                    apartmentId: permission.apartmentId,
                    userId: membership.userId,
                  },
                },
              });
            }

            return await tx.organizationMembership.findUniqueOrThrow({
              include: {
                user: {
                  include: {
                    apartmentMemberships: {
                      include: {
                        apartment: true,
                      },
                      where: {
                        apartment: {
                          organizationId,
                        },
                      },
                    },
                  },
                },
              },
              where: {
                id: membership.id,
              },
            });
          });

          return reply.code(200).send({ teamMember: mapTeamMember(teamMember) });
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
      "/:membershipId",
      getWriteRateLimitConfig(options.env),
      async (request, reply) => {
        const params = request.params as { membershipId?: string };

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
          await prisma.organizationMembership.updateMany({
            data: {
              isActive: false,
            },
            where: {
              id: params.membershipId ?? "",
              organizationId,
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
