"use client";
// /tasks/extrair — extração de dados de um desenho CAD/BIM avulso (RF34 + RF70): .dxf, .ifc e .glb lidos neste navegador viram
// quantitativos, planilha orçamentária e cronograma de exemplo; .dwg só é identificado. "Criar tarefa com isto" abre o criador.
import { ExtractWorkbench } from "@/components/cad/ExtractWorkbench";
import { RfPage } from "@/components/shell/RfPage";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/tasks/extrair")!;

export default function Page() {
  return (
    <RfPage page={PAGE} noEmpty>
      <ExtractWorkbench />
    </RfPage>
  );
}
