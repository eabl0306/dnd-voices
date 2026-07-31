import Link from "next/link";
import type { ReactNode } from "react";

export type ShellProps = {
  title: string;
  back?: { href: string; label: string };
  children: ReactNode;
};

export function Shell({ title, back, children }: ShellProps) {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      {back && (
        <Link href={back.href} className="text-sm opacity-60 hover:opacity-100">
          ← {back.label}
        </Link>
      )}
      <h1 className="mt-2 mb-8 text-3xl font-semibold tracking-tight">{title}</h1>
      {children}
    </main>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-black/10 dark:border-white/15 p-4 ${className}`}>
      {children}
    </div>
  );
}

export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">{title}</h2>
        {aside && <span className="text-sm opacity-60">{aside}</span>}
      </div>
      {children}
    </section>
  );
}
