import { PrismaClient } from "@prisma/client";

// Single Prisma instance reused across hot reloads in dev
// (otherwise every reload opens a new DB connection).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
