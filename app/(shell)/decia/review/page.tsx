"use client";
// /decia/review — painel de auditoria das revisões humanas sobre decisões e artefatos da IA (RF29 Rastro de Decisão, RF43, RF51):
// trilha somente-acréscimo, comparação ANTES × DEPOIS por palavra, filtros e exportação. Acesso pela matriz do registro
// (CHEFE edita; EMPRESA e ADMIN veem; demais 403). Dados DEMO (lib/decia/session/repository.ts + decisões de lib/decia).
import { AuditPanel } from "@/components/decia/audit";
import { useMounted } from "@/components/decia/hooks";
import { RfPage } from "@/components/shell/RfPage";
import { LoadingState } from "@/components/ui";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/decia/review")!;

export default function Page() {
  const mounted = useMounted();
  return (
    <RfPage page={PAGE} noEmpty>
      {mounted ? <AuditPanel /> : <LoadingState />}
    </RfPage>
  );
}
