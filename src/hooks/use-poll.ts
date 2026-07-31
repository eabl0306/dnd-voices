"use client";

import { useCallback, useEffect, useState } from "react";
import { messageOf } from "@/lib/http";

export type PollState<T> = {
  data: T | undefined;
  error: string;
  setError: (message: string) => void;
  refresh: () => Promise<void>;
};

/**
 * Carga con `fetcher` y repite cada `intervalMs` mientras `intervalMs > 0`.
 *
 * La primera carga va por `setTimeout` y no en el cuerpo del efecto porque
 * React 19 desaconseja actualizar estado de forma síncrona al montar; desde un
 * callback de temporizador es exactamente el patrón que la regla espera.
 */
export function usePoll<T>(fetcher: () => Promise<T>, intervalMs = 0): PollState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setData(await fetcher());
      setError("");
    } catch (cause) {
      setError(messageOf(cause));
    }
  }, [fetcher]);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const timer = intervalMs > 0 ? setInterval(refresh, intervalMs) : undefined;
    return () => {
      clearTimeout(first);
      if (timer) clearInterval(timer);
    };
  }, [refresh, intervalMs]);

  return { data, error, setError, refresh };
}
