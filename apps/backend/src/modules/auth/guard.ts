import type { FastifyRequest } from "fastify";

import type { Env } from "../../shared/env.js";
import { verifyAccessToken } from "./token.js";

export async function authenticateRequest(
  request: FastifyRequest,
  env: Env,
): Promise<{ userId: string }> {
  const authorization = request.headers.authorization;

  if (!authorization) {
    throw new Error("UNAUTHORIZED");
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new Error("UNAUTHORIZED");
  }

  const payload = await verifyAccessToken(token, env);

  return {
    userId: payload.sub,
  };
}
