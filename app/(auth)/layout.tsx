"use client";
import type { ReactNode } from "react";
import { Link } from "@/components/ui";
import { ThemeLanguageMenu } from "@/components/shell/ThemeLanguageMenu";
import { useI18n } from "@/lib/i18n/useI18n";

/** Telas de autenticação (RF1/RF2) fora do shell: marca, tema/idioma e o cartão do formulário centrado. */
export default function AuthLayout({ children }: { children: ReactNode }) {
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
      <main id="conteudo" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-[var(--ws-space-4)] pb-[var(--ws-space-10)]">{children}</main>
    </div>
  );
}
