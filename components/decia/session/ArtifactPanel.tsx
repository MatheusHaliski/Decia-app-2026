"use client";
/**
 * Proposta em discussão (RF30.CA06): a proposta do Autopiloto (rascunho) ou o esquema do projeto salvo anexado à sessão — como
 * referência (resumo com os números do motor no momento do anexo, o texto anexado e o link de volta) — e as decisões da minuta que
 * podem voltar: ao rascunho, pelas mesmas edições do passo 3 do Autopiloto; ao projeto salvo, como pedidos de mudança
 * (CHANGE_REQUEST, controle integrado). Só o proprietário da sessão devolve; a base de comparação avança a cada devolução.
 */
import { useMemo, useState } from "react";
import { Badge, Button, Card, Tag } from "@/components/ui";
import { useDescribeChange } from "@/components/projects/autopilot/DiscussInDecia";
import { useI18n } from "@/lib/i18n/useI18n";
import { can } from "@/lib/decia/session/roles";
import type { SessionArtifact } from "@/lib/decia/session/types";
import { applyPlanChanges, diffPlan, planChangeCommands, scheduleImpact } from "@/lib/projects/autopilot/decia";
import { loadProposalDraft, saveProposalDraft } from "@/lib/projects/autopilot/drafts";
import { demoProjectRepository, useProject, type ProjectRepository } from "@/lib/projects/repository";
import { formatDateOnly, formatWhen, personName, useSessionCtx } from "./context";

export function ArtifactPanel({ projects }: { projects?: ProjectRepository }) {
  const { session } = useSessionCtx();
  if (!session.artifact) return null;
  return <Panel artifact={session.artifact} projects={projects ?? demoProjectRepository()} />;
}

