import { describe, expect, it } from "vitest";
import { formatCount, formatDuration, pluralize } from "@/lib/format";
import { DEFAULT_THEME, isTheme, otherTheme, THEME_BOOTSTRAP, themeLabel } from "@/lib/theme";

describe("formatDuration", () => {
  it.each([
    [0, "00:00"],
    [1000, "00:01"],
    [78_000, "01:18"],
    [227_000, "03:47"],
    [3_600_000, "60:00"],
  ])("formatea %i ms como %s", (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });

  it.each([null, undefined, Number.NaN, -1])("devuelve marcador con %s", (value) => {
    expect(formatDuration(value)).toBe("--:--");
  });
});

describe("formatCount", () => {
  it("separa los miles a la española", () => {
    expect(formatCount(1482)).toBe("1482");
    expect(formatCount(18_400)).toBe("18.400");
  });
});

describe("pluralize", () => {
  it("usa el singular sólo con uno", () => {
    expect(pluralize(1, "línea", "líneas")).toBe("1 línea");
    expect(pluralize(0, "línea", "líneas")).toBe("0 líneas");
    expect(pluralize(2, "línea", "líneas")).toBe("2 líneas");
  });
});

describe("tema", () => {
  it("arranca en oscuro: la app se usa en mesa", () => {
    expect(DEFAULT_THEME).toBe("dark");
  });

  it("alterna entre los dos temas", () => {
    expect(otherTheme("dark")).toBe("light");
    expect(otherTheme(otherTheme("dark"))).toBe("dark");
  });

  it("rechaza valores que no son un tema", () => {
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("sepia")).toBe(false);
    expect(isTheme(null)).toBe(false);
  });

  it("etiqueta en español", () => {
    expect(themeLabel("dark")).toBe("Oscuro");
    expect(themeLabel("light")).toBe("Claro");
  });

  it("el script de arranque es autónomo y tolera fallos", () => {
    // Va inline en el <head>: si lanzara, la página se quedaría en blanco.
    expect(THEME_BOOTSTRAP).toContain("try");
    expect(THEME_BOOTSTRAP).toContain("catch");
    expect(THEME_BOOTSTRAP).toContain("data-theme" in {} ? "" : "dataset.theme");
  });
});
