import Fastify from "fastify";

import {
  apartmentsModule,
  type ApartmentsModuleOptions,
} from "./modules/apartments/index.js";
import { authModule, type AuthModuleOptions } from "./modules/auth/index.js";
import {
  icalSourcesModule,
  type IcalSourcesModuleOptions,
} from "./modules/ical-sources/index.js";
import {
  membersModule,
  type MembersModuleOptions,
} from "./modules/members/index.js";
import { reservationsModule } from "./modules/reservations/index.js";
import type { ReservationsModuleOptions } from "./modules/reservations/index.js";
import { syncModule } from "./modules/sync/index.js";
import { tasksModule, type TasksModuleOptions } from "./modules/tasks/index.js";
import { getGlobalRateLimitConfig, rateLimit } from "./plugins/rate-limit.js";
import { env, type Env } from "./shared/env.js";
import { logger } from "./shared/logger.js";

export type BuildAppOptions = Pick<AuthModuleOptions, "authRepository"> &
  Pick<ApartmentsModuleOptions, "apartmentsRepository"> &
  Pick<IcalSourcesModuleOptions, "icalSourcesRepository"> & {
    membersRepository?: MembersModuleOptions["membersRepository"];
    reservationsRepository?: ReservationsModuleOptions["reservationsRepository"];
    tasksRepository?: TasksModuleOptions["tasksRepository"];
    env?: Env;
  };

export function buildApp(options: BuildAppOptions = {}) {
  const runtimeEnv = options.env ?? env;
  const app = Fastify({
    disableRequestLogging: runtimeEnv.NODE_ENV === "test",
    loggerInstance: logger,
  });

  app.register(rateLimit, getGlobalRateLimitConfig(runtimeEnv));

  app.after(() => {
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
    app.register(apartmentsModule, {
      apartmentsRepository: options.apartmentsRepository,
      env: runtimeEnv,
      prefix: "/apartments",
    });
    app.register(icalSourcesModule, {
      env: runtimeEnv,
      icalSourcesRepository: options.icalSourcesRepository,
    });
    app.register(membersModule, {
      env: runtimeEnv,
      membersRepository: options.membersRepository,
    });
    app.register(reservationsModule, {
      env: runtimeEnv,
      reservationsRepository: options.reservationsRepository,
    });
    app.register(tasksModule, {
      env: runtimeEnv,
      tasksRepository: options.tasksRepository,
    });
    app.register(syncModule, { prefix: "/sync" });
  });

  return app;
}
