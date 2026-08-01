"use client";

import { useState } from "react";

/**
 * Texto de una intervención, editable in situ.
 *
 * Corregir aquí una errata cuesta un solo clip en el próximo render, mientras
 * que corregirla en el texto crudo obliga a reanalizar la escena entera.
 */
export function LineText({
  value,
  isNarration,
  dubious,
  label,
  onCommit,
}: {
  value: string;
  isNarration: boolean;
  dubious: boolean;
  label: string;
  onCommit: (text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const style = `w-full text-[14.5px] leading-[1.6] text-pretty ${
    isNarration ? "font-serif italic text-text2" : "font-sans text-text"
  }`;

  if (editing) {
    const commit = () => {
      setEditing(false);
      const text = draft.trim();
      if (text && text !== value) onCommit(text);
      else setDraft(value);
    };

    return (
      <textarea
        // biome-ignore lint/a11y/noAutofocus: el foco viene de un clic explícito
        autoFocus
        rows={Math.max(2, Math.ceil(draft.length / 70))}
        value={draft}
        aria-label={label}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          // Enter guarda porque una intervención es un párrafo corto; el salto
          // de línea real sigue disponible con Mayús.
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={`${style} resize-y rounded-[6px] border border-accent bg-panel2 p-2`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      aria-label={label}
      className={`${style} cursor-text rounded-[6px] border border-transparent p-px text-left hover:border-line2 hover:bg-panel2`}
      style={
        dubious
          ? { textDecoration: "underline dashed var(--warn-line)", textUnderlineOffset: 4 }
          : undefined
      }
    >
      {value}
    </button>
  );
}
