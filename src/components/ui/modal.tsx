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

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  const bodyRef = useRef<HTMLDivElement>(null);

  // `onClose` cambia de identidad en cada render de la página que abre el
  // modal. Guardarlo en una ref permite que el efecto de teclado se registre
  // una sola vez, en vez de volver a montarse cada pocos segundos.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      // Sin esto el tabulador se escapa a la página de detrás, que está
      // tapada por el overlay y no debería poder recibir el foco.
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    // Sólo al montar, y sólo sobre el cuerpo: buscando en todo el diálogo, el
    // primer elemento en orden de documento es la ✕ de la cabecera, y con ella
    // enfocada un Intro o un espacio cerraban el modal sin guardar.
    bodyRef.current?.querySelector<HTMLElement>("input, textarea, select")?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-70 flex items-start justify-center overflow-hidden px-4 pt-14 pb-8"
      style={{ background: "var(--overlay)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        // Acotado a la altura de la ventana: sin tope, en un portátil de 768 px
        // el pie con «Guardar» se quedaba fuera de la pantalla.
        className="flex max-h-full w-full flex-col rounded-[12px] border border-line2 bg-panel shadow-[var(--shadow)]"
        style={{ maxWidth: width, animation: "fadeUp .18s ease both" }}
        onClick={(event) => event.stopPropagation()}
      >
        <form
          className="flex min-h-0 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="flex flex-none items-start gap-3 border-b border-line px-[18px] py-4">
            <div className="min-w-0 flex-1">
              <h2 className="mb-1 text-[16px] font-semibold">{title}</h2>
              {subtitle && <p className="text-[13px] leading-[1.5] text-text3">{subtitle}</p>}
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

          {/* Sólo el cuerpo hace scroll: cabecera y pie quedan siempre a la vista. */}
          <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto p-[18px]">
            {children}
          </div>

          <div className="flex flex-none flex-wrap items-center gap-[10px] rounded-b-[12px] border-t border-line bg-panel2 px-[18px] py-[14px]">
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
