import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import { DEFAULT_THEME, THEME_BOOTSTRAP } from "@/lib/theme";
import "./globals.css";

const sans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Solo para el texto de narración dentro del guion.
const serif = IBM_Plex_Serif({
  variable: "--font-plex-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
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
