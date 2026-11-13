// /tasks/[id]/extrair — extração de dados do desenho de uma tarefa DESENHO_TECNICO/DOCUMENTO (RF34 + RF70): tarefa persistida
// (UUID, API real, anexos legíveis) ou de exemplo (t-*, DEMO em memória). Outro formato de id → 404.
import { notFound } from "next/navigation";
import { TaskExtractPage } from "@/components/cad/TaskExtract";
import { isKnownTaskId } from "@/lib/social/fixtures";
import { isPersistedTaskId } from "@/lib/tasks/client";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isKnownTaskId(id) && !isPersistedTaskId(id)) notFound();
  return <TaskExtractPage taskId={id} persisted={isPersistedTaskId(id)} />;
}
