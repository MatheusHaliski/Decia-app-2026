// /tasks/[id] — tarefa persistida (UUID, API real) ou esquema de exemplo do modelo social (t-*, DEMO em memória, RF41.CA03, RF17.CA04, RF19).
// Outro formato → 404.
import { notFound } from "next/navigation";
import { isKnownTaskId } from "@/lib/social/fixtures";
import { isPersistedTaskId } from "@/lib/tasks/client";
import { TaskPageClient } from "./TaskPageClient";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isKnownTaskId(id) && !isPersistedTaskId(id)) notFound();
  return <TaskPageClient taskId={id} persisted={isPersistedTaskId(id)} />;
}
