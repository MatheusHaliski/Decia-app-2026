"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DecisionApiNotice, DecisionWorkspace, useMounted, useNow } from "@/components/decia";
import { PageHeader } from "@/components/shell/PageHeader";
import { ViewerProfileSelect } from "@/components/shell/UserPanel";
import { Button, EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { describeError } from "@/lib/api/client";
import type { HttpDecisionRepository } from "@/lib/decia/http";
import { useDecision } from "@/lib/decia/repository";
import { useDecisionSource } from "@/lib/decia/useDecisionRepository";
import { isWorkspaceSection, type WorkspaceSection } from "@/lib/decia/stages";
import { useI18n } from "@/lib/i18n/useI18n";
import { pageByRoute } from "@/lib/pages/registry";
import { useViewer } from "@/lib/viewer/ViewerProvider";

const PAGE = pageByRoute("/decia/decisoes/[decisionId]")!;

function Inner({ decisionId }: { decisionId: string }) {
  const { t } = useI18n();
  const { profile } = useViewer();
  const search = useSearchParams();
  const mounted = useMounted();
  const now = useNow(5_000);
  const { repo, currentUserId, people } = useDecisionSource();
  const aggregate = useDecision(decisionId, repo);
  const http = repo.source === "API" ? (repo as HttpDecisionRepository) : null;
  const apiError = http?.lastError() ?? null;
  const fromUrl = search.get("secao");
  const initialSection: WorkspaceSection = isWorkspaceSection(fromUrl) ? fromUrl : "visao-geral";

  if (PAGE.access[profile] === "O") {
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
  if (!aggregate && http && ((http.status() !== "ready" && http.status() !== "error") || http.isFetching(decisionId))) return <LoadingState />;
  if (!aggregate && http) {
    // na API, inexistente e sem acesso são o mesmo 404 (BOLA): a tela não distingue
    return <EmptyState title={t("deciaapi.notFound")} description={apiError ? describeError(apiError) : t("deciaapi.notFoundDesc")} action={<Button variant="primary" href="/decia?tab=decisoes">{t("decia.ws.back")}</Button>} />;
  }
  if (!aggregate) {
    return <EmptyState title={t("decia.ws.notInMemory")} description={t("decia.ws.notInMemoryDesc")} action={<Button variant="primary" href="/decia?tab=decisoes">{t("decia.ws.back")}</Button>} />;
  }
  const onSectionChange = (s: WorkspaceSection) => {
    const next = new URLSearchParams(window.location.search);
    if (s === "visao-geral") next.delete("secao"); else next.set("secao", s);
    const q = next.toString();
    window.history.replaceState(window.history.state, "", q ? `${window.location.pathname}?${q}` : window.location.pathname);
  };
  return (
    <>
    {apiError ? <div className="mb-3"><DecisionApiNotice error={apiError} /></div> : null}
    <DecisionWorkspace
      aggregate={aggregate}
      now={now}
      currentUserId={currentUserId}
      people={people}
      onSave={(next) => repo.save(next)}
      initialSection={initialSection}
      onSectionChange={onSectionChange}
      backHref="/decia?tab=decisoes"
      source={repo.source}
    />
    </>
  );
}

export function WorkspaceClient({ decisionId }: { decisionId: string }) {
  return (
    <Suspense fallback={<LoadingState />}>
      <Inner decisionId={decisionId} />
    </Suspense>
  );
}
