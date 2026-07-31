"use client";

import { Button, Card, Textarea } from "@/components/ui";

const PLACEHOLDER = `Pega aquí el texto tal cual: narración y diálogo mezclados.

La taberna huele a cerveza rancia. Thorin golpea la mesa: «¡Ya basta de esperar!»`;

export function RawTextPanel({
  value,
  onChange,
  onParse,
  onSave,
  pending,
}: {
  value: string;
  onChange: (value: string) => void;
  onParse: () => void;
  onSave: () => void;
  pending: string;
}) {
  const busy = pending !== "";

  return (
    <Card className="mb-8">
      <h2 className="mb-3 font-medium">Texto de la escena</h2>
      <Textarea
        aria-label="Texto de la escena"
        rows={12}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={PLACEHOLDER}
      />
      <div className="mt-3 flex items-center gap-2">
        <Button onClick={onParse} disabled={busy || !value.trim()}>
          {pending === "parse" ? "Analizando…" : "Identificar hablantes"}
        </Button>
        <Button variant="ghost" onClick={onSave} disabled={busy}>
          Guardar sin analizar
        </Button>
      </div>
    </Card>
  );
}
