import { buildApp } from "./app.js";
import { env } from "./shared/env.js";
import { logger } from "./shared/logger.js";

const app = buildApp({ env });

async function startServer(): Promise<void> {
  await app.listen({
    host: env.HOST,
    port: env.PORT,
  });
}

void startServer().catch((error: unknown) => {
  logger.fatal({ err: error }, "Failed to start backend server");
  process.exit(1);
});
