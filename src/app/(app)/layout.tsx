import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { auth } from "@/lib/auth";

// Todo lo que hay dentro depende de la sesión: nada que prerenderizar.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return <AppShell>{children}</AppShell>;
}
