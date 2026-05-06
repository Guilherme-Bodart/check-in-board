import rateLimit from "@fastify/rate-limit";

import type { Env } from "../shared/env.js";

export { rateLimit };

export function getGlobalRateLimitConfig(env: Env) {
  return {
    allowList:
      env.NODE_ENV === "test" ? ["127.0.0.1", "::1", "localhost"] : undefined,
    global: true,
    max: env.RATE_LIMIT_GLOBAL_MAX,
    timeWindow: env.RATE_LIMIT_GLOBAL_WINDOW,
  };
}

export function getAuthRateLimitConfig(env: Env) {
  return {
    config: {
      rateLimit: {
        max: env.RATE_LIMIT_AUTH_MAX,
        timeWindow: env.RATE_LIMIT_AUTH_WINDOW,
      },
    },
  };
}

export function getWriteRateLimitConfig(env: Env) {
  return {
    config: {
      rateLimit: {
        max: env.RATE_LIMIT_WRITE_MAX,
        timeWindow: env.RATE_LIMIT_WRITE_WINDOW,
      },
    },
  };
}
