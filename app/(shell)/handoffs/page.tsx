"use client";
// /handoffs — Dossiê de Transição de Gestão (RF36): gerar, conduzir e exportar o dossiê de quem muda de setor, sai ou encerra uma
// gestão. Funcional sobre o repositório DEMO da aba (a API do RF36 ainda não existe); as tarefas da própria pessoa vêm da API real
// quando há sessão. O bloco de CAs do RF continua embaixo, recolhido.
import { Suspense } from "react";
import { HandoffWorkspace } from "@/components/handoff/HandoffWorkspace";
import { RfPage } from "@/components/shell/RfPage";
import { Badge, LoadingState } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/handoffs")!;

export default function Page() {
  const { t } = useI18n();
  return (
    <RfPage page={PAGE} noEmpty actions={<Badge tone="neutral" title={t("handoff.demoHint")}>{t("decia.demo")}</Badge>}>
      <Suspense fallback={<LoadingState />}>
        <HandoffWorkspace />
      </Suspense>
    </RfPage>
  );
}
