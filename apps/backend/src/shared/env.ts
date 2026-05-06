import { z } from "zod";

const nodeEnvSchema = z
  .enum(["development", "test", "production"])
  .default("development");

const defaultDatabaseUrl =
  "postgresql://postgres:postgres@localhost:5432/check_in_board?schema=public";
const defaultAuthJwtSecret = "dev-auth-local-secret-not-for-production";

export function parseEnv(input: NodeJS.ProcessEnv = process.env): {
  NODE_ENV: "development" | "test" | "production";
  HOST: string;
  PORT: number;
  SERVICE_NAME: string;
  LOG_LEVEL: "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
  DATABASE_URL: string;
  AUTH_JWT_SECRET: string;
  RATE_LIMIT_AUTH_MAX: number;
  RATE_LIMIT_AUTH_WINDOW: string;
  RATE_LIMIT_GLOBAL_MAX: number;
  RATE_LIMIT_GLOBAL_WINDOW: string;
  RATE_LIMIT_WRITE_MAX: number;
  RATE_LIMIT_WRITE_WINDOW: string;
} {
  const nodeEnv = nodeEnvSchema.parse(input.NODE_ENV);
  const envSchema = z.object({
    NODE_ENV: nodeEnvSchema,
    HOST: z.string().min(1).default("0.0.0.0"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3333),
    SERVICE_NAME: z.string().min(1).default("check-in-board-backend"),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    DATABASE_URL:
      nodeEnv === "production"
        ? z.string().min(1)
        : z.string().min(1).default(defaultDatabaseUrl),
    AUTH_JWT_SECRET:
      nodeEnv === "production"
        ? z.string().min(32)
        : z.string().min(1).default(defaultAuthJwtSecret),
    RATE_LIMIT_AUTH_MAX: z.coerce.number().int().min(1).default(8),
    RATE_LIMIT_AUTH_WINDOW: z.string().min(1).default("1 minute"),
    RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().min(1).default(120),
    RATE_LIMIT_GLOBAL_WINDOW: z.string().min(1).default("1 minute"),
    RATE_LIMIT_WRITE_MAX: z.coerce.number().int().min(1).default(30),
    RATE_LIMIT_WRITE_WINDOW: z.string().min(1).default("1 hour"),
  });
  const parsedEnv = envSchema.safeParse(input);

  if (!parsedEnv.success) {
    throw new Error(
      `Invalid environment variables: ${JSON.stringify(parsedEnv.error.flatten().fieldErrors)}`,
    );
  }

  return parsedEnv.data;
}

export const env = parseEnv();

export type Env = typeof env;
