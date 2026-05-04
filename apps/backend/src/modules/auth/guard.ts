import type { FastifyRequest } from "fastify";

import type { Env } from "../../shared/env.js";
import { verifyAccessToken } from "./token.js";

export class AuthError extends Error {
  constructor(message = "Authentication is required.") {
    super(message);
  }
}

export async function authenticateRequest(
  request: FastifyRequest,
  env: Env,
): Promise<{ userId: string }> {
  const authorization = request.headers.authorization;

  if (!authorization) {
    throw new AuthError();
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new AuthError();
  }

  const payload = await verifyAccessToken(token, env);

  return {
    userId: payload.sub,
  };
}
