import type { Metadata } from "next";
import Link from "next/link";
import Analytics from "@/components/Analytics";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://conteojp.netlify.app"),
  title: "Conteo Ciudadano 2026 — Sube tu acta",
  description:
    "Verificación ciudadana de actas de la Segunda Elección Presidencial 2026 (Perú). Sube la foto, la IA la lee y el conteo se actualiza en vivo.",
  openGraph: {
    title: "Conteo Ciudadano 2026",
    description: "Sube la foto de tu acta · la IA la lee · verifica los resultados en vivo.",
    type: "website",
    locale: "es_PE",
    url: "https://conteojp.netlify.app",
    siteName: "Conteo Ciudadano 2026",
  },
  twitter: {
    card: "summary_large_image",
    title: "Conteo Ciudadano 2026",
    description: "Sube la foto de tu acta · la IA la lee · verifica los resultados en vivo.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Analytics />
        <header className="border-b border-white/10 bg-black/20 backdrop-blur sticky top-0 z-10">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-bold">
              <span className="text-xl">🗳️</span>
              <span>Actas Abiertas <span className="text-sky-400">2026</span></span>
            </Link>
            <div className="flex gap-1 text-sm">
              <Link href="/subir" className="rounded-lg px-3 py-1.5 hover:bg-white/10">Subir</Link>
              <Link href="/lote" className="rounded-lg px-3 py-1.5 hover:bg-white/10">Subir varias</Link>
              <Link href="/dashboard" className="rounded-lg px-3 py-1.5 hover:bg-white/10">Dashboard</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-white/40">
          Transparencia ciudadana · no es conteo oficial · datos auditables
        </footer>
      </body>
    </html>
  );
}
