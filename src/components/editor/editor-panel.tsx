import type { ReactNode } from "react";

/** Panel numerado del editor: los tres pasos comparten cabecera y borde. */
export function EditorPanel({
  step,
  title,
  hint,
  actions,
  children,
}: {
  step: number;
  title: string;
  hint?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-line bg-panel">
      <div className="flex flex-wrap items-center gap-[10px] border-b border-line px-[15px] py-[11px]">
        <span className="font-mono text-[11px] font-semibold tracking-[0.1em] uppercase text-text2">
          {step} · {title}
        </span>
        {hint}
        {actions && (
          <>
            <div className="flex-1" />
            {actions}
          </>
        )}
      </div>
      {children}
    </div>
  );
}
