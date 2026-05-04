import Fastify from "fastify";

import { apartmentsModule } from "./modules/apartments/index.js";
import { authModule, type AuthModuleOptions } from "./modules/auth/index.js";
import { icalSourcesModule } from "./modules/ical-sources/index.js";
import { reservationsModule } from "./modules/reservations/index.js";
import { syncModule } from "./modules/sync/index.js";
import { tasksModule } from "./modules/tasks/index.js";
import { env, type Env } from "./shared/env.js";
import { logger } from "./shared/logger.js";

export type BuildAppOptions = Pick<AuthModuleOptions, "authRepository"> & {
  env?: Env;
};

export function buildApp(options: BuildAppOptions = {}) {
  const runtimeEnv = options.env ?? env;
  const app = Fastify({
    disableRequestLogging: runtimeEnv.NODE_ENV === "test",
    loggerInstance: logger,
  });

  app.get("/health", async () => {
    return {
      service: runtimeEnv.SERVICE_NAME,
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  });

  app.register(authModule, {
    authRepository: options.authRepository,
    env: runtimeEnv,
    prefix: "/auth",
  });
  app.register(apartmentsModule, { prefix: "/apartments" });
  app.register(icalSourcesModule, { prefix: "/ical-sources" });
  app.register(reservationsModule, { prefix: "/reservations" });
  app.register(tasksModule, { prefix: "/tasks" });
  app.register(syncModule, { prefix: "/sync" });

  return app;
}
