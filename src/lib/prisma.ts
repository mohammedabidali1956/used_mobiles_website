/**
 * Prisma Client singleton for Next.js.
 *
 * In development, Next.js hot-reload creates new module instances on every
 * file change, which would exhaust the database connection pool if we created
 * a new PrismaClient each time. We attach the instance to `globalThis` so it
 * survives hot-reloads.
 *
 * In production (Vercel serverless), each function invocation is isolated, so
 * the global trick is a no-op — a fresh client is created per cold start and
 * reused across warm invocations of the same function container.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
