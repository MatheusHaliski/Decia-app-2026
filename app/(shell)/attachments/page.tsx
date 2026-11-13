"use client";
// /attachments — Anexos & Evidências (RF41.CA06): os anexos e evidências das minhas tarefas (API real `GET /api/attachments`), com o link
// para cada tarefa. Enviar, marcar evidência e remover ficam no detalhe da tarefa (/tasks/[id]).
import { MyAttachments } from "@/components/tasks/Attachments";
import { RfPage } from "@/components/shell/RfPage";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/attachments")!;

export default function Page() {
  return (
    <RfPage page={PAGE} noEmpty>
      <MyAttachments />
    </RfPage>
  );
}
