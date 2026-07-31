import type { ComponentProps, ReactNode } from "react";

const CONTROL =
  "w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:focus:border-white/50";

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
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs opacity-55">{hint}</span>}
    </label>
  );
}

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input {...props} className={`${CONTROL} ${className}`} />;
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea {...props} className={`${CONTROL} font-mono ${className}`} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select {...props} className={`${CONTROL} ${className}`} />;
}

export type ButtonProps = ComponentProps<"button"> & { variant?: "primary" | "ghost" };

export function Button({ className = "", variant = "primary", ...props }: ButtonProps) {
  const styles =
    variant === "primary"
      ? "bg-foreground text-background hover:opacity-85"
      : "border border-black/15 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10";

  return (
    <button
      {...props}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${styles} ${className}`}
    />
  );
}
