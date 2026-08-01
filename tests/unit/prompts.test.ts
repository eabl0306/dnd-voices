import { describe, expect, it } from "vitest";
import {
  ATTRIBUTION_INSTRUCTIONS,
  NARRATOR,
  renderRosterPrompt,
} from "@/lib/ai/prompts/attribution";
import {
  DESIGN_INSTRUCTIONS,
  POOL_INSTRUCTIONS,
  renderCataloguePrompt,
  renderCharacterPrompt,
} from "@/lib/ai/prompts/casting";
import type { PoolVoice, RosterEntry } from "@/lib/types";

const entry = (patch: Partial<RosterEntry>): RosterEntry => ({
  name: "Thorin",
  aliases: [],
  description: "",
  isNarrator: false,
  ...patch,
});

describe("ATTRIBUTION_INSTRUCTIONS", () => {
  it("usa la misma etiqueta de narrador que el mapeador", () => {
    // Si divergen, toda línea del narrador quedaría sin atribuir.
    expect(ATTRIBUTION_INSTRUCTIONS).toContain(`"${NARRATOR}"`);
  });

  it("supera el mínimo cacheable de claude-opus-5 (512 tokens ≈ 2000 chars)", () => {
    // Por debajo del mínimo el prompt deja de cachear en silencio.
    expect(ATTRIBUTION_INSTRUCTIONS.length).toBeGreaterThan(2000);
  });
});

describe("renderRosterPrompt", () => {
  it("excluye al narrador de la lista de personajes", () => {
    const prompt = renderRosterPrompt("Campaña", "", [
      entry({ name: "Narrador", isNarrator: true }),
      entry({ name: "Thorin" }),
    ]);
    expect(prompt).toContain("- Thorin");
    expect(prompt).not.toContain("- Narrador");
  });

  it("incluye los alias para que Claude reconozca epítetos", () => {
    const prompt = renderRosterPrompt("Campaña", "", [
      entry({ aliases: ["el enano", "hijo de Thráin"] }),
    ]);
    expect(prompt).toContain("(también: el enano, hijo de Thráin)");
  });

  it("omite el paréntesis de alias cuando no hay ninguno", () => {
    expect(renderRosterPrompt("Campaña", "", [entry({})])).not.toContain("también:");
  });

  it("incluye la descripción tras un guion largo", () => {
    const prompt = renderRosterPrompt("Campaña", "", [entry({ description: "enano gruñón" })]);
    expect(prompt).toContain("- Thorin — enano gruñón");
  });

  it("avisa cuando no hay personajes en vez de dejar el bloque vacío", () => {
    const prompt = renderRosterPrompt("Campaña", "", [
      entry({ name: "Narrador", isNarrator: true }),
    ]);
    expect(prompt).toContain("atribuye todo al narrador");
  });

  it("marca explícitamente una ambientación vacía", () => {
    expect(renderRosterPrompt("Campaña", "", [])).toContain("(sin ambientación registrada)");
  });

  it("es estable entre llamadas para no invalidar la caché de prompt", () => {
    const roster = [entry({ aliases: ["el enano"], description: "gruñón" })];
    expect(renderRosterPrompt("C", "S", roster)).toBe(renderRosterPrompt("C", "S", roster));
  });
});

describe("renderCharacterPrompt", () => {
  const campaign = { campaignName: "Chult", setting: "Selva", language: "es" };

  it("marca al narrador para que el casting priorice claridad", () => {
    const prompt = renderCharacterPrompt(
      { name: "Narrador", description: "", backstory: "", isNarrator: true },
      campaign,
    );
    expect(prompt).toContain("(NARRADOR)");
  });

  it("no marca a un personaje normal", () => {
    const prompt = renderCharacterPrompt(
      { name: "Thorin", description: "", backstory: "", isNarrator: false },
      campaign,
    );
    expect(prompt).not.toContain("(NARRADOR)");
  });

  it("pasa el idioma para que previewText salga en el idioma correcto", () => {
    const prompt = renderCharacterPrompt(
      { name: "X", description: "", backstory: "", isNarrator: false },
      { ...campaign, language: "en" },
    );
    expect(prompt).toContain("Idioma: en");
  });

  it("marca los campos vacíos en vez de dejarlos en blanco", () => {
    const prompt = renderCharacterPrompt(
      { name: "X", description: "", backstory: "", isNarrator: false },
      campaign,
    );
    expect(prompt).toContain("(vacía)");
    expect(prompt).toContain("(vacío)");
  });
});

describe("renderCataloguePrompt", () => {
  const voice = (patch: Partial<PoolVoice>): PoolVoice => ({
    voiceId: "v1",
    name: "Rachel",
    description: "",
    labels: {},
    takenBy: [],
    ...patch,
  });

  it("pone el voiceId primero para que se pueda copiar literalmente", () => {
    expect(renderCataloguePrompt([voice({})])).toContain("- v1 | Rachel");
  });

  it("aplana las etiquetas a pares clave=valor", () => {
    const prompt = renderCataloguePrompt([voice({ labels: { accent: "british", age: "old" } })]);
    expect(prompt).toContain("accent=british, age=old");
  });

  it("omite los campos vacíos sin dejar separadores sueltos", () => {
    expect(renderCataloguePrompt([voice({})])).not.toContain("| |");
  });

  it("marca las voces libres y las ya ocupadas", () => {
    // Es lo que permite repartir en vez de dar a todos la que mejor encaja.
    expect(renderCataloguePrompt([voice({})])).toContain("libre");
    expect(renderCataloguePrompt([voice({ takenBy: ["Narrador"] })])).toContain(
      "YA LA USA: Narrador",
    );
  });

  it("nombra a todos los que comparten una voz", () => {
    const prompt = renderCataloguePrompt([voice({ takenBy: ["Kaz", "Perrin"] })]);
    expect(prompt).toContain("YA LA USA: Kaz, Perrin");
  });
});

describe("instrucciones de casting", () => {
  it("comparten el criterio común de dirección de voz", () => {
    expect(DESIGN_INSTRUCTIONS).toContain("director de casting");
    expect(POOL_INSTRUCTIONS).toContain("director de casting");
  });

  it("divergen en lo que piden como salida", () => {
    expect(DESIGN_INSTRUCTIONS).toContain("voz nueva desde cero");
    expect(POOL_INSTRUCTIONS).toContain("catálogo");
  });
});
