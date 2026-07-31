"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button, Card, ErrorNote, Field, Input, Shell } from "@/components/ui";
import { signIn, signUp } from "@/lib/auth-client";

type Mode = "in" | "up";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const result =
      mode === "in"
        ? await signIn.email({ email, password })
        : await signUp.email({ name, email, password });

    setBusy(false);
    if (result.error) setError(result.error.message ?? "No se pudo completar la operación.");
    else router.push("/campaigns");
  }

  return (
    <Shell title="DnD Voices">
      <Card className="max-w-md">
        <form onSubmit={submit} className="space-y-4">
          {mode === "up" && (
            <Field label="Nombre">
              <Input
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </Field>
          )}
          <Field label="Email">
            <Input
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          <Field label="Contraseña" hint="Mínimo 8 caracteres.">
            <Input
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </Field>

          <ErrorNote>{error}</ErrorNote>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? "…" : mode === "in" ? "Entrar" : "Crear cuenta"}
            </Button>
            <button
              type="button"
              className="text-sm opacity-60 hover:opacity-100"
              onClick={() => {
                setMode(mode === "in" ? "up" : "in");
                setError("");
              }}
            >
              {mode === "in" ? "Crear una cuenta" : "Ya tengo cuenta"}
            </button>
          </div>
        </form>
      </Card>
    </Shell>
  );
}
