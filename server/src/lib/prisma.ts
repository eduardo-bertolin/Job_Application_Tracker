import pkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { PrismaClient } = pkg;
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/job_tracker_dev";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Singleton pattern — prevents multiple PrismaClient instances in dev (hot-reload)
const globalForPrisma = globalThis as unknown as { prisma: InstanceType<typeof PrismaClient> };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
