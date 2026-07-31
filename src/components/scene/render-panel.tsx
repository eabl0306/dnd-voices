"use client";

import { Badge, Card, ErrorNote, ProgressBar, type Tone } from "@/components/ui";
import type { RenderDto, RenderStatus } from "@/lib/dto";
import { isRenderSettled } from "@/lib/dto";

const STATUS_TONE: Record<RenderStatus, Tone> = {
  QUEUED: "warn",
  RUNNING: "warn",
  DONE: "ok",
  FAILED: "bad",
};

export function RenderPanel({ render }: { render: RenderDto }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="font-medium">Render</span>
        <Badge tone={STATUS_TONE[render.status]}>{render.status.toLowerCase()}</Badge>
      </div>

      {!isRenderSettled(render.status) && <ProgressBar value={render.progress} />}

      {render.error && <ErrorNote>{render.error}</ErrorNote>}

      {render.status === "DONE" && (
        <>
          {/* biome-ignore lint/a11y/useMediaCaption: el audio ES el guion que se muestra arriba */}
          <audio
            data-testid="render-audio"
            className="mt-3 w-full"
            controls
            src={`/api/renders/${render.id}/audio`}
          />
          <p className="mt-2 text-xs opacity-60">
            {render.cacheHits} líneas servidas desde caché · {render.charsBilled} caracteres
            facturados a ElevenLabs.
          </p>
        </>
      )}
    </Card>
  );
}
