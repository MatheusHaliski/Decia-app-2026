"use client";
// /autopilot — Autopiloto de Projetos (RF30, estendido pelo RF43 §7): demanda bruta (texto colado ou .txt/.eml/.md/.pdf lido no
// navegador) → fatos com o trecho de origem → Esquema de Projeto editável com CPM e prazos de trás para frente → Mesa do projeto.
// A "IA" é simulada e determinística (D-12); a proposta fica num rascunho desta aba (24 h) até salvar.
import { AutopilotWizard } from "@/components/projects/autopilot/AutopilotWizard";
import { RfPage } from "@/components/shell/RfPage";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/autopilot")!;

export default function Page() {
  return (
    <RfPage page={PAGE} noEmpty>
      <AutopilotWizard />
    </RfPage>
  );
}
