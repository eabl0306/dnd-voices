import { beforeEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => ({
  exists: vi.fn<(key: string) => Promise<boolean>>(),
  write: vi.fn<(key: string, data: Buffer) => Promise<string>>(),
  hash: vi.fn((...parts: unknown[]) => parts.map(String).join("|")),
}));

const ttsMock = vi.hoisted(() => ({
  synthesize: vi.fn<() => Promise<Buffer>>(),
  OUTPUT_FORMAT: "mp3_44100_192",
}));

vi.mock("@/lib/storage", () => storageMock);
vi.mock("@/lib/tts/elevenlabs", () => ttsMock);

const { synthesizeLine } = await import("@/lib/render/synthesize-line");

const LINE = {
  text: "¡Ya basta de esperar!",
  delivery: null,
  voiceId: "voice-abc",
  model: "eleven_multilingual_v2",
  settings: null,
  languageCode: "es",
};

beforeEach(() => {
  vi.clearAllMocks();
  storageMock.write.mockResolvedValue("ok");
  ttsMock.synthesize.mockResolvedValue(Buffer.from("audio"));
});

describe("synthesizeLine", () => {
  it("no llama a ElevenLabs si el clip ya está en disco", async () => {
    storageMock.exists.mockResolvedValue(true);

    const clip = await synthesizeLine(LINE);

    // Es la línea que separa iterar de arruinarse: ElevenLabs cobra por carácter.
    expect(ttsMock.synthesize).not.toHaveBeenCalled();
    expect(storageMock.write).not.toHaveBeenCalled();
    expect(clip.billed).toBe(false);
    expect(clip.charsBilled).toBe(0);
  });

  it("sintetiza y guarda cuando el clip no existe", async () => {
    storageMock.exists.mockResolvedValue(false);

    const clip = await synthesizeLine(LINE);

    expect(ttsMock.synthesize).toHaveBeenCalledTimes(1);
    expect(storageMock.write).toHaveBeenCalledWith(clip.audioKey, Buffer.from("audio"));
    expect(clip.billed).toBe(true);
  });

  it("factura exactamente los caracteres del texto", async () => {
    storageMock.exists.mockResolvedValue(false);
    const clip = await synthesizeLine(LINE);
    expect(clip.charsBilled).toBe(LINE.text.length);
  });

  it("devuelve la misma ruta tanto si acierta la caché como si no", async () => {
    storageMock.exists.mockResolvedValue(true);
    const cached = await synthesizeLine(LINE);

    storageMock.exists.mockResolvedValue(false);
    const fresh = await synthesizeLine(LINE);

    expect(cached.audioKey).toBe(fresh.audioKey);
    expect(cached.cacheKey).toBe(fresh.cacheKey);
  });

  it("pasa el contexto de las líneas vecinas al sintetizador", async () => {
    storageMock.exists.mockResolvedValue(false);

    await synthesizeLine({ ...LINE, previousText: "antes", nextText: "después" });

    expect(ttsMock.synthesize).toHaveBeenCalledWith(
      expect.objectContaining({ previousText: "antes", nextText: "después" }),
    );
  });

  it("no manda el contexto vecino a v3, que lo rechaza con un 400", async () => {
    storageMock.exists.mockResolvedValue(false);

    await synthesizeLine({
      ...LINE,
      model: "eleven_v3",
      previousText: "antes",
      nextText: "después",
    });

    expect(ttsMock.synthesize).toHaveBeenCalledWith(
      expect.objectContaining({ previousText: undefined, nextText: undefined }),
    );
  });

  it("antepone la indicación de interpretación en los modelos que la entienden", async () => {
    storageMock.exists.mockResolvedValue(false);

    await synthesizeLine({ ...LINE, model: "eleven_v3", delivery: "susurrando" });

    expect(ttsMock.synthesize).toHaveBeenCalledWith(
      expect.objectContaining({ text: "[susurrando] ¡Ya basta de esperar!" }),
    );
  });

  it("no la antepone en un modelo que la leería en voz alta", async () => {
    storageMock.exists.mockResolvedValue(false);

    await synthesizeLine({ ...LINE, delivery: "susurrando" });

    expect(ttsMock.synthesize).toHaveBeenCalledWith(
      expect.objectContaining({ text: "¡Ya basta de esperar!" }),
    );
  });

  it("la indicación cambia el clip, así que cambia la clave de caché", async () => {
    storageMock.exists.mockResolvedValue(true);

    const sin = await synthesizeLine({ ...LINE, model: "eleven_v3" });
    const con = await synthesizeLine({ ...LINE, model: "eleven_v3", delivery: "gritando" });

    expect(sin.cacheKey).not.toBe(con.cacheKey);
  });

  it("cambia de clip cuando cambia el modelo de la voz", async () => {
    storageMock.exists.mockResolvedValue(true);

    const v2 = await synthesizeLine(LINE);
    const v3 = await synthesizeLine({ ...LINE, model: "eleven_v3" });

    expect(v2.cacheKey).not.toBe(v3.cacheKey);
  });

  it("no mete el contexto vecino en la clave de caché", async () => {
    storageMock.exists.mockResolvedValue(true);

    const solo = await synthesizeLine(LINE);
    const conVecinos = await synthesizeLine({ ...LINE, previousText: "x", nextText: "y" });

    // Si entrara, editar una línea invalidaría los clips de sus dos vecinas.
    expect(solo.cacheKey).toBe(conVecinos.cacheKey);
  });

  it("cambia de clip cuando cambian los ajustes de voz", async () => {
    storageMock.exists.mockResolvedValue(true);

    const sinAjustes = await synthesizeLine(LINE);
    const conAjustes = await synthesizeLine({
      ...LINE,
      settings: { stability: 0.4, similarityBoost: 0.8, style: 0.1, speed: 1 },
    });

    expect(sinAjustes.cacheKey).not.toBe(conAjustes.cacheKey);
  });

  it("no marca como facturado un clip que falló al sintetizarse", async () => {
    storageMock.exists.mockResolvedValue(false);
    ttsMock.synthesize.mockRejectedValue(new Error("429 de ElevenLabs"));

    await expect(synthesizeLine(LINE)).rejects.toThrow("429");
    expect(storageMock.write).not.toHaveBeenCalled();
  });
});
