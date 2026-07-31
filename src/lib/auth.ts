import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { buildRateLimitConfig } from "@/lib/auth-rate-limit";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { lazyProxy } from "@/lib/lazy";

function createAuth() {
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: prismaAdapter(db, { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      // Sin proveedor de correo configurado, verificar bloquearía el alta.
      requireEmailVerification: false,
    },
    rateLimit: buildRateLimitConfig(env.AUTH_RATE_LIMIT_MAX),
    // Debe ir el último: escribe las cookies de sesión en las server actions.
    plugins: [nextCookies()],
  });
}

export const auth = lazyProxy(createAuth);

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
