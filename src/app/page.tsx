import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Depende de la cookie de sesión: no tiene versión estática que prerenderizar,
// y sin esto el build intentaría resolver la sesión sin configuración de auth.
export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  redirect(session ? "/campaigns" : "/login");
}
