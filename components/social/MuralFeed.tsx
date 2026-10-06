"use client";
/**
 * Mural (RF27.CA01/CA02/CA06): feed cronológico de `MuralEntry` com o ator, o verbo ("compartilhou", "publicou o
 * projeto") e o card do alvo com a barra social inline. Só entra o que o viewer pode ver (outra empresa só PUBLICA).
 */
import { EmptyState, LoadingState } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { itemOf, muralFeed, type MuralTab } from "@/lib/social/rules";
import type { TargetRef } from "@/lib/social/types";
import { personRef, toProjectCardViewModel, toTaskCardViewModel } from "@/lib/social/view-model";
import { useMounted, useSocial } from "./context";
import { relativeTime } from "./meta";
import { PersonLink } from "./Primitives";
import { ProjectCard } from "./ProjectCard";
import { TaskSchemeCard } from "./TaskSchemeCard";

export function MuralFeed({ tab }: { tab: MuralTab }) {
  const { t, intl } = useI18n();
  const { state, viewerId, now } = useSocial();
  const mounted = useMounted();
  if (!mounted) return <LoadingState />;
  const entries = muralFeed(state, viewerId, tab);
  if (!entries.length) {
    return <EmptyState moji="vazio" title={t(`social.mural.empty.${tab}`)} description={t(tab === "seguindo" && !viewerId ? "social.mural.emptyAnon" : "social.mural.emptyHint")} />;
  }
  return (
    <ol className="grid gap-[var(--ws-space-4)]" aria-label={t(`tabs.mural.${tab}`)} data-testid="mural-feed">
      {entries.map((e) => {
        const item = e.targetType && e.targetId ? itemOf(state, { type: e.targetType as TargetRef["type"], id: e.targetId }) : undefined;
        return (
          <li key={e.id} className="grid gap-2" data-testid="mural-entry" data-kind={e.kind}>
            <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[length:var(--ws-text-body-sm)]">
              <PersonLink person={personRef(state, e.actorId)} size={24} className="font-semibold" />
              <span className="text-ws-text-muted">{t(`social.mural.kind.${e.kind}`)}</span>
              <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">· {relativeTime(e.at, now, intl)}</span>
            </p>
            {item?.kind === "TASK" ? <TaskSchemeCard vm={toTaskCardViewModel(state, viewerId, item.task, now)} layout="list" /> : null}
            {item?.kind === "PROJECT" ? <ProjectCard vm={toProjectCardViewModel(state, viewerId, item.project)} layout="mural" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
