import { describe, expect, it } from "vitest";
import { activeNavKey, navContextFromPath, navQuery } from "@/lib/nav";

describe("navContextFromPath", () => {
  it.each([
    ["/campaigns/c1", "c1"],
    ["/campaigns/c1/characters", "c1"],
    ["/campaigns/c1/scenes", "c1"],
  ])("saca la campaña de %s", (path, expected) => {
    expect(navContextFromPath(path)).toEqual({ campaignId: expected, sceneId: null });
  });

  it("desde el editor devuelve la escena, no la campaña", () => {
    // La shell no conoce la campaña de una escena: la resuelve el servidor.
    expect(navContextFromPath("/scenes/s1")).toEqual({ campaignId: null, sceneId: "s1" });
  });

  it.each(["/campaigns", "/voices", "/", "/login"])("no saca contexto de %s", (path) => {
    expect(navContextFromPath(path)).toEqual({ campaignId: null, sceneId: null });
  });
});

describe("activeNavKey", () => {
  it.each([
    ["/campaigns", "campaigns"],
    ["/campaigns/c1", "overview"],
    ["/campaigns/c1/characters", "characters"],
    ["/campaigns/c1/scenes", "scenes"],
    ["/scenes/s1", "editor"],
    ["/voices", "voices"],
  ] as const)("marca %s como %s", (path, expected) => {
    expect(activeNavKey(path)).toBe(expected);
  });

  it("no marca nada fuera de la app", () => {
    expect(activeNavKey("/login")).toBeNull();
  });

  it("no confunde las subrutas de campaña con el resumen", () => {
    // `/campaigns/c1/scenes` empieza igual que `/campaigns/c1`: el orden de
    // las comprobaciones es lo que evita que se marque «Resumen».
    expect(activeNavKey("/campaigns/c1/scenes")).not.toBe("overview");
  });
});

describe("navQuery", () => {
  it("prefiere la campaña cuando se conoce", () => {
    expect(navQuery({ campaignId: "c1", sceneId: "s1" })).toBe("?campaignId=c1");
  });

  it("cae a la escena si no hay campaña", () => {
    expect(navQuery({ campaignId: null, sceneId: "s1" })).toBe("?sceneId=s1");
  });

  it("no manda parámetros sin contexto", () => {
    expect(navQuery({ campaignId: null, sceneId: null })).toBe("");
  });

  it("escapa los identificadores", () => {
    expect(navQuery({ campaignId: "a b&c", sceneId: null })).toBe("?campaignId=a%20b%26c");
  });
});
