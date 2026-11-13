"use client";
import { useCallback } from "react";
import { useMounted } from "@/components/decia";
import { MirrorView } from "@/components/projects/mirror/MirrorView";
import { RfPage } from "@/components/shell/RfPage";
import { Badge, Button, EmptyState, LoadingState } from "@/components/ui";
import { DEMO_CURRENT_USER_ID, DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { useI18n } from "@/lib/i18n/useI18n";
import { pageByRoute } from "@/lib/pages/registry";
import type { ProjectCommand } from "@/lib/projects/commands";
import { DEMO_PROJECT_ID } from "@/lib/projects/fixtures";
import { demoProjectRepository, useProject } from "@/lib/projects/repository";
import { useViewer } from "@/lib/viewer/ViewerProvider";

const PAGE = pageByRoute("/projects/[id]/mirror")!;

export function MirrorClient({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const { profile } = useViewer();
  const mounted = useMounted();
  const repo = demoProjectRepository();
  const model = useProject(projectId, repo);
  const actorId = DEMO_CURRENT_USER_ID;
  const access = PAGE.access[profile];
  const dispatch = useCallback((cmd: ProjectCommand) => repo.dispatch(projectId, cmd, { actorId, now: new Date() }), [repo, projectId, actorId]);

  if (!mounted) return <LoadingState />;
  // o chefe abre o Espelho como revisor: lê, mantém o checklist do departamento e justifica a liberação (RF32.CA04, CA06)
  const chief = profile === "CHEFE";
  return (
    <RfPage page={PAGE} subtitle={model?.title ?? projectId} noEmpty actions={<Badge tone="warning" title={t("pm.ws.demoHint")}>DEMO</Badge>}>
      {model ? (
        <MirrorView
          model={model}
          dispatch={dispatch}
          people={DEMO_PEOPLE}
          actorId={chief ? "u-chefe" : actorId}
          canEditProject={access === "E" && !chief && !model.closure.archived}
          canEditChecklist={chief || profile === "EMPRESA"}
          canOverride={chief}
        />
      ) : (
        <EmptyState
          title={t("pm.ws.notFound")}
          description={t("pm.ws.notFoundDesc")}
          action={<Button variant="primary" href={`/projects/${DEMO_PROJECT_ID}/mirror`}>{t("pm.ws.openDemo")}</Button>}
        />
      )}
    </RfPage>
  );
}
