"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Button, ErrorNote, Input, MonoField } from "@/components/ui";
import { signIn, signUp } from "@/lib/auth-client";

type Mode = "in" | "up";

const COPY = {
  in: {
    title: "Entra a tu mesa",
    cta: "Entrar",
    switchText: "¿Aún no tienes cuenta?",
    switchCta: "Darse de alta",
  },
  up: {
    title: "Crea tu cuenta",
    cta: "Crear cuenta",
    switchText: "¿Ya tienes cuenta?",
    switchCta: "Entrar",
  },
} as const;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const copy = COPY[mode];

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const result =
      mode === "in"
        ? await signIn.email({ email, password })
        : await signUp.email({ name: name || email, email, password });

    setBusy(false);
    if (result.error) setError(result.error.message ?? "No se pudo completar la operación.");
    else router.push("/campaigns");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-[18px] px-5 py-12">
      <div className="flex w-full max-w-[392px] items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[14px] font-semibold">DnD&nbsp;Voices</span>
          <span className="font-mono text-[11px] tracking-[0.06em] text-text3">v0.4</span>
        </div>
        <ThemeToggle compact />
      </div>

      <div className="w-full max-w-[392px]">
        <div className="mb-5">
          <h1 className="mb-[6px] text-[22px] font-semibold tracking-[-0.01em]">{copy.title}</h1>
          <p className="text-[14px] leading-[1.5] text-text2">
            Tus escenas, tu reparto y las voces ya generadas, en un sitio.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-[10px] border border-line bg-panel p-[22px] shadow-[var(--shadow)]"
        >
          {mode === "up" && (
            <div className="mb-[14px]">
              <MonoField label="Nombre">
                <Input
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ezequiel"
                  required
                />
              </MonoField>
            </div>
          )}

          <div className="mb-[14px]">
            <MonoField label="Email">
              <Input
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="dm@mesa.es"
                required
              />
            </MonoField>
          </div>

          <div className="mb-[18px]">
            <MonoField label="Contraseña">
              <Input
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
              />
            </MonoField>
          </div>

          {error && (
            <div className="mb-[14px]">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}

          <Button type="submit" disabled={busy} className="w-full py-[10px] text-center">
            {busy ? "…" : copy.cta}
          </Button>

          <div className="mt-4 flex items-center gap-2 border-t border-line pt-[14px] text-[13px] text-text2">
            <span>{copy.switchText}</span>
            <button
              type="button"
              className="font-medium text-accent hover:underline"
              onClick={() => {
                setMode(mode === "in" ? "up" : "in");
                setError("");
              }}
            >
              {copy.switchCta}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
