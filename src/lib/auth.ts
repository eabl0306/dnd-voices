import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { buildRateLimitConfig } from "@/lib/auth-rate-limit";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { lazyProxy } from "@/lib/lazy";
import { isSignupAllowed, parseAllowlist } from "@/lib/signup-allowlist";

function createAuth() {
  const allowlist = parseAllowlist(env.SIGNUP_ALLOWLIST);

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
    // El filtro va aquí y no en la ruta de alta: cubre cualquier camino que
    // acabe creando un usuario, incluidos los proveedores sociales que se
    // añadan después.
    databaseHooks: {
      user: {
        create: {
          async before(user) {
            if (!isSignupAllowed(user.email, allowlist)) {
              throw new APIError("FORBIDDEN", {
                code: "EMAIL_NOT_ALLOWED",
                message: "Este correo no está autorizado a crear una cuenta.",
              });
            }
          },
        },
      },
    },
    // Debe ir el último: escribe las cookies de sesión en las server actions.
    plugins: [nextCookies()],
  });
}

export const auth = lazyProxy(createAuth);

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
