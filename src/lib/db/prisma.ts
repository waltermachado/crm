import { PrismaClient } from "@prisma/client";

import { AppError } from "@/lib/errors/app-error";
import { getServerEnv } from "@/lib/env/server";

declare global {
  var __oslernotesPrisma__: PrismaClient | undefined;
}

export function getPrismaClient() {
  const env = getServerEnv();

  if (!env.DATABASE_URL) {
    throw new AppError("DATABASE_URL is not configured.", {
      code: "DATABASE_NOT_CONFIGURED",
      statusCode: 500,
    });
  }

  if (!globalThis.__oslernotesPrisma__) {
    globalThis.__oslernotesPrisma__ = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }

  return globalThis.__oslernotesPrisma__;
}
