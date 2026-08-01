import type { ComponentProps, ReactNode } from "react";
import { TONE_TEXT, type Tone } from "@/lib/tone";

export function Panel({
  children,
  className = "",
  dashed = false,
}: {
  children: ReactNode;
  className?: string;
  dashed?: boolean;
}) {
  const border = dashed ? "border border-dashed border-line2" : "border border-line";
  const bg = dashed ? "bg-transparent" : "bg-panel";
  return <div className={`${bg} ${border} rounded-[9px] ${className}`}>{children}</div>;
}

/** Rótulo mono en mayúsculas: encabeza secciones y columnas. */
export function MonoLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`font-mono text-[10.5px] font-semibold tracking-[0.1em] uppercase text-text3 ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Glifo dentro de una caja de 1 px, en el color del estado.
 *
 * Va siempre acompañado de la palabra: es la mitad de la redundancia que
 * permite leer un estado sin depender del color.
 */
export function GlyphBox({
  glyph,
  size = 13,
  className = "",
}: {
  glyph: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`grid flex-none place-items-center rounded-[3px] border border-current font-mono font-semibold ${className}`}
      style={{ width: size, height: size, fontSize: size <= 13 ? 9 : 10 }}
    >
      {glyph}
    </span>
  );
}

/** Estado con glifo + palabra, en el color del tono. */
export function StateLabel({
  glyph,
  tone,
  children,
  className = "",
}: {
  glyph: string;
  tone: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`flex items-center gap-[7px] font-mono text-[11px] tracking-[0.07em] uppercase ${TONE_TEXT[tone]} ${className}`}
    >
      <GlyphBox glyph={glyph} />
      <span>{children}</span>
    </span>
  );
}

/** Píldora con borde. Sin glifo cuando sólo aporta contexto, no estado. */
export function Chip({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-[6px] rounded-[20px] border border-line px-[9px] py-[3px] font-mono text-[10.5px] tracking-[0.06em] ${TONE_TEXT[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export type ButtonVariant = "primary" | "secondary" | "quiet";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-fg hover:brightness-110",
  secondary: "border border-line2 text-text2 hover:text-text hover:bg-panel2",
  quiet: "border border-line text-text2 hover:border-line2 hover:text-text",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-[6px] px-[14px] py-[8px] text-[13.5px] font-medium transition disabled:opacity-45 ${VARIANTS[variant]} ${className}`}
    />
  );
}

/** Botón pequeño en mono, para acciones de fila y de tarjeta. */
export function MonoButton({
  className = "",
  tone = "neutral",
  ...props
}: ComponentProps<"button"> & { tone?: Tone }) {
  return (
    <button
      type="button"
      {...props}
      className={`flex-none rounded-[6px] border border-line px-[9px] py-[5px] font-mono text-[11px] transition hover:border-line2 disabled:opacity-45 ${
        tone === "neutral" ? "text-text2 hover:text-text" : TONE_TEXT[tone]
      } ${className}`}
    />
  );
}

export function ProgressBar({
  value,
  label,
  height = 6,
}: {
  value: number;
  label?: string;
  height?: number;
}) {
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progreso"}
      className="overflow-hidden rounded-[3px] bg-panel3"
      style={{ height }}
    >
      <div
        className="h-full bg-accent transition-[width] duration-500 ease-linear"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function ErrorNote({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-[7px] border border-line bg-err-soft px-[11px] py-[9px] text-[13px] text-err"
    >
      {children}
    </p>
  );
}

/** Panel discontinuo con título, texto y llamada a la acción. */
export function EmptyState({
  title,
  children,
  action,
  className = "",
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Panel dashed className={`max-w-[560px] p-[26px] ${className}`}>
      <h2 className="mb-2 text-[17px] font-semibold">{title}</h2>
      <div className="mb-4 text-[14px] leading-[1.6] text-text2 text-pretty">{children}</div>
      {action}
    </Panel>
  );
}
