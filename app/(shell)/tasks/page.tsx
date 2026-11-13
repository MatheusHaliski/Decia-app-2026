"use client";
// /tasks — Acervo de Tarefas (RF41.CA01/CA04/CA09): tarefas reais da API com sub-filtros (estado, prioridade, prazo, categoria), ordenação
// e página na URL (`?filtro=&categoria=&prioridade=&prazo=&ordem=&page=`, compartilhável) e alertas de prazo legal no topo.
import { Suspense } from "react";
import { TaskAcervo } from "@/components/tasks/Acervo";
import { RfPage } from "@/components/shell/RfPage";
import { LoadingState } from "@/components/ui";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/tasks")!;

export default function Page() {
  return (
    <RfPage page={PAGE} noEmpty>
      <Suspense fallback={<LoadingState />}>
        <TaskAcervo />
      </Suspense>
    </RfPage>
  );
}