function Panel({ artifact: a, projects }: { artifact: SessionArtifact; projects: ProjectRepository }) {
  const { t, intl } = useI18n();
  const { session, repo, me, people } = useSessionCtx();
  const describe = useDescribeChange();
  const [status, setStatus] = useState<string | null>(null);
  const labels = useMemo(() => ({ milestone: t("autopilot.decia.plan.milestone"), unassigned: t("autopilot.decia.plan.unassigned") }), [t]);
  const diff = useMemo(() => diffPlan(a.baseText, session.minuta.text, people, labels), [a.baseText, session.minuta.text, people, labels]);
  const changes = diff.ok ? diff.changes : [];
  // no projeto salvo, as decisões ratificadas em ata também viram pedidos de mudança
  const project = useProject(a.projectId ?? "", projects);
  const registered = new Set(project?.changes.map((c) => c.title) ?? []);
  const ataDecisions = a.kind === "PROJETO"
    ? session.meetings.filter((m) => m.status === "CONFIRMADA").flatMap((m) => m.draft?.decisions ?? []).map((d) => d.text).filter((text) => !registered.has(t("autopilot.decia.change.ATA", { text }).replace(/\s+/g, " ").trim().slice(0, 200)))
    : [];
  const mayApply = can(session, me, "MUDAR_ESTADO");
  const date = (d: string | null) => (d ? formatDateOnly(d, intl) : "—");
  const raisedBy = t("autopilot.decia.artifact.raisedBy", { title: session.title });

  const applyToDraft = () => {
    const draft = loadProposalDraft(a.draftId);
    if (!draft) {
      setStatus(t("autopilot.decia.artifact.draftMissing"));
      return;
    }
    const r = applyPlanChanges(draft.proposal, changes, a.refs);
    // tudo ou nada: com alguma decisão recusada, o rascunho e a base de comparação ficam como estavam, e as decisões seguem
    // pendentes no painel para corrigir na minuta e devolver de novo (avançar a base esconderia a recusada)
    if (r.failed.length) {
      setStatus(t("autopilot.decia.artifact.failed", { n: r.failed.length }));
      return;
    }
    if (r.applied.length) {
      saveProposalDraft({ proposal: r.proposal }, { id: draft.id });
      repo.markArtifactApplied(session.id, me, r.applied.length);
    }
    setStatus(r.applied.length ? t("autopilot.decia.artifact.applied.PROPOSTA_AUTOPILOTO", { n: r.applied.length }) : "");
  };
  const applyToProject = () => {
    const model = project;
    if (!model) {
      setStatus(t("autopilot.decia.artifact.projectMissing"));
      return;
    }
    const items = [
      ...changes.map((c) => ({ title: describe(c, people), scheduleDays: scheduleImpact(c) })),
      ...ataDecisions.map((text) => ({ title: t("autopilot.decia.change.ATA", { text }) })),
    ];
    const cmds = planChangeCommands(model, items, raisedBy);
    let n = 0;
    for (const cmd of cmds) if (projects.dispatch(model.id, cmd, { actorId: me, now: new Date() }).ok) n++;
    // a base só avança quando todos os pedidos entraram; os que falharam continuam pendentes
    if (changes.length && n === cmds.length) repo.markArtifactApplied(session.id, me, changes.length);
    setStatus([
      t("autopilot.decia.artifact.applied.PROJETO", { n }),
      n < cmds.length ? t("autopilot.decia.artifact.failed", { n: cmds.length - n }) : "",
    ].filter(Boolean).join(" "));
  };
  const pending = changes.length + ataDecisions.length;

  return (
    <Card as="section" padding="sm" aria-labelledby="artifact-title" className="grid gap-2 border-ws-ai-spark" data-testid="session-artifact" data-kind={a.kind}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="spark"><span aria-hidden>✦ </span>{t(`autopilot.decia.artifact.kind.${a.kind}`)}</Badge>
        <h2 id="artifact-title" className="min-w-0 flex-1 font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-body)] font-semibold">
          {t("autopilot.decia.artifact.title", { title: a.title })}
        </h2>
        <Button size="sm" href={a.href} icon={a.kind === "PROJETO" ? "mesa" : "criar-projeto"} data-testid="artifact-back">{t(`autopilot.decia.artifact.back.${a.kind}`)}</Button>
      </div>
      <p className="text-[length:var(--ws-text-body-sm)]">
        {t("autopilot.decia.artifact.summary", { phases: a.summary.phases, tasks: a.summary.tasks, deadline: date(a.summary.deadline), finish: date(a.summary.finish) })}
      </p>
      {a.summary.overrunDays > 0 ? (
        <p role="note" className="rounded-[var(--ws-radius-md)] border border-ws-danger bg-ws-danger-soft px-2 py-1 text-[length:var(--ws-text-body-sm)] font-semibold" data-testid="artifact-overrun">
          <span aria-hidden className="text-ws-ai-spark-ink">✦ </span>{t("autopilot.decia.artifact.overrun", { n: a.summary.overrunDays })}
        </p>
      ) : null}
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("autopilot.decia.artifact.attached", { name: personName(people, a.attachedBy), when: formatWhen(a.attachedAt, intl) })}</p>
      <details className="rounded-[var(--ws-radius-md)] border border-ws-border p-2">
        <summary className="cursor-pointer text-[length:var(--ws-text-body-sm)] font-semibold">{t("autopilot.decia.artifact.showText")}</summary>
        <pre className="mt-2 whitespace-pre-wrap text-[length:var(--ws-text-caption)] [overflow-wrap:anywhere]" data-testid="artifact-text">{a.text}</pre>
      </details>

      <section aria-labelledby="artifact-decisions" className="grid gap-1.5">
        <h3 id="artifact-decisions" className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("autopilot.decia.artifact.decisions", { n: pending })}</h3>
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("autopilot.decia.artifact.decisionsHint", { revision: a.baseRevision, current: session.minuta.revision })}</p>
        {!diff.ok ? <p className="text-[length:var(--ws-text-body-sm)]">{t("autopilot.decia.artifact.noBlock")}</p> : null}
        {diff.ok && !pending ? <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("autopilot.decia.artifact.none")}</p> : null}
        {pending ? (
          <ul className="grid gap-1 text-[length:var(--ws-text-body-sm)]" data-testid="artifact-changes">
            {changes.map((c, i) => <li key={i} data-change={c.type}>• {describe(c, people)}</li>)}
            {ataDecisions.map((text, i) => <li key={`ata-${i}`} data-change="ATA">• {t("autopilot.decia.change.ATA", { text })}</li>)}
          </ul>
        ) : null}
        {diff.issues.length ? (
          <div className="grid gap-1 text-[length:var(--ws-text-caption)]" data-testid="artifact-issues">
            <p className="font-semibold text-ws-danger-ink">{t("autopilot.decia.artifact.issues", { n: diff.issues.length })}</p>
            <ul className="grid gap-0.5">{diff.issues.map((x, i) => <li key={i}>{t("autopilot.decia.artifact.issueLine", { line: x.line, reason: t(`autopilot.decia.issue.${x.reason}`) })}</li>)}</ul>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="primary" disabled={!mayApply || !pending} onClick={a.kind === "PROJETO" ? applyToProject : applyToDraft} data-testid="artifact-apply">
            {t(`autopilot.decia.artifact.apply.${a.kind}`)}
          </Button>
          {!mayApply ? <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("autopilot.decia.artifact.ownerOnly")}</span> : null}
          {a.applications.length ? <Tag>{t("autopilot.decia.artifact.applications", { n: a.applications.length })}</Tag> : null}
        </div>
        <p aria-live="polite" className="text-[length:var(--ws-text-body-sm)]" data-testid="artifact-status">{status}</p>
      </section>
    </Card>
  );
}
