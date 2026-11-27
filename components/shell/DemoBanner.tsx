"use client";
import { Notice } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";

/**
 * Faixa global do modo demonstração (auditoria "Informação e guia da interface"): em toda rota com status `demo` no registro
 * (lib/pages/status.ts), explica em texto — não só num `title` de selo — que os dados são de exemplo e que o que a pessoa criar fica
 * só nesta aba e some ao recarregar.
 */
export function DemoBanner() {
  const { t } = useI18n();
  return (
    <Notice tone="warning" label={t("guide.demo.label")} data-testid="demo-banner" className="mb-[var(--ws-space-4)]">
      {t("guide.demo.text")}
    </Notice>
  );
}
