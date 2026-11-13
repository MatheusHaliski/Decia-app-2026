"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo } from "react";
import { useMounted } from "@/components/decia";
import { SimulatorView } from "@/components/projects/simulate/SimulatorView";
import { RfPage } from "@/components/shell/RfPage";
import { Badge, Button, EmptyState, LoadingState } from "@/components/ui";
import { DEMO_CURRENT_USER_ID, DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { demoRepository } from "@/lib/decia/repository";
import { useI18n } from "@/lib/i18n/useI18n";
import { pageByRoute } from "@/lib/pages/registry";
import type { ProjectCommand } from "@/lib/projects/commands";
import { useCompliance } from "@/lib/projects/compliance/store";
import { openChangeDecision } from "@/lib/projects/decia";
import { DEMO_PROJECT_ID } from "@/lib/projects/fixtures";
import { demoProjectRepository, useProject } from "@/lib/projects/repository";
import { compareParam, parseCompare } from "@/lib/projects/simulation/store";
import type { ChangeRequest, ProjectModel } from "@/lib/projects/types";
import { useViewer } from "@/lib/viewer/ViewerProvider";

const PAGE = pageByRoute("/projects/[id]/simulate")!;
const decisionHref = (id: string) => `/decia/decisoes/${id}`;

function Inner({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const { profile } = useViewer();
  const search = useSearchParams();
  const pathname = usePathname();
  const mounted = useMounted();
  const repo = demoProjectRepository();
  const model = useProject(projectId, repo);
  const { ctx, department } = useCompliance(projectId);
  const actorId = DEMO_CURRENT_USER_ID;
  const access = PAGE.access[profile];

  const dispatch = useCallback((cmd: ProjectCommand) => repo.dispatch(projectId, cmd, { actorId, now: new Date() }), [repo, projectId, actorId]);
  const openChange = useCallback((m: ProjectModel, c: ChangeRequest) => openChangeDecision(demoRepository(), m, c, actorId), [actorId]);
  const compare = useMemo(() => parseCompare(search.get("compare")), [search]);
  // a URL guarda os cenários salvos em comparação (?compare=a,b,c), sem recarregar a página
  const onCompareChange = useCallback((ids: string[]) => {
    const next = new URLSearchParams(window.location.search);
    if (ids.length) next.set("compare", compareParam(ids));
    else next.delete("compare");
    const q = next.toString();
    window.history.replaceState(window.history.state, "", q ? `${pathname}?${q}` : pathname);
  }, [pathname]);

  if (!mounted) return <LoadingState />;
  return (
    <RfPage page={PAGE} subtitle={model?.title ?? projectId} noEmpty actions={<Badge tone="warning" title={t("pm.ws.demoHint")}>DEMO</Badge>}>
      {model ? (
        <SimulatorView
          model={model}
          dispatch={dispatch}
          people={DEMO_PEOPLE}
          actorId={actorId}
          readOnly={access !== "E" || model.closure.archived}
          compliance={ctx}
          department={department}
          initialCompare={compare.ids}
          ignoredCompare={compare.ignored}
          onCompareChange={onCompareChange}
          openChange={openChange}
          decisionHref={decisionHref}
          source={repo.source}
        />
      ) : (
        <EmptyState
          title={t("pm.ws.notFound")}
          description={t("pm.ws.notFoundDesc")}
          action={<Button variant="primary" href={`/projects/${DEMO_PROJECT_ID}/simulate`}>{t("pm.ws.openDemo")}</Button>}
        />
      )}
    </RfPage>
  );
}

export function SimulateClient({ projectId }: { projectId: string }) {
  return (
    <Suspense fallback={<LoadingState />}>
      <Inner projectId={projectId} />
    </Suspense>
  );
}
