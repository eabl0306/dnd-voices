/** Cliente HTTP del navegador. La API siempre responde `{ error }` al fallar. */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : `Error ${response.status}`;
    throw new Error(message);
  }

  return body as T;
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Error inesperado";
}
