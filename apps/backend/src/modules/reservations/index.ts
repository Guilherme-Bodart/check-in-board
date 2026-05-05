import type { FastifyPluginAsync } from "fastify";

import type { Env } from "../../shared/env.js";
import { AuthError, authenticateRequest } from "../auth/guard.js";
import type { ReservationsRepository } from "./repository.js";
import {
  listReservationsResponseSchema,
  manualSyncRequestSchema,
  manualSyncResponseSchema,
  todayBoardResponseSchema,
} from "./schemas.js";
import {
  listReservationsForApartment,
  ReservationsServiceError,
  syncIcalSourceFromText,
} from "./service.js";
import { buildTodayBoardPayload } from "./today-board.js";

export type ReservationsModuleOptions = {
  env: Env;
  reservationsRepository?: ReservationsRepository;
};

function sendError(code: string, message: string) {
  return {
    error: {
      code,
      message,
    },
  };
}

export const reservationsModule: FastifyPluginAsync<ReservationsModuleOptions> =
  async function reservationsModule(app, options) {
    let repositoryPromise: Promise<ReservationsRepository> | null = null;

    async function getRepository(): Promise<ReservationsRepository> {
      if (options.reservationsRepository) {
        return options.reservationsRepository;
      }

      repositoryPromise ??= (async () => {
        const [{ prisma }, { PrismaReservationsRepository }] =
          await Promise.all([
            import("../../db/prisma.js"),
            import("./prisma-repository.js"),
          ]);

        return new PrismaReservationsRepository(prisma);
      })();

      return await repositoryPromise;
    }

    app.get("/today-board", async (request, reply) => {
      const query = request.query as { date?: string };
      const targetDate = query.date ? new Date(query.date) : new Date();

      if (Number.isNaN(targetDate.getTime())) {
        return reply
          .code(400)
          .send(sendError("BAD_REQUEST", "Invalid today board date."));
      }

      const startOfDay = new Date(targetDate);
      startOfDay.setUTCHours(0, 0, 0, 0);

      const endOfDay = new Date(startOfDay);
      endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

      try {
        const auth = await authenticateRequest(request, options.env);
        const reservations = await (
          await getRepository()
        ).listAccessibleReservationsForDate(auth.userId, endOfDay, startOfDay);

        return reply
          .code(200)
          .send(todayBoardResponseSchema.parse(buildTodayBoardPayload(reservations, targetDate)));
      } catch (error) {
        if (!(error instanceof AuthError)) {
          throw error;
        }

        return reply
          .code(401)
          .send(sendError("UNAUTHORIZED", "Authentication is required."));
      }
    });

    app.get("/apartments/:apartmentId/reservations", async (request, reply) => {
      const params = request.params as { apartmentId?: string };

      try {
        const auth = await authenticateRequest(request, options.env);
        const reservations = await listReservationsForApartment(
          auth.userId,
          params.apartmentId ?? "",
          await getRepository(),
        );

        return reply.code(200).send(
          listReservationsResponseSchema.parse({
            reservations,
          }),
        );
      } catch (error) {
        if (error instanceof ReservationsServiceError) {
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

    app.post("/ical-sources/:icalSourceId/sync", async (request, reply) => {
      const params = request.params as { icalSourceId?: string };

      try {
        const auth = await authenticateRequest(request, options.env);
        const parsedBody = manualSyncRequestSchema.safeParse(request.body);

        if (!parsedBody.success) {
          return reply
            .code(400)
            .send(sendError("BAD_REQUEST", "Invalid sync payload."));
        }

        const result = await syncIcalSourceFromText(
          auth.userId,
          params.icalSourceId ?? "",
          parsedBody.data.icsText,
          await getRepository(),
        );

        return reply.code(200).send(manualSyncResponseSchema.parse(result));
      } catch (error) {
        if (error instanceof ReservationsServiceError) {
          const statusCode = error.code === "BAD_REQUEST" ? 400 : 403;

          return reply.code(statusCode).send(sendError(error.code, error.message));
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
