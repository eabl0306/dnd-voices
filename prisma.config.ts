import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 ya no carga .env por su cuenta.
try {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
} catch {
  // Sin .env local: en Docker y en producción las variables vienen del entorno.
}

const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: { path: path.join("prisma", "migrations") },
  // Sólo `migrate` necesita la URL. `generate` corre en el build de la imagen,
  // donde todavía no hay base de datos: declararla siempre rompería el build.
  ...(databaseUrl ? { datasource: { url: databaseUrl } } : {}),
});
