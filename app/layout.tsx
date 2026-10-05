import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Work Station",
  description: "Work Station / DECIA — SECID-PR",
  robots: { index: false, follow: false },
};

/** Shell mínimo do Bloco 1. Tema: data-theme vem das preferências (RF3) na etapa (b); sem ele vale prefers-color-scheme. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
