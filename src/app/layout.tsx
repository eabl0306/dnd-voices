import type { Metadata } from "next";
import localFont from "next/font/local";
import { DEFAULT_THEME, THEME_BOOTSTRAP } from "@/lib/theme";
import "./globals.css";

/**
 * IBM Plex servida desde el repo, no desde `next/font/google`.
 *
 * Con la variante de Google, `next build` descarga el CSS y cada .woff2 en cada
 * compilación, sin timeout ni alternativa: un corte de red tumba el build
 * entero, y ya nos pasó una vez. Aquí sólo van los ficheros del subconjunto
 * latino —396 KB— que es lo único que usa una interfaz en castellano.
 *
 * IBM Plex es OFL 1.1, que permite redistribuirla junto al proyecto.
 */
const sans = localFont({
  variable: "--font-plex-sans",
  display: "swap",
  src: [
    { path: "./fonts/ibm-plex-sans-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-sans-400-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/ibm-plex-sans-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-sans-500-italic.woff2", weight: "500", style: "italic" },
    { path: "./fonts/ibm-plex-sans-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/ibm-plex-sans-600-italic.woff2", weight: "600", style: "italic" },
  ],
});

const mono = localFont({
  variable: "--font-plex-mono",
  display: "swap",
  src: [
    { path: "./fonts/ibm-plex-mono-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-mono-600.woff2", weight: "600", style: "normal" },
  ],
});

// Solo para el texto de narración dentro del guion.
const serif = localFont({
  variable: "--font-plex-serif",
  display: "swap",
  src: [
    { path: "./fonts/ibm-plex-serif-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-serif-400-italic.woff2", weight: "400", style: "italic" },
  ],
});

export const metadata: Metadata = {
  title: "DnD Voices",
  description: "Genera el audio de tus partidas de rol con una voz por personaje.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      data-theme={DEFAULT_THEME}
      className={`${sans.variable} ${mono.variable} ${serif.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Antes de pintar, para que no haya destello del tema equivocado. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="min-h-full font-sans antialiased">{children}</body>
    </html>
  );
}
