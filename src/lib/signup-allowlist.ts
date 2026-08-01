/**
 * Lista de correos autorizados a darse de alta.
 *
 * La instancia es privada: sin esto, cualquiera que llegue a la URL se crea una
 * cuenta y empieza a gastar créditos de Claude y ElevenLabs de la cuenta del
 * dueño. No afecta al login: quien ya tiene cuenta sigue entrando aunque luego
 * se le quite de la lista.
 */

/**
 * Interpreta el valor de la variable de entorno.
 *
 * Acepta comas, saltos de línea y espacios como separadores para poder pegar
 * una lista tal cual venga. Normaliza a minúsculas: ningún proveedor real
 * distingue mayúsculas en la dirección, y un alta rechazada por escribir la
 * inicial en mayúscula sería incomprensible.
 */
export function parseAllowlist(raw: string | undefined): ReadonlySet<string> {
  return new Set(
    (raw ?? "")
      .split(/[\s,;]+/)
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.includes("@")),
  );
}

/**
 * Si este correo puede registrarse.
 *
 * Una lista vacía deja el alta abierta, que es lo que hace falta en desarrollo
 * y en los e2e —cada test crea su propia cuenta con un correo aleatorio—. La
 * instancia se cierra poniendo correos en la variable, no quitándola.
 */
export function isSignupAllowed(email: string, allowlist: ReadonlySet<string>): boolean {
  if (allowlist.size === 0) return true;
  return allowlist.has(email.trim().toLowerCase());
}
