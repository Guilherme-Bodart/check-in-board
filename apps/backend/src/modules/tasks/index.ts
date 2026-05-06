import type { FastifyPluginAsync } from "fastify";

import type { Env } from "../../shared/env.js";
import { getWriteRateLimitConfig } from "../../plugins/rate-limit.js";
import { AuthError, authenticateRequest } from "../auth/guard.js";
import type { TasksRepository } from "./repository.js";
import {
  createTaskRequestSchema,
  createTaskResponseSchema,
  listTasksResponseSchema,
  todayTasksResponseSchema,
  updateTaskStatusRequestSchema,
  updateTaskStatusResponseSchema,
} from "./schemas.js";
import {
  createTaskForApartment,
  listTasksForApartment,
  listTodayTaskBoardItems,
  TasksServiceError,
  updateTaskStatusForUser,
} from "./service.js";

export type TasksModuleOptions = {
  env: Env;
  tasksRepository?: TasksRepository;
};

function sendError(code: string, message: string) {
  return {
    error: {
      code,
      message,
    },
  };
}

export const tasksModule: FastifyPluginAsync<TasksModuleOptions> =
  async function tasksModule(app, options) {
    let repositoryPromise: Promise<TasksRepository> | null = null;

    async function getRepository(): Promise<TasksRepository> {
      if (options.tasksRepository) {
        return options.tasksRepository;
      }

      repositoryPromise ??= (async () => {
        const [{ prisma }, { PrismaTasksRepository }] = await Promise.all([
          import("../../db/prisma.js"),
          import("./prisma-repository.js"),
        ]);

        return new PrismaTasksRepository(prisma);
      })();

      return await repositoryPromise;
    }

    app.get("/tasks/today", async (request, reply) => {
      const query = request.query as { date?: string };
      const targetDate = query.date ? new Date(query.date) : new Date();

      if (Number.isNaN(targetDate.getTime())) {
        return reply
          .code(400)
          .send(sendError("BAD_REQUEST", "Invalid task board date."));
      }

      const startOfDay = new Date(targetDate);
      startOfDay.setUTCHours(0, 0, 0, 0);

      const endOfDay = new Date(startOfDay);
      endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

      try {
        const auth = await authenticateRequest(request, options.env);
        const boardItems = await listTodayTaskBoardItems(
          auth.userId,
          endOfDay,
          startOfDay,
          await getRepository(),
          targetDate,
        );

        return reply
          .code(200)
          .send(todayTasksResponseSchema.parse({ boardItems }));
      } catch (error) {
        if (!(error instanceof AuthError)) {
          throw error;
        }

        return reply
          .code(401)
          .send(sendError("UNAUTHORIZED", "Authentication is required."));
      }
    });

    app.get("/apartments/:apartmentId/tasks", async (request, reply) => {
      const params = request.params as { apartmentId?: string };

      try {
        const auth = await authenticateRequest(request, options.env);
        const tasks = await listTasksForApartment(
          auth.userId,
          params.apartmentId ?? "",
          await getRepository(),
        );

        return reply.code(200).send(listTasksResponseSchema.parse({ tasks }));
      } catch (error) {
        if (error instanceof TasksServiceError) {
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

    app.post(
      "/apartments/:apartmentId/tasks",
      getWriteRateLimitConfig(options.env),
      async (request, reply) => {
        const params = request.params as { apartmentId?: string };

        try {
          const auth = await authenticateRequest(request, options.env);
          const parsedBody = createTaskRequestSchema.safeParse(request.body);

          if (!parsedBody.success) {
            return reply
              .code(400)
              .send(sendError("BAD_REQUEST", "Invalid task payload."));
          }

          const task = await createTaskForApartment(
            auth.userId,
            {
              ...parsedBody.data,
              apartmentId: params.apartmentId ?? "",
              dueAt: new Date(parsedBody.data.dueAt),
            },
            await getRepository(),
          );

          return reply.code(201).send(createTaskResponseSchema.parse({ task }));
        } catch (error) {
          if (error instanceof TasksServiceError) {
            return reply.code(403).send(sendError(error.code, error.message));
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

    app.patch(
      "/tasks/:taskId/status",
      getWriteRateLimitConfig(options.env),
      async (request, reply) => {
        const params = request.params as { taskId?: string };

        try {
          const auth = await authenticateRequest(request, options.env);
          const parsedBody = updateTaskStatusRequestSchema.safeParse(
            request.body,
          );

          if (!parsedBody.success) {
            return reply
              .code(400)
              .send(sendError("BAD_REQUEST", "Invalid task status payload."));
          }

          const task = await updateTaskStatusForUser(
            {
              note: parsedBody.data.note,
              status: parsedBody.data.status,
              taskId: params.taskId ?? "",
              userId: auth.userId,
            },
            await getRepository(),
          );

          return reply
            .code(200)
            .send(updateTaskStatusResponseSchema.parse({ task }));
        } catch (error) {
          if (error instanceof TasksServiceError) {
            return reply.code(403).send(sendError(error.code, error.message));
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
