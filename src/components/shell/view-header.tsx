import type { ReactNode } from "react";

/**
 * Cabecera de contenido: migaja, título, metadatos y la acción principal de la
 * vista. Va dentro de cada página y no en el layout porque el título y la
 * acción son distintos en cada una.
 */
export function ViewHeader({
  crumb,
  title,
  meta,
  action,
}: {
  crumb: string;
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-[14px] border-b border-line px-6 py-[14px]">
      <div className="min-w-0">
        <div className="mb-1 truncate font-mono text-[10.5px] tracking-[0.1em] uppercase text-text3">
          {crumb}
        </div>
        <h1 className="text-[19px] font-semibold tracking-[-0.01em]">{title}</h1>
      </div>
      <div className="flex-1" />
      {meta && <span className="font-mono text-[11.5px] text-text3">{meta}</span>}
      {action}
    </div>
  );
}

/** Contenedor de la vista, con el padding del sistema. */
export function ViewBody({ children }: { children: ReactNode }) {
  return <section className="flex flex-col gap-[18px] p-6">{children}</section>;
}
