"use client";
// /tasks/[id]/edit — edição de tarefa persistida (RF12): carrega a versão atual e salva com controle de concorrência.
// Ids de exemplo (t-*) continuam no esqueleto: são do modelo social DEMO, sem API.
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TaskForm } from "@/components/tasks/TaskForm";
import { RfPage } from "@/components/shell/RfPage";
import { ErrorState, LoadingState } from "@/components/ui";
import { describeError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/useI18n";
import { pageByRoute } from "@/lib/pages/registry";
import { isPersistedTaskId, tasksApi, type TaskView } from "@/lib/tasks/client";

const PAGE = pageByRoute("/tasks/[id]/edit")!;

function Editor({ id }: { id: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [task, setTask] = useState<TaskView | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { tasksApi.get(id).then(setTask).catch((e) => setError(describeError(e))); }, [id]);
  if (error) return <ErrorState title={t("tasks.list.error")} description={error} />;
  if (!task) return <LoadingState />;
  if (!task.editable) return <ErrorState title={t("tasks.detail.readOnly")} description={t("tasks.detail.readOnlyClosed")} />;
  return <TaskForm mode="edit" initial={task} onSaved={(saved) => router.push(`/tasks/${saved.id}`)} />;
}

export default function Page() {
  const params = useParams<{ id: string }>();
  if (!isPersistedTaskId(params.id)) return <RfPage page={PAGE} subtitle={params.id} />;
  return (
    <RfPage page={PAGE} subtitle={params.id} noEmpty>
      <Editor id={params.id} />
    </RfPage>
  );
}
