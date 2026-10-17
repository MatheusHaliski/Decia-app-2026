"use client";
import type { ReactNode } from "react";
import { Link } from "@/components/ui";
import { ThemeLanguageMenu } from "@/components/shell/ThemeLanguageMenu";
import { useI18n } from "@/lib/i18n/useI18n";

/** Textos legais públicos (/termos, /privacidade): sem login, fora do shell, coluna de leitura larga. */
export default function LegalLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-[var(--ws-space-4)] py-[var(--ws-space-3)]">
        <Link href="/mural" variant="plain" className="flex items-center gap-2" aria-label={t("brand.home")}>
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático da marca em /public */}
          <img src="/brand/work-station-monitor.svg" alt="" width={36} height={36} className="size-9" />
          <span className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("brand.name")}</span>
        </Link>
        <ThemeLanguageMenu />
      </header>
      <main id="conteudo" className="mx-auto w-full max-w-3xl flex-1 px-[var(--ws-space-4)] pb-[var(--ws-space-10)]">{children}</main>
    </div>
  );
}
