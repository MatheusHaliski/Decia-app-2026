"use client";
import { Button, EmptyState } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";

/** Rota inexistente → estado do design system (WS Moji "vazio"), com volta ao Mural. */
export default function NotFound() {
  const { t } = useI18n();
  return (
    <main id="conteudo" className="mx-auto flex min-h-dvh max-w-lg items-center p-[var(--ws-space-5)]">
      <EmptyState
        moji="vazio"
        title={t("notFound.title")}
        description={t("notFound.description")}
        action={<Button variant="primary" href="/mural">{t("notFound.back")}</Button>}
        className="w-full"
      />
    </main>
  );
}
