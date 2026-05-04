import pino from "pino";

import { env } from "./env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  name: env.SERVICE_NAME,
  timestamp: pino.stdTimeFunctions.isoTime,
});
