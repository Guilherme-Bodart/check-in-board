import type { FastifyPluginAsync } from "fastify";

import type { Env } from "../../shared/env.js";
import { AuthError, authenticateRequest } from "../auth/guard.js";
import {
  createApartmentRequestSchema,
  createApartmentResponseSchema,
  listApartmentsResponseSchema,
} from "./schemas.js";
import type { ApartmentsRepository } from "./repository.js";
import {
  ApartmentsServiceError,
  createApartmentForAuthenticatedUser,
  listAccessibleApartments,
} from "./service.js";

export type ApartmentsModuleOptions = {
  apartmentsRepository?: ApartmentsRepository;
  env: Env;
};

function sendError(code: string, message: string) {
  return {
    error: {
      code,
      message,
    },
  };
}

export const apartmentsModule: FastifyPluginAsync<ApartmentsModuleOptions> =
  async function apartmentsModule(app, options) {
    let apartmentsRepositoryPromise: Promise<ApartmentsRepository> | null =
      null;

    async function getRepository(): Promise<ApartmentsRepository> {
      if (options.apartmentsRepository) {
        return options.apartmentsRepository;
      }

      apartmentsRepositoryPromise ??= (async () => {
        const [{ prisma }, { PrismaApartmentsRepository }] = await Promise.all([
          import("../../db/prisma.js"),
          import("./prisma-repository.js"),
        ]);

        return new PrismaApartmentsRepository(prisma);
      })();

      return await apartmentsRepositoryPromise;
    }

    app.get("/", async (request, reply) => {
      try {
        const auth = await authenticateRequest(request, options.env);
        const repository = await getRepository();
        const apartments = await listAccessibleApartments(
          auth.userId,
          repository,
        );

        return reply.code(200).send(
          listApartmentsResponseSchema.parse({
            apartments,
          }),
        );
      } catch (error) {
        if (!(error instanceof AuthError)) {
          throw error;
        }

        return reply
          .code(401)
          .send(sendError("UNAUTHORIZED", "Authentication is required."));
      }
    });

    app.post("/", async (request, reply) => {
      try {
        const auth = await authenticateRequest(request, options.env);
        const parsedBody = createApartmentRequestSchema.safeParse(request.body);

        if (!parsedBody.success) {
          return reply
            .code(400)
            .send(sendError("BAD_REQUEST", "Invalid apartment payload."));
        }

        const repository = await getRepository();
        const apartment = await createApartmentForAuthenticatedUser(
          auth.userId,
          parsedBody.data,
          repository,
        );

        return reply.code(201).send(
          createApartmentResponseSchema.parse({
            apartment,
          }),
        );
      } catch (error) {
        if (error instanceof ApartmentsServiceError) {
          return reply.code(403).send(sendError(error.code, error.message));
        }

        if (!(error instanceof AuthError)) {
          throw error;
        }

        return reply
          .code(401)
          .send(sendError("UNAUTHORIZED", "Authentication is required."));
      }
    });
  };
