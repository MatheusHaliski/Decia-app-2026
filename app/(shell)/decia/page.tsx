"use client";
// /decia (docs/decia/05_WORKSPACE_E_NAVEGACAO.md §2, RF29): Precisa de atenção (padrão) · Decisões · Sessões · Revisões.
// Com sessão: API real de decisões (lib/decia/http.ts, fase 7); no laboratório sem sessão: DEMO em memória (lib/decia/repository.ts).
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AttentionInbox, DecisionsBoard, NewDecisionDialog, ReviewsView, useMounted, useNow, workspaceHref } from "@/components/decia";
import { SessionList } from "@/components/decia/session";
import { RfPage } from "@/components/shell/RfPage";
import { Badge, Button, ErrorState, LoadingState, Tabs } from "@/components/ui";
import { describeError } from "@/lib/api/client";
import type { HttpDecisionRepository } from "@/lib/decia/http";
import { useDecisions } from "@/lib/decia/repository";
import { useDecisionSource } from "@/lib/decia/useDecisionRepository";
import { useI18n } from "@/lib/i18n/useI18n";
import { DECIA_SESSION_TABS, visibleTabs } from "@/lib/nav/matrix";
import { pageByRoute } from "@/lib/pages/registry";
import { useViewer } from "@/lib/viewer/ViewerProvider";

const PAGE = pageByRoute("/decia")!;

function SessionsTab() {
  const { t } = useI18n();
  const { profile } = useViewer();
  const mounted = useMounted();
  const tabs = visibleTabs(DECIA_SESSION_TABS, profile).map((tb) => ({ slug: tb.slug, label: t(tb.labelKey) }));
  return (
    <div className="grid gap-3">
      <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("rf.sessionCardsNote")}</p>
      <Tabs tabs={tabs} label={t("tabs.decia.sessoes")} param="sessoes" look="pills">
        {(active) => (mounted ? <SessionList filter={active} /> : <LoadingState />)}
      </Tabs>
    </div>
  );
}

function DeciaHome() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const mounted = useMounted();
  const now = useNow(60_000);
  const { repo, currentUserId, people } = useDecisionSource();
  const decisions = useDecisions(repo);
  const http = repo.source === "API" ? (repo as HttpDecisionRepository) : null;
  const apiError = http?.lastError() ?? null;
  const [creating, setCreating] = useState(false);
  const { profile } = useViewer();
  const canCreate = PAGE.access[profile] === "E";

  useEffect(() => {
    if (search.get("acao") === "nova") setCreating(true);
  }, [search]);

  const closeCreate = (open: boolean) => {
    setCreating(open);
    if (!open && search.get("acao")) {
      const next = new URLSearchParams(search.toString());
      next.delete("acao");
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    }
  };
  const view = { decisions, now, people, currentUserId };
  const loading = <LoadingState />;

  return (
    <>
      <RfPage
        page={PAGE}
        actions={
          <>
            {repo.source === "DEMO" ? <Badge tone="neutral">{t("decia.demo")}</Badge> : null}
            <Button variant="primary" size="sm" onClick={() => setCreating(true)} data-testid="new-decision">+ {t("decia.newDecision")}</Button>
          </>
        }
        renderTab={(slug) => {
          if (slug === "sessoes") return <SessionsTab />;
          if (!mounted) return loading;
          if (http && http.status() === "error" && !decisions.length) return <ErrorState title={t("deciaapi.loadError")} description={describeError(apiError)} action={<Button size="sm" onClick={() => void http.refresh()}>{t("deciaapi.retry")}</Button>} />;
          if (http && http.status() !== "ready" && !decisions.length) return loading;
          if (slug === "decisoes") return <DecisionsBoard {...view} />;
          if (slug === "revisoes") return <ReviewsView {...view} />;
          return <AttentionInbox {...view} onNew={() => setCreating(true)} />;
        }}
      />
      <NewDecisionDialog open={creating && canCreate} onOpenChange={closeCreate} repository={repo} currentUserId={currentUserId} onCreated={(id) => { setCreating(false); router.push(workspaceHref(id)); }} />
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <DeciaHome />
    </Suspense>
  );
}
