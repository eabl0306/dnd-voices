export type RateLimitRule = { window: number; max: number };

export type RateLimitConfig = {
  enabled: boolean;
  window: number;
  max: number;
  customRules: Record<string, RateLimitRule>;
};

const WINDOW_SECONDS = 60;
const GLOBAL_MAX = 100;

/** Endpoints donde repetir intentos tiene premio para un atacante. */
export const SENSITIVE_PATHS = ["/sign-up/email", "/sign-in/email"] as const;

/**
 * Política de rate limit de la API de auth.
 *
 * better-auth sólo lo activa en producción por defecto; aquí va siempre
 * activo para que un fallo de configuración no aparezca por primera vez al
 * desplegar. El límite estrecho se reserva a alta y login: frena fuerza bruta
 * y creación masiva de cuentas sin estorbar al resto de la navegación.
 */
export function buildRateLimitConfig(sensitiveMax: number): RateLimitConfig {
  return {
    enabled: true,
    window: WINDOW_SECONDS,
    max: GLOBAL_MAX,
    customRules: Object.fromEntries(
      SENSITIVE_PATHS.map((path) => [path, { window: WINDOW_SECONDS, max: sensitiveMax }]),
    ),
  };
}
