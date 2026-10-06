// /tasks/[id] — esquema de tarefa no layout ampliado com a barra social e os comentários (RF41.CA03, RF17.CA04, RF19).
// Id fora do formato → 404; ids "t-remix-*" são remixes criados nesta aba (só existem na memória do navegador, DEMO).
import { notFound } from "next/navigation";
import { isKnownTaskId } from "@/lib/social/fixtures";
import { TaskPageClient } from "./TaskPageClient";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isKnownTaskId(id)) notFound();
  return <TaskPageClient taskId={id} />;
}
