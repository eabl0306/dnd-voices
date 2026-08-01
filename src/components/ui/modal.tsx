"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { Button } from "@/components/ui/primitives";
import { GLYPH } from "@/lib/tone";

export type ModalProps = {
  title: string;
  subtitle?: string;
  width?: number;
  note?: string;
  submitLabel: string;
  submitting?: boolean;
  submitDisabled?: boolean;
  onSubmit: () => void;
  onClose: () => void;
  /** Acción destructiva, a la izquierda y separada de la principal. */
  destructive?: { label: string; onClick: () => void };
  children: ReactNode;
};

/**
 * Diálogo centrado arriba, con cierre por ✕, clic en el overlay o Esc.
 *
 * El formulario envuelve el cuerpo para que Intro envíe: en un modal de un solo
 * campo, obligar a llevar el ratón al botón es una fricción gratuita.
 */
export function Modal({
  title,
  subtitle,
  width = 520,
  note,
  submitLabel,
  submitting = false,
  submitDisabled = false,
  onSubmit,
  onClose,
  destructive,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    // El primer campo enfocado ahorra un clic en el caso habitual.
    dialogRef.current?.querySelector<HTMLElement>("input, textarea, select, button")?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-70 flex items-start justify-center overflow-y-auto px-4 pt-14 pb-8"
      style={{ background: "var(--overlay)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full rounded-[12px] border border-line2 bg-panel shadow-[var(--shadow)]"
        style={{ maxWidth: width, animation: "fadeUp .18s ease both" }}
        onClick={(event) => event.stopPropagation()}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="flex items-start gap-3 border-b border-line px-[18px] py-4">
            <div className="min-w-0 flex-1">
              <h2 className="mb-1 text-[16px] font-semibold">{title}</h2>
              {subtitle && (
                <p className="text-[13px] leading-[1.5] text-text3">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="grid h-7 w-7 flex-none place-items-center rounded-[6px] text-[15px] text-text3 hover:bg-panel2 hover:text-text"
            >
              {GLYPH.close}
            </button>
          </div>

          <div className="p-[18px]">{children}</div>

          <div className="flex flex-wrap items-center gap-[10px] rounded-b-[12px] border-t border-line bg-panel2 px-[18px] py-[14px]">
            {destructive && (
              <button
                type="button"
                onClick={destructive.onClick}
                className="rounded-[6px] border border-line px-[9px] py-[5px] font-mono text-[11px] text-err transition hover:border-err"
              >
                {destructive.label}
              </button>
            )}
            <span className="min-w-0 flex-1 text-[12.5px] text-text3">{note}</span>
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || submitDisabled}>
              {submitting ? "Guardando…" : submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
