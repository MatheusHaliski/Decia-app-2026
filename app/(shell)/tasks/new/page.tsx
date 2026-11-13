"use client";
// /tasks/new — criador de tarefa (RF4, RF81): campos comuns, briefing e extensões por área, com o assistente da área (campo de
// estudo, modelos iniciais e feedback de qualidade); `?modelo=<id>` já abre com um modelo. Grava pela API real e abre o detalhe.
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { TaskForm } from "@/components/tasks/TaskForm";
import { RfPage } from "@/components/shell/RfPage";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/tasks/new")!;

function NewTask() {
  const router = useRouter();
  const search = useSearchParams();
  return <TaskForm mode="create" templateId={search.get("modelo")} onSaved={(t) => router.push(`/tasks/${t.id}`)} />;
}

export default function Page() {
  return (
    <RfPage page={PAGE} noEmpty>
      <Suspense fallback={null}>
        <NewTask />
      </Suspense>
    </RfPage>
  );
}
