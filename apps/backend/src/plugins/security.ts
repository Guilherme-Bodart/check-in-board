import cors from "@fastify/cors";
import type { FastifyCorsOptions } from "@fastify/cors";
import helmet from "@fastify/helmet";

import type { Env } from "../shared/env.js";

function parseCorsOrigins(value: string) {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export { cors, helmet };

export function getCorsConfig(env: Env): FastifyCorsOptions {
  const allowedOrigins = parseCorsOrigins(env.CORS_ORIGINS);

  return {
    origin: allowedOrigins.includes("*") ? true : allowedOrigins,
  };
}

export function getHelmetConfig() {
  return {
    contentSecurityPolicy: false,
  };
}
