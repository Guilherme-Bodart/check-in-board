import type { FastifyPluginAsync } from "fastify";

import type { Env } from "../../shared/env.js";
import {
  getAuthRateLimitConfig,
  getWriteRateLimitConfig,
} from "../../plugins/rate-limit.js";
import {
  changePasswordRequestSchema,
  meResponseSchema,
  okResponseSchema,
  passwordSignUpRequestSchema,
  passwordResetRequestedResponseSchema,
  requestPasswordResetRequestSchema,
  resetPasswordRequestSchema,
  signInRequestSchema,
  signUpRequestSchema,
  signUpResponseSchema,
} from "./schemas.js";
import { AuthError, authenticateRequest } from "./guard.js";
import {
  AuthServiceError,
  changePasswordForUser,
  getAuthenticatedUser,
  requestPasswordReset,
  resetPasswordWithToken,
  signInWithPassword,
  signUpWithDevAuth,
  signUpWithPassword,
} from "./service.js";
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

    app.post(
      "/sign-up",
      getAuthRateLimitConfig(options.env),
      async (request, reply) => {
        const parsedBody = passwordSignUpRequestSchema.safeParse(request.body);

        if (!parsedBody.success) {
          return reply
            .code(400)
            .send(sendError("BAD_REQUEST", "Invalid sign-up payload."));
        }

        try {
          const repository = await getRepository();
          const responseBody = signUpResponseSchema.parse(
            await signUpWithPassword(parsedBody.data, repository, options.env),
          );

          return reply.code(201).send(responseBody);
        } catch (error) {
          if (error instanceof AuthServiceError) {
            return reply.code(409).send(sendError(error.code, error.message));
          }

          throw error;
        }
      },
    );

    app.post(
      "/sign-in",
      getAuthRateLimitConfig(options.env),
      async (request, reply) => {
        const parsedBody = signInRequestSchema.safeParse(request.body);

        if (!parsedBody.success) {
          return reply
            .code(400)
            .send(sendError("BAD_REQUEST", "Invalid sign-in payload."));
        }

        try {
          const repository = await getRepository();
          const responseBody = signUpResponseSchema.parse(
            await signInWithPassword(parsedBody.data, repository, options.env),
          );

          return reply.code(200).send(responseBody);
        } catch (error) {
          if (error instanceof AuthServiceError) {
            return reply.code(401).send(sendError(error.code, error.message));
          }

          throw error;
        }
      },
    );

    app.post(
      "/dev/sign-up",
      getAuthRateLimitConfig(options.env),
      async (request, reply) => {
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
      },
    );

    app.post(
      "/change-password",
      getWriteRateLimitConfig(options.env),
      async (request, reply) => {
        try {
          const auth = await authenticateRequest(request, options.env);
          const parsedBody = changePasswordRequestSchema.safeParse(
            request.body,
          );

          if (!parsedBody.success) {
            return reply
              .code(400)
              .send(sendError("BAD_REQUEST", "Invalid password payload."));
          }

          await changePasswordForUser(
            {
              currentPassword: parsedBody.data.currentPassword,
              newPassword: parsedBody.data.newPassword,
              userId: auth.userId,
            },
            await getRepository(),
          );

          return reply.code(200).send(okResponseSchema.parse({ ok: true }));
        } catch (error) {
          if (error instanceof AuthServiceError) {
            return reply.code(401).send(sendError(error.code, error.message));
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
      "/password-reset/request",
      getAuthRateLimitConfig(options.env),
      async (request, reply) => {
        const parsedBody = requestPasswordResetRequestSchema.safeParse(
          request.body,
        );

        if (!parsedBody.success) {
          return reply
            .code(400)
            .send(sendError("BAD_REQUEST", "Invalid password reset payload."));
        }

        const responseBody = passwordResetRequestedResponseSchema.parse(
          await requestPasswordReset(
            parsedBody.data,
            await getRepository(),
            options.env,
          ),
        );

        return reply.code(202).send(responseBody);
      },
    );

    app.post(
      "/password-reset/confirm",
      getAuthRateLimitConfig(options.env),
      async (request, reply) => {
        const parsedBody = resetPasswordRequestSchema.safeParse(request.body);

        if (!parsedBody.success) {
          return reply
            .code(400)
            .send(sendError("BAD_REQUEST", "Invalid password reset payload."));
        }

        try {
          await resetPasswordWithToken(parsedBody.data, await getRepository());

          return reply.code(200).send(okResponseSchema.parse({ ok: true }));
        } catch (error) {
          if (error instanceof AuthServiceError) {
            return reply.code(400).send(sendError(error.code, error.message));
          }

          throw error;
        }
      },
    );

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
