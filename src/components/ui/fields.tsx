import type { ComponentProps, ReactNode } from "react";

const CONTROL =
  "w-full rounded-[6px] border border-line bg-panel2 px-[11px] py-[9px] text-[14px] outline-none focus:border-line2";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-[6px] block text-[13px] text-text2">
        {label}
        {hint && <span className="text-text3"> — {hint}</span>}
      </span>
      {children}
    </label>
  );
}

/** Etiqueta mono en mayúsculas; se usa en el login, sobre fondo despejado. */
export function MonoField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-[6px] block font-mono text-[11px] tracking-[0.08em] uppercase text-text3">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input {...props} className={`${CONTROL} ${className}`} />;
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={`${CONTROL} resize-y leading-[1.6] ${className}`}
    />
  );
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select {...props} className={`${CONTROL} appearance-none ${className}`} />;
}
