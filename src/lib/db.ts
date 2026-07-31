import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";
import { lazyProxy } from "@/lib/lazy";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  // El hot reload de Next crearía un pool nuevo en cada recarga sin el singleton.
  globalForPrisma.prisma ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });
  return globalForPrisma.prisma;
}

export const db = lazyProxy(createClient);
