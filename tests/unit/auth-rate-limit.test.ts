import { describe, expect, it } from "vitest";
import { buildRateLimitConfig, SENSITIVE_PATHS } from "@/lib/auth-rate-limit";

describe("buildRateLimitConfig", () => {
  it("deja el límite activo siempre, no sólo en producción", () => {
    // El defecto de better-auth es sólo-producción: un fallo de configuración
    // aparecería por primera vez al desplegar.
    expect(buildRateLimitConfig(10).enabled).toBe(true);
  });

  it("aplica el límite estrecho a alta y login", () => {
    const config = buildRateLimitConfig(7);
    for (const path of SENSITIVE_PATHS) {
      expect(config.customRules[path]).toEqual({ window: 60, max: 7 });
    }
  });

  it("cubre exactamente los endpoints sensibles y ninguno más", () => {
    expect(Object.keys(buildRateLimitConfig(10).customRules).sort()).toEqual(
      [...SENSITIVE_PATHS].sort(),
    );
  });

  it("mantiene el límite general más holgado que el de auth", () => {
    const config = buildRateLimitConfig(10);
    const sensitive = config.customRules[SENSITIVE_PATHS[0]];
    expect(config.max).toBeGreaterThan(sensitive?.max ?? Number.POSITIVE_INFINITY);
  });

  it("usa la misma ventana en la regla general y en las específicas", () => {
    const config = buildRateLimitConfig(10);
    for (const rule of Object.values(config.customRules)) {
      expect(rule.window).toBe(config.window);
    }
  });
});
