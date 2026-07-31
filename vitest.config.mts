import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    env: {
      // Los módulos bajo test leen el entorno de forma perezosa; estos valores
      // evitan depender de un .env real para correr los unitarios.
      STORAGE_DIR: "./.tmp-test-storage",
      DATABASE_URL: "postgresql://test/test",
      BETTER_AUTH_SECRET: "test-secret",
      ANTHROPIC_API_KEY: "test-anthropic",
      ELEVENLABS_API_KEY: "test-eleven",
    },
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      include: ["src/lib/**/*.ts"],
      // Plomería de I/O y de red: se cubre en los e2e, no aquí.
      exclude: [
        "src/lib/db.ts",
        "src/lib/auth.ts",
        "src/lib/auth-client.ts",
        "src/lib/queue.ts",
        "src/lib/ai/client.ts",
        "src/lib/**/index.ts",
      ],
    },
  },
});
