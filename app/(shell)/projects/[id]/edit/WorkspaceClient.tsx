"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo } from "react";
import { useMounted } from "@/components/decia";
import { ProjectWorkspace, isPaneView, isWorkspaceTab, type PaneView } from "@/components/projects/ProjectWorkspace";
import type { DeciaActions } from "@/components/projects/shared";
import { PageHeader } from "@/components/shell/PageHeader";
import { ViewerProfileSelect } from "@/components/shell/UserPanel";
import { Button, EmptyState, ErrorState, LoadingState, useToast } from "@/components/ui";
import { DEMO_CURRENT_USER_ID, DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { demoRepository, useDecisions } from "@/lib/decia/repository";
import { useI18n } from "@/lib/i18n/useI18n";
import { pageByRoute } from "@/lib/pages/registry";
import type { ProjectCommand } from "@/lib/projects/commands";
import { openChangeDecision, openGateDecision, openSelectionDecision, syncFromDecia } from "@/lib/projects/decia";
import { DEMO_PROJECT_ID } from "@/lib/projects/fixtures";
import type { WorkspaceTab } from "@/lib/projects/metrics";
import { demoProjectRepository, useProject } from "@/lib/projects/repository";
import { useViewer } from "@/lib/viewer/ViewerProvider";

const PAGE = pageByRoute("/projects/[id]/edit")!;
const decisionHref = (id: string) => `/decia/decisoes/${id}`;

function Inner({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const { profile } = useViewer();
  const { toast } = useToast();
  const router = useRouter();
  const search = useSearchParams();
  const mounted = useMounted();
  const repo = demoProjectRepository();
  const model = useProject(projectId, repo);
  const deciaRepo = demoRepository();
  const decisions = useDecisions(deciaRepo);
  const access = PAGE.access[profile];
  const actorId = DEMO_CURRENT_USER_ID;

  const dispatch = useCallback((cmd: ProjectCommand) => repo.dispatch(projectId, cmd, { actorId, now: new Date() }), [repo, projectId, actorId]);

  // decisões tomadas no DECIA (portões, mudanças) voltam para a Mesa
  useEffect(() => {
    if (!model) return;
    for (const cmd of syncFromDecia(model, decisions)) dispatch(cmd);
  }, [model, decisions, dispatch]);

  const decia = useMemo<DeciaActions | undefined>(() => {
    if (!model) return undefined;
    const open = (r: { decisionId: string; commands: ProjectCommand[] }, title: string) => {
      r.commands.forEach(dispatch);
      toast({ title, description: t("pm.ws.openedInDecia"), tone: "sucesso" });
      router.push(decisionHref(r.decisionId));
    };
    return {
      openGate: (phase) => open(openGateDecision(deciaRepo, model, phase, t(`pm.phase.${phase}`), actorId), t("pm.ws.gateOpened", { phase: t(`pm.phase.${phase}`) })),
      openChange: (changeId) => {
        const change = model.changes.find((c) => c.id === changeId);
        if (change) open(openChangeDecision(deciaRepo, model, change, actorId), t("pm.ws.changeOpened", { code: change.code }));
      },
      openSelection: () => open(openSelectionDecision(deciaRepo, model, actorId), t("pm.ws.selectionOpened")),
      decisionHref,
      decisionStatus: (id) => decisions.find((d) => d.decision.id === id)?.decision.status,
    };
  }, [model, decisions, deciaRepo, dispatch, router, toast, t, actorId]);

  if (access === "O") {
    return (
      <div className="grid gap-[var(--ws-space-4)]">
        <PageHeader title={t(PAGE.titleKey)} glyph={PAGE.glyph} rfs={PAGE.rfs} />
        <ErrorState
          title={t("forbidden.title")}
          description={t("forbidden.description", { profile: t(`profile.${profile}`) })}
          code="403 ACESSO_NEGADO"
          action={<div className="flex items-center gap-2 text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("viewer.switchHint")} <ViewerProfileSelect /></div>}
        />
      </div>
    );
  }
  if (!mounted) return <LoadingState />;
  if (!model) {
    return (
      <div className="grid gap-[var(--ws-space-4)]">
        <PageHeader title={t(PAGE.titleKey)} glyph={PAGE.glyph} rfs={PAGE.rfs} />
        <EmptyState title={t("pm.ws.notFound")} description={t("pm.ws.notFoundDesc")} action={<Button variant="primary" href={`/projects/${DEMO_PROJECT_ID}/edit`}>{t("pm.ws.openDemo")}</Button>} />
      </div>
    );
  }

  const tabParam = search.get("aba");
  const paneParam = search.get("painel");
  const initialTab: WorkspaceTab = isWorkspaceTab(tabParam) ? tabParam : "quadro";
  const initialPane: PaneView | null = paneParam === "nenhum" ? null : isPaneView(paneParam) && paneParam !== initialTab ? paneParam : "feedback";
  const onViewChange = (tab: WorkspaceTab, pane: PaneView | null) => {
    const next = new URLSearchParams(window.location.search);
    if (tab === "quadro") next.delete("aba"); else next.set("aba", tab);
    if (pane === "feedback") next.delete("painel"); else next.set("painel", pane ?? "nenhum");
    const q = next.toString();
    window.history.replaceState(window.history.state, "", q ? `${window.location.pathname}?${q}` : window.location.pathname);
  };

  return (
    <ProjectWorkspace
      model={model}
      dispatch={dispatch}
      people={DEMO_PEOPLE}
      readOnly={access !== "E" || model.closure.archived}
      canEdit={access === "E"}
      decia={access === "E" ? decia : decia && { ...decia, openGate: () => {}, openChange: () => {}, openSelection: () => {} }}
      decisions={decisions}
      source={repo.source}
      initialTab={initialTab}
      initialPane={initialPane}
      onViewChange={onViewChange}
      versionSnapshot={(n) => repo.versionSnapshot?.(projectId, n)}
    />
  );
}

export function WorkspaceClient({ projectId }: { projectId: string }) {
  return (
    <Suspense fallback={<LoadingState />}>
      <Inner projectId={projectId} />
    </Suspense>
  );
}
