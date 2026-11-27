"use client";
import { useEffect } from "react";
import { Button, ErrorState } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { boundaryReference } from "@/lib/errors/boundary";

/**
 * Fronteira de erro das abas do shell (convenção `error.tsx` do Next 16: props `error: unknown` e `retry()`, que busca e renderiza
 * o segmento de novo). O AppShell (menu, barra) continua de pé; só o conteúdo vira um ErrorState em linguagem de usuário, com
 * "Tentar de novo", um caminho de volta ao início e o código para o suporte (correlationId da API ou o digest do servidor).
 */
export default function ShellError({ error, retry }: { error: unknown; retry: () => void }) {
  const { t } = useI18n();
  const reference = boundaryReference(error);
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-[var(--ws-space-5)] py-[var(--ws-space-6)]" data-testid="route-error">
      <ErrorState
        title={t("boundary.title")}
        description={reference ? `${t("boundary.description")} ${t("boundary.support")}` : t("boundary.description")}
        correlationId={reference}
        onRetry={retry}
        action={<Button size="sm" href="/today">{t("boundary.home")}</Button>}
      />
    </div>
  );
}
