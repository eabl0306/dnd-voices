import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
  ANTHROPIC_API_KEY: z.string().min(1),
  ELEVENLABS_API_KEY: z.string().min(1),
  STORAGE_DIR: z.string().min(1).default("./storage"),
  /**
   * Intentos por minuto y por IP contra alta y login. El valor por defecto
   * frena fuerza bruta y creación masiva de cuentas; se sube sólo en entornos
   * de prueba, donde todos los casos salen de la misma IP.
   */
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  /**
   * Correos autorizados a darse de alta, separados por comas o saltos de línea.
   * Vacío deja el alta abierta: la instancia se cierra añadiendo correos, no
   * quitando la variable.
   */
  SIGNUP_ALLOWLIST: z.string().default(""),
});

type Env = z.infer<typeof schema>;

const cache = new Map<string, unknown>();

/**
 * Validación perezosa, variable a variable.
 *
 * Validar todo al importar rompería `next build`, que evalúa los módulos para
 * recolectar rutas sin tener las claves de producción a mano. Así cada clave
 * falla en el momento en que alguien la usa de verdad, con un mensaje que dice
 * cuál falta, en vez de reventar a mitad de un render ya facturado.
 */
export const env = new Proxy({} as Env, {
  get(_target, property) {
    // Símbolos internos (Symbol.toStringTag, inspección de Node...) no son
    // variables de entorno; lanzar aquí rompería cualquier console.log.
    if (typeof property !== "string") return undefined;

    // Await, Promise.resolve y las utilidades de test comprueban `.then` para
    // saber si el objeto es un thenable. Sin este guardia, devolver `env`
    // desde una función async lanzaría "variable desconocida: then".
    if (property === "then") return undefined;

    if (cache.has(property)) return cache.get(property);

    const field = schema.shape[property as keyof Env];
    if (!field) throw new Error(`Variable de entorno desconocida: ${property}`);

    const parsed = field.safeParse(process.env[property]);
    if (!parsed.success) {
      throw new Error(
        `Falta o es inválida la variable de entorno ${property}: ${parsed.error.issues[0]?.message}. Revisa tu .env (ver .env.example).`,
      );
    }

    cache.set(property, parsed.data);
    return parsed.data;
  },
});
