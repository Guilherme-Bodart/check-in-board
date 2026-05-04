import type { FastifyPluginAsync } from "fastify";

import type { Env } from "../../shared/env.js";
import {
  meResponseSchema,
  signUpRequestSchema,
  signUpResponseSchema,
} from "./schemas.js";
import { AuthError, authenticateRequest } from "./guard.js";
import { getAuthenticatedUser, signUpWithDevAuth } from "./service.js";
import type { AuthRepository } from "./repository.js";

export type AuthModuleOptions = {
  authRepository?: AuthRepository;
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

export const authModule: FastifyPluginAsync<AuthModuleOptions> =
  async function authModule(app, options) {
    let authRepositoryPromise: Promise<AuthRepository> | null = null;

    async function getRepository(): Promise<AuthRepository> {
      if (options.authRepository) {
        return options.authRepository;
      }

      authRepositoryPromise ??= (async () => {
        const [{ prisma }, { PrismaAuthRepository }] = await Promise.all([
          import("../../db/prisma.js"),
          import("./prisma-repository.js"),
        ]);

        return new PrismaAuthRepository(prisma);
      })();

      return await authRepositoryPromise;
    }

    app.post("/dev/sign-up", async (request, reply) => {
      if (options.env.NODE_ENV === "production") {
        return reply
          .code(403)
          .send(
            sendError(
              "DEV_AUTH_DISABLED",
              "Dev auth is disabled in production.",
            ),
          );
      }

      const parsedBody = signUpRequestSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply
          .code(400)
          .send(sendError("BAD_REQUEST", "Invalid sign-up payload."));
      }

      const repository = await getRepository();
      const responseBody = signUpResponseSchema.parse(
        await signUpWithDevAuth(parsedBody.data, repository, options.env),
      );

      return reply.code(200).send(responseBody);
    });

    app.get("/me", async (request, reply) => {
      try {
        const auth = await authenticateRequest(request, options.env);
        const repository = await getRepository();
        const user = await getAuthenticatedUser(auth.userId, repository);

        if (!user) {
          return reply
            .code(401)
            .send(sendError("UNAUTHORIZED", "Authentication is required."));
        }

        const responseBody = meResponseSchema.parse({
          memberships: user.memberships,
          user: {
            email: user.email,
            fullName: user.fullName,
            id: user.id,
          },
        });

        return reply.code(200).send(responseBody);
      } catch (error) {
        if (!(error instanceof AuthError)) {
          throw error;
        }

        return reply
          .code(401)
          .send(sendError("UNAUTHORIZED", "Authentication is required."));
      }
    });
  };
