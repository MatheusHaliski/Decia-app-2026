"use client";
import { TaskDetail } from "@/components/social";
import { useMounted, useSocial } from "@/components/social/context";
import { RfPage } from "@/components/shell/RfPage";
import { PersistedTaskDetail } from "@/components/tasks/PersistedTasks";
import { Badge } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { pageByRoute } from "@/lib/pages/registry";
import { canView, taskById } from "@/lib/social/rules";

const PAGE = pageByRoute("/tasks/[id]")!;

/** Título da página: o nome da tarefa (nunca o id técnico "t-…"); invisível ou fora da memória da aba fica só "Tarefa". */
function useDemoTaskTitle(taskId: string): string | undefined {
  const { state, viewerId } = useSocial();
  const mounted = useMounted();
  if (!mounted) return undefined;
  const task = taskById(state, taskId);
  return task && canView(state, viewerId, { kind: "TASK", task }) ? task.title : undefined;
}

export function TaskPageClient({ taskId, persisted = false }: { taskId: string; persisted?: boolean }) {
  if (persisted) {
    return (
      <RfPage page={PAGE} noEmpty>
        <PersistedTaskDetail id={taskId} />
      </RfPage>
    );
  }
  return <DemoTaskPage taskId={taskId} />;
}

function DemoTaskPage({ taskId }: { taskId: string }) {
  const { t } = useI18n();
  const title = useDemoTaskTitle(taskId);
  return (
    <RfPage page={PAGE} subtitle={title} noEmpty actions={<Badge tone="neutral" title={t("social.demoHint")}>{t("decia.demo")}</Badge>}>
      <TaskDetail taskId={taskId} />
    </RfPage>
  );
}
