"use client";
// /projects/new — Criar Projeto (RF5/RF20): em branco, a partir de um modelo (o projeto da aula ou um por tipo de demanda, com os
// modelos de área do Acervo) ou pelo Autopiloto (RF30). O projeto nasce no repositório DEMO desta aba e abre na Mesa (RF22).
import { CreateProject } from "@/components/projects/desk/CreateProject";
import { RfPage } from "@/components/shell/RfPage";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/projects/new")!;

export default function Page() {
  return (
    <RfPage page={PAGE} noEmpty>
      <CreateProject />
    </RfPage>
  );
}
