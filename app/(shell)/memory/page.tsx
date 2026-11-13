"use client";
// /memory (RF33): Memória Institucional — busca com citação de trechos exatos, resposta da IA só com as fontes, explorador por
// unidade/tipo/exercício, leitor e ingestão local. Índice DEMO da aba (lib/memory), sem serviço externo.
import { Suspense } from "react";
import { MemoryWorkspace } from "@/components/memory/MemoryWorkspace";
import { RfPage } from "@/components/shell/RfPage";
import { Badge, LoadingState } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/memory")!;

export default function Page() {
  const { t } = useI18n();
  return (
    <RfPage page={PAGE} noEmpty actions={<Badge tone="neutral" title={t("memory.demoHint")}>{t("decia.demo")}</Badge>}>
      <Suspense fallback={<LoadingState />}>
        <MemoryWorkspace />
      </Suspense>
    </RfPage>
  );
}
