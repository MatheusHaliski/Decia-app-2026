"use client";
import { useEffect, useLayoutEffect } from "react";
import { ErrorState } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { boundaryReference } from "@/lib/errors/boundary";
import { applyHtmlAttributes } from "@/lib/preferences/PreferencesProvider";
import { localAdapter } from "@/lib/preferences/storage";
import "./globals.css";

/**
 * Último recurso (convenção `global-error.tsx`): substitui o layout raiz quando ele mesmo falha, então traz o próprio <html>/<body>
 * e o CSS global, sem os provedores do app. O texto sai no idioma corrente (useI18n sem PreferencesProvider lê o estado do
 * i18n, cujo catálogo já estava carregado) e o tema salvo é reaplicado no <html> — o script do <head> não roda aqui.
 * Next 16: `error: unknown` e `retry()` (busca e renderiza de novo).
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const { t, locale } = useI18n();
  const reference = boundaryReference(error);
  useEffect(() => {
    console.error(error);
  }, [error]);
  useLayoutEffect(() => {
    void localAdapter.load().then((prefs) => {
      if (prefs) applyHtmlAttributes(document.documentElement, prefs);
    });
  }, []);
  return (
    <html lang={locale === "qps-ploc" ? "pt-BR" : locale} suppressHydrationWarning>
      <body className="bg-ws-surface-0 text-ws-text">
        <title>{t("boundary.global.title")}</title>
        <main className="mx-auto grid min-h-dvh max-w-xl content-center p-[var(--ws-space-6)]" data-testid="global-error">
          <ErrorState
            title={t("boundary.global.title")}
            description={reference ? `${t("boundary.global.description")} ${t("boundary.support")}` : t("boundary.global.description")}
            correlationId={reference}
            onRetry={retry}
          />
        </main>
      </body>
    </html>
  );
}
