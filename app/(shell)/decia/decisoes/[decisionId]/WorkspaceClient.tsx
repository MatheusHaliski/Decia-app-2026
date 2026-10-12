"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DecisionWorkspace, useMounted, useNow } from "@/components/decia";
import { PageHeader } from "@/components/shell/PageHeader";
import { ViewerProfileSelect } from "@/components/shell/UserPanel";
import { Button, EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { DEMO_CURRENT_USER_ID, DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { demoRepository, useDecision } from "@/lib/decia/repository";
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
  const repo = demoRepository();
  const aggregate = useDecision(decisionId, repo);
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
    <DecisionWorkspace
      aggregate={aggregate}
      now={now}
      currentUserId={DEMO_CURRENT_USER_ID}
      people={DEMO_PEOPLE}
      onSave={(next) => repo.save(next)}
      initialSection={initialSection}
      onSectionChange={onSectionChange}
      backHref="/decia?tab=decisoes"
    />
  );
}

export function WorkspaceClient({ decisionId }: { decisionId: string }) {
  return (
    <Suspense fallback={<LoadingState />}>
      <Inner decisionId={decisionId} />
    </Suspense>
  );
}
