import type { FastifyPluginAsync } from "fastify";

import type { Env } from "../../shared/env.js";
import { AuthError, authenticateRequest } from "../auth/guard.js";
import {
  createIcalSourceRequestSchema,
  createIcalSourceResponseSchema,
  listIcalSourcesResponseSchema,
} from "./schemas.js";
import type { IcalSourcesRepository } from "./repository.js";
import {
  createIcalSourceForApartment,
  IcalSourcesServiceError,
  listIcalSourcesForApartment,
} from "./service.js";

export type IcalSourcesModuleOptions = {
  env: Env;
  icalSourcesRepository?: IcalSourcesRepository;
};

function sendError(code: string, message: string) {
  return {
    error: {
      code,
      message,
    },
  };
}

export const icalSourcesModule: FastifyPluginAsync<IcalSourcesModuleOptions> =
  async function icalSourcesModule(app, options) {
    let repositoryPromise: Promise<IcalSourcesRepository> | null = null;

    async function getRepository(): Promise<IcalSourcesRepository> {
      if (options.icalSourcesRepository) {
        return options.icalSourcesRepository;
      }

      repositoryPromise ??= (async () => {
        const [{ prisma }, { PrismaIcalSourcesRepository }] = await Promise.all(
          [
            import("../../db/prisma.js"),
            import("./prisma-repository.js"),
          ],
        );

        return new PrismaIcalSourcesRepository(prisma);
      })();

      return await repositoryPromise;
    }

    app.get("/apartments/:apartmentId/ical-sources", async (request, reply) => {
      const params = request.params as { apartmentId?: string };

      try {
        const auth = await authenticateRequest(request, options.env);
        const repository = await getRepository();
        const icalSources = await listIcalSourcesForApartment(
          auth.userId,
          params.apartmentId ?? "",
          repository,
        );

        return reply.code(200).send(
          listIcalSourcesResponseSchema.parse({
            icalSources,
          }),
        );
      } catch (error) {
        if (error instanceof IcalSourcesServiceError) {
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

    app.post("/apartments/:apartmentId/ical-sources", async (request, reply) => {
      const params = request.params as { apartmentId?: string };

      try {
        const auth = await authenticateRequest(request, options.env);
        const parsedBody = createIcalSourceRequestSchema.safeParse(
          request.body,
        );

        if (!parsedBody.success) {
          return reply
            .code(400)
            .send(sendError("BAD_REQUEST", "Invalid iCal source payload."));
        }

        const repository = await getRepository();
        const icalSource = await createIcalSourceForApartment(
          auth.userId,
          {
            ...parsedBody.data,
            apartmentId: params.apartmentId ?? "",
          },
          repository,
        );

        return reply.code(201).send(
          createIcalSourceResponseSchema.parse({
            icalSource,
          }),
        );
      } catch (error) {
        if (error instanceof IcalSourcesServiceError) {
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
