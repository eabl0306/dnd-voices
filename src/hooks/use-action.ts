"use client";

import { useCallback, useState } from "react";
import { messageOf } from "@/lib/http";

export type ActionState = {
  /** Nombre de la acción en curso, o "" si no hay ninguna. */
  pending: string;
  error: string;
  setError: (message: string) => void;
  run: (name: string, action: () => Promise<unknown>) => Promise<void>;
};

/**
 * Ejecuta una mutación llevando la cuenta de cuál está en curso, para poder
 * deshabilitar sólo el botón que se pulsó y no toda la pantalla.
 */
export function useAction(): ActionState {
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");

  const run = useCallback(async (name: string, action: () => Promise<unknown>) => {
    setPending(name);
    setError("");
    try {
      await action();
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setPending("");
    }
  }, []);

  return { pending, error, setError, run };
}
