"use client";
/**
 * Janela "Atividade e histórico": o que aconteceu com o card, do mais recente para o mais antigo, com quem fez.
 *  • Tarefa da API: criação, última alteração (versão), anexos e evidências enviados. O histórico de transições ainda não tem API —
 *    a janela diz isso em vez de inventar passos.
 *  • Tarefa DEMO: criação, delegações (RF18) e comentários.
 *  • Projeto da Mesa: versões (RF22.CA02, quem mudou o quê), pedidos de mudança e portões decididos.
 *  • Projeto do Mural: criação, último evento DECIA e comentários.
 */
import { Tag } from "@/components/ui";
import { versionSummary } from "@/components/projects/common";
import { nameOf } from "@/components/projects/shared";
import { DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { useI18n } from "@/lib/i18n/useI18n";
import { assignmentsOf, personById, threadOf } from "@/lib/social/rules";
import type { SocialState } from "@/lib/social/types";
import { formatDateTime } from "@/lib/tasks/files";
import { useViewerData } from "../context";

interface Event { at: string; key: string; vars?: Record<string, string | number>; who?: string; quote?: string; tag?: { text: string; tone: "neutral" | "success" | "warning" | "danger" | "info" } }

const byDateDesc = (a: Event, b: Event) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0);

function commentsOf(state: SocialState, type: "TASK" | "PROJECT", id: string): Event[] {
  return threadOf(state, { type, id }).flatMap((n) => [n.comment, ...n.replies]).map((c) => ({
    at: c.createdAt, key: "cardviewer.activity.comment", who: personById(state, c.authorId)?.fullName ?? "", quote: c.contentMd,
  }));
}

export function ActivityWindow() {
  const { t, intl } = useI18n();
  const { task, project } = useViewerData();
  const events: Event[] = [];
  let note: string | null = null;

  if (task) {
    const s = task.subject;
    if (s.createdAt) events.push({ at: s.createdAt, key: "cardviewer.activity.created", who: s.ownerName ?? undefined });
    if (task.view) {
      if (s.updatedAt && s.updatedAt !== s.createdAt) events.push({ at: s.updatedAt, key: "cardviewer.activity.updated", vars: { n: s.version ?? 0 }, tag: { text: t(`social.taskState.${s.state}`), tone: "info" } });
      for (const a of task.files.attachments) if (a.createdAt) events.push({ at: a.createdAt, key: "cardviewer.activity.attachment", vars: { name: a.fileName ?? "" } });
      for (const e of task.files.evidences) if (e.createdAt) events.push({ at: e.createdAt, key: "cardviewer.activity.evidence", vars: { caption: e.caption ?? "" } });
      note = t("cardviewer.activity.apiNote");
    }
    if (task.social) {
      const { state } = task.social;
      for (const a of assignmentsOf(state, { type: "TASK", id: s.id })) {
        events.push({
          at: a.createdAt, key: "cardviewer.activity.assignment", vars: { from: personById(state, a.fromUserId)?.fullName ?? "", to: personById(state, a.toUserId)?.fullName ?? "" },
          quote: a.reason ?? undefined, tag: { text: t(`social.assignmentStatus.${a.status}`), tone: a.status === "ACEITA" ? "success" : a.status === "PROPOSTA" ? "warning" : "danger" },
        });
      }
      events.push(...commentsOf(state, "TASK", s.id));
    }
  }

  if (project) {
    const p = project.subject;
    if (p.variant === "MESA") {
      for (const v of p.model.versions) events.push({ at: v.at, key: "cardviewer.activity.version", vars: { n: v.number, what: versionSummary(t, v) }, who: nameOf(DEMO_PEOPLE, v.actorId) });
      for (const c of p.model.changes) {
        events.push({ at: c.createdAt, key: "cardviewer.activity.change", vars: { code: c.code, title: c.title }, who: nameOf(DEMO_PEOPLE, c.requesterId), tag: { text: t(`pm.changeStatus.${c.status}`), tone: c.status === "APROVADA" || c.status === "IMPLEMENTADA" ? "success" : c.status === "REJEITADA" ? "danger" : "warning" } });
      }
      for (const g of p.model.gates) if (g.decidedAt) events.push({ at: g.decidedAt, key: "cardviewer.activity.gate", vars: { phase: t(`pm.phase.${g.phase}`) }, tag: { text: t(`pm.gateOutcome.${g.outcome}`), tone: g.outcome === "APROVADO" ? "success" : "warning" } });
    } else {
      events.push({ at: p.project.createdAt, key: "cardviewer.activity.created", who: personById(p.state, p.project.ownerId)?.fullName });
      events.push(...commentsOf(p.state, "PROJECT", p.project.id));
      if (p.project.lastDeciaEventLabel) note = t("cardviewer.activity.lastDecia", { label: p.project.lastDeciaEventLabel });
    }
  }

  events.sort(byDateDesc);
  return (
    <div className="grid gap-3" data-testid="window-atividade">
      {note ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{note}</p> : null}
      {events.length ? (
        <ol className="grid gap-2" aria-label={t("cardviewer.window.atividade")}>
          {events.map((e, i) => (
            <li key={`${e.at}-${i}`} className="grid gap-0.5 border-l-2 border-ws-border pl-2 text-[length:var(--ws-text-body-sm)]" data-event={e.key.split(".").at(-1)}>
              <p className="flex flex-wrap items-center gap-1.5">
                <time dateTime={e.at} className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{formatDateTime(e.at.length === 10 ? `${e.at}T12:00:00Z` : e.at, intl)}</time>
                {e.tag ? <Tag tone={e.tag.tone}>{e.tag.text}</Tag> : null}
              </p>
              <p className="[overflow-wrap:anywhere]">{t(e.key, e.vars)}{e.who ? <span className="text-ws-text-muted"> · {t("cardviewer.activity.by", { name: e.who })}</span> : null}</p>
              {e.quote ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted [overflow-wrap:anywhere]">“{e.quote}”</p> : null}
            </li>
          ))}
        </ol>
      ) : <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("cardviewer.activity.empty")}</p>}
    </div>
  );
}
