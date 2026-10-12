"use client";
import { TaskDetail } from "@/components/social";
import { RfPage } from "@/components/shell/RfPage";
import { Badge } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/tasks/[id]")!;

export function TaskPageClient({ taskId }: { taskId: string }) {
  const { t } = useI18n();
  return (
    <RfPage page={PAGE} subtitle={taskId} noEmpty actions={<Badge tone="neutral" title={t("social.demoHint")}>{t("decia.demo")}</Badge>}>
      <TaskDetail taskId={taskId} />
    </RfPage>
  );
}
