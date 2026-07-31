"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Button, Card, Field, Input } from "@/components/ui";
import type { SceneSummary } from "@/lib/dto";

export function SceneList({
  scenes,
  onCreate,
  disabled = false,
}: {
  scenes: readonly SceneSummary[];
  onCreate: (title: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [title, setTitle] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onCreate(title);
    setTitle("");
  }

  return (
    <>
      <div className="space-y-2">
        {scenes.map((scene) => (
          <Link key={scene.id} href={`/scenes/${scene.id}`} className="block">
            <Card className="transition hover:border-black/30 dark:hover:border-white/40">
              <div className="flex items-center justify-between">
                <span className="font-medium">{scene.title}</span>
                <span className="text-sm opacity-60">
                  {scene._count.lines} líneas · {scene.status.toLowerCase()}
                </span>
              </div>
            </Card>
          </Link>
        ))}
        {scenes.length === 0 && <p className="text-sm opacity-60">Sin escenas todavía.</p>}
      </div>

      <Card className="mt-4">
        <form onSubmit={submit} className="flex items-end gap-3">
          <div className="flex-1">
            <Field label="Nueva escena">
              <Input
                name="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="La taberna del Poni Pisador"
                required
              />
            </Field>
          </div>
          <Button type="submit" disabled={disabled || !title}>
            Crear
          </Button>
        </form>
      </Card>
    </>
  );
}
