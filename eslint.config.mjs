import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // Ignorados por defecto en eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Código generado o compilado: no se edita a mano, no se lintea.
    "src/generated/**",
    "dist/**",
    "coverage/**",
    "test-results/**",
    "playwright-report/**",
  ]),
  {
    // Las reglas de React no aplican a los tests de servidor: `use` es el
    // nombre del callback de un fixture de Playwright, no un hook.
    files: ["tests/**/*.ts"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
]);

export default eslintConfig;
