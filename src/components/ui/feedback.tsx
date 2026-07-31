import type { ReactNode } from "react";

const TONES = {
  neutral: "bg-black/8 dark:bg-white/12",
  ok: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  warn: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  bad: "bg-red-500/15 text-red-700 dark:text-red-300",
} as const;

export type Tone = keyof typeof TONES;

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
}

export function ErrorNote({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="my-3 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
    >
      {children}
    </p>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className="mt-3 h-2 w-full overflow-hidden rounded bg-black/10 dark:bg-white/15"
    >
      <div className="h-full bg-foreground transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}
