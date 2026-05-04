import { PrismaClient } from "@prisma/client";

import { env } from "../shared/env.js";

const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
