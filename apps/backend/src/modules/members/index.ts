import type { FastifyPluginAsync } from "fastify";

import type { Env } from "../../shared/env.js";
import { getWriteRateLimitConfig } from "../../plugins/rate-limit.js";
import { AuthError, authenticateRequest } from "../auth/guard.js";
import type { MembersRepository } from "./repository.js";
import {
  acceptInvitationRequestSchema,
  acceptInvitationResponseSchema,
  createInvitationRequestSchema,
  createInvitationResponseSchema,
  listMembersResponseSchema,
} from "./schemas.js";
import {
  acceptApartmentInvitation,
  createApartmentInvitation,
  listApartmentMembersForUser,
  MembersServiceError,
} from "./service.js";

export type MembersModuleOptions = {
  env: Env;
  membersRepository?: MembersRepository;
};

function sendError(code: string, message: string) {
  return {
    error: {
      code,
      message,
    },
  };
}

function getMembersStatusCode(error: MembersServiceError) {
  if (error.code === "FORBIDDEN") {
    return 403;
  }

  if (error.code === "INVITATION_EXPIRED") {
    return 410;
  }

  if (error.code === "INVITATION_NOT_FOUND") {
    return 404;
  }

  return 409;
}

export const membersModule: FastifyPluginAsync<MembersModuleOptions> =
  async function membersModule(app, options) {
    let repositoryPromise: Promise<MembersRepository> | null = null;

    async function getRepository(): Promise<MembersRepository> {
      if (options.membersRepository) {
        return options.membersRepository;
      }

      repositoryPromise ??= (async () => {
        const [{ prisma }, { PrismaMembersRepository }] = await Promise.all([
          import("../../db/prisma.js"),
          import("./prisma-repository.js"),
        ]);

        return new PrismaMembersRepository(prisma);
      })();

      return await repositoryPromise;
    }

    app.get("/apartments/:apartmentId/members", async (request, reply) => {
      const params = request.params as { apartmentId?: string };

      try {
        const auth = await authenticateRequest(request, options.env);
        const members = await listApartmentMembersForUser(
          auth.userId,
          params.apartmentId ?? "",
          await getRepository(),
        );

        return reply
          .code(200)
          .send(listMembersResponseSchema.parse({ members }));
      } catch (error) {
        if (error instanceof MembersServiceError) {
          return reply
            .code(getMembersStatusCode(error))
            .send(sendError(error.code, error.message));
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
      "/apartments/:apartmentId/invitations",
      getWriteRateLimitConfig(options.env),
      async (request, reply) => {
        const params = request.params as { apartmentId?: string };

        try {
          const auth = await authenticateRequest(request, options.env);
          const parsedBody = createInvitationRequestSchema.safeParse(
            request.body,
          );

          if (!parsedBody.success) {
            return reply
              .code(400)
              .send(sendError("BAD_REQUEST", "Invalid invitation payload."));
          }

          const invitation = await createApartmentInvitation(
            {
              apartmentId: params.apartmentId ?? "",
              email: parsedBody.data.email,
              invitedByUserId: auth.userId,
              role: parsedBody.data.role,
            },
            await getRepository(),
          );

          return reply
            .code(201)
            .send(createInvitationResponseSchema.parse({ invitation }));
        } catch (error) {
          if (error instanceof MembersServiceError) {
            return reply
              .code(getMembersStatusCode(error))
              .send(sendError(error.code, error.message));
          }

          if (!(error instanceof AuthError)) {
            throw error;
          }

          return reply
            .code(401)
            .send(sendError("UNAUTHORIZED", "Authentication is required."));
        }
      },
    );

    app.post(
      "/invitations/accept",
      getWriteRateLimitConfig(options.env),
      async (request, reply) => {
        try {
          const auth = await authenticateRequest(request, options.env);
          const parsedBody = acceptInvitationRequestSchema.safeParse(
            request.body,
          );

          if (!parsedBody.success) {
            return reply
              .code(400)
              .send(sendError("BAD_REQUEST", "Invalid invitation payload."));
          }

          const invitation = await acceptApartmentInvitation(
            {
              token: parsedBody.data.token,
              userId: auth.userId,
            },
            await getRepository(),
          );

          return reply
            .code(200)
            .send(acceptInvitationResponseSchema.parse({ invitation }));
        } catch (error) {
          if (error instanceof MembersServiceError) {
            return reply
              .code(getMembersStatusCode(error))
              .send(sendError(error.code, error.message));
          }

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
