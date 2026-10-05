import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { Providers } from "@/components/shell/Providers";
import { bootScript } from "@/lib/preferences/storage";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Work Station", template: "%s · Work Station" },
  description: "Work Station / DECIA — SECID-PR",
  robots: { index: false, follow: false },
  icons: { icon: "/brand/work-station-monitor.svg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

/**
 * Layout raiz: aplica as preferências salvas ANTES da primeira pintura com um script inline autorizado pelo nonce da
 * CSP (middleware.ts), para não haver flash de tema/idioma. O PreferencesProvider assume depois (RF3.CA03).
 * `suppressHydrationWarning` no <html>: o script muda data-theme/lang no cliente antes da hidratação.
 */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
