import { describe, expect, it } from "vitest";
import { type CacheKeyInput, cacheKeyFor, clipKey } from "@/lib/render/cache-key";
import type { VoiceSettings } from "@/lib/types";

const SETTINGS: VoiceSettings = {
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0.2,
  speed: 1,
};

const BASE: CacheKeyInput = {
  ttsModel: "eleven_multilingual_v2",
  voiceId: "voice-abc",
  languageCode: "es",
  text: "¡Ya basta de esperar!",
  settings: SETTINGS,
};

describe("cacheKeyFor", () => {
  it("es determinista para la misma entrada", () => {
    expect(cacheKeyFor(BASE)).toBe(cacheKeyFor({ ...BASE }));
  });

  it("no depende del orden de claves del objeto de ajustes", () => {
    // Prisma no garantiza el orden al deserializar el JSON de voiceSettings.
    const reordered: VoiceSettings = {
      speed: SETTINGS.speed,
      style: SETTINGS.style,
      similarityBoost: SETTINGS.similarityBoost,
      stability: SETTINGS.stability,
    };
    expect(cacheKeyFor({ ...BASE, settings: reordered })).toBe(cacheKeyFor(BASE));
  });

  it.each([
    ["texto", { text: "Otra cosa" }],
    ["voz", { voiceId: "voice-xyz" }],
    ["idioma", { languageCode: "en" }],
    ["modelo", { ttsModel: "eleven_v3" }],
  ] as const)("cambia si cambia el %s", (_label, patch) => {
    expect(cacheKeyFor({ ...BASE, ...patch })).not.toBe(cacheKeyFor(BASE));
  });

  it.each(["stability", "similarityBoost", "style", "speed"] as const)(
    "cambia si cambia %s",
    (field) => {
      const settings: VoiceSettings = { ...SETTINGS, [field]: SETTINGS[field] - 0.1 };
      expect(cacheKeyFor({ ...BASE, settings })).not.toBe(cacheKeyFor(BASE));
    },
  );

  it("distingue ajustes ausentes de ajustes presentes", () => {
    expect(cacheKeyFor({ ...BASE, settings: null })).not.toBe(cacheKeyFor(BASE));
  });

  it("no colisiona al mover texto entre campos contiguos", () => {
    // Sin separador, hash("ab","c") y hash("a","bc") coincidirían.
    const a = cacheKeyFor({ ...BASE, voiceId: "ab", languageCode: "c" });
    const b = cacheKeyFor({ ...BASE, voiceId: "a", languageCode: "bc" });
    expect(a).not.toBe(b);
  });
});

describe("clipKey", () => {
  it("deriva una ruta estable dentro de clips/", () => {
    expect(clipKey("deadbeef")).toBe("clips/deadbeef.mp3");
  });
});
