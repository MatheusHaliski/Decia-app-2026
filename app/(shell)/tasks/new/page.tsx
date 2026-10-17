"use client";
// /tasks/new — criador de tarefa (RF4): campos comuns, briefing e extensões por área; grava pela API real e abre o detalhe.
import { useRouter } from "next/navigation";
import { TaskForm } from "@/components/tasks/TaskForm";
import { RfPage } from "@/components/shell/RfPage";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/tasks/new")!;

export default function Page() {
  const router = useRouter();
  return (
    <RfPage page={PAGE} noEmpty>
      <TaskForm mode="create" onSaved={(t) => router.push(`/tasks/${t.id}`)} />
    </RfPage>
  );
}
