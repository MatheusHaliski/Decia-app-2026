"use client";
import { useRef, useState, type ReactNode } from "react";
import { Badge, Button, Card, Link, Tag, cn } from "@/components/ui";
import { currentAgreement, validExecutors } from "@/lib/pacts/access";
import { availability } from "@/lib/pacts/available";
import { mediationHref } from "@/lib/pacts/links";
import { departmentOf, personName, type OrgDirectory } from "@/lib/pacts/org";
import { currentDueDate, isOverdue, waitingDays } from "@/lib/pacts/queue";
import { localDay, type CommandResult, type PactCommand } from "@/lib/pacts/rules";
import type { PactRepository } from "@/lib/pacts/store";
import type { Commitment, CooperationPact, Proposal } from "@/lib/pacts/types";
import { useI18n } from "@/lib/i18n/useI18n";
import { CheckinForm, DeliveryForm, MilestoneForm, ReturnForm, TextForm } from "./forms";
import { STATUS_TONE, deptAcronym, formatDay, formatWhen, partyLabel } from "./labels";
import { ProposalEditor } from "./ProposalEditor";

type Mode =
  | null | "propose" | "renegotiate" | "ask" | `answer:${string}` | "refuse" | "cancel" | "exception" | "deliver" | "return" | "recognize"
  | "checkin" | "milestone" | "escalate" | `resolve:${string}`;

function Section({ title, children, testId }: { title: string; children: ReactNode; testId?: string }) {
  return (
    <section className="grid gap-2" data-testid={testId}>
      <h3 className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-body-lg)] font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function CommitmentList({ items, today }: { items: readonly Commitment[]; today: string }) {
  const { t, intl } = useI18n();
  return (
    <ul className="grid gap-1.5">
      {items.map((c) => {
        const late = c.status === "PENDENTE" && c.kind === "PRAZO" && !!c.dueDate && c.dueDate < today;
        return (
          <li key={c.id} className="flex flex-wrap items-center gap-2 text-[length:var(--ws-text-body-sm)]" data-testid="pact-commitment">
            <Tag tone={c.kind === "PRAZO" ? "info" : c.kind === "SUPORTE" ? "green" : "brown"}>{t(`pacts.commitment.kind.${c.kind}`)}</Tag>
            <span className="text-ws-text-muted">{t(`pacts.side.${c.side}`)}:</span>
            <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{c.description}</span>
            {c.dueDate ? <span className="tabular-nums text-ws-text-muted">{formatDay(c.dueDate, intl)}</span> : null}
            <Badge tone={c.status === "CUMPRIDO" ? "success" : c.status === "DESCUMPRIDO" ? "danger" : late ? "warning" : "neutral"}>
              {late ? t("pacts.commitment.late") : t(`pacts.commitment.status.${c.status}`)}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}

function ProposalCard({ p, org }: { p: Proposal; org: OrgDirectory }) {
  const { t, intl } = useI18n();
  const acc = (k: "SOLICITANTE" | "DESTINATARIO" | "EXECUTOR") => {
    const a = p.acceptances[k];
    return a ? t("pacts.proposal.acceptedBy", { name: personName(org, a.userId), when: formatWhen(a.at, intl) }) : t("pacts.proposal.waiting");
  };
  return (
    <li className={cn("grid gap-2 rounded-[var(--ws-radius-md)] border p-3", p.status === "ABERTA" ? "border-ws-accent bg-ws-surface-1" : "border-ws-border bg-ws-surface-2")} data-testid="pact-proposal" data-status={p.status}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{t("pacts.proposal.round", { n: p.round })}</Badge>
        <span className="font-semibold">{t(`pacts.proposal.kind.${p.kind}`)}</span>
        <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("pacts.proposal.by", { name: personName(org, p.authorId), side: t(`pacts.side.${p.side}`), when: formatWhen(p.at, intl) })}</span>
        <Badge tone={p.status === "ACEITA" ? "success" : p.status === "ABERTA" ? "warning" : "neutral"}>{t(`pacts.proposal.status.${p.status}`)}</Badge>
      </div>
      {p.reason ? <p className="text-[length:var(--ws-text-body-sm)]"><span className="font-semibold">{t("pacts.proposal.reason")}:</span> {p.reason}</p> : null}
      {p.note ? <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{p.note}</p> : null}
      <CommitmentList items={p.commitments} today="0000-00-00" />
      <dl className="grid gap-x-3 gap-y-0.5 text-[length:var(--ws-text-caption)] sm:grid-cols-[auto_1fr]">
        <dt className="font-semibold">{t("pacts.proposal.executor")}</dt>
        <dd>{p.executorId ? personName(org, p.executorId) : t("pacts.proposal.executorLater")}</dd>
        <dt className="font-semibold">{t("pacts.side.SOLICITANTE")}</dt>
        <dd>{acc("SOLICITANTE")}</dd>
        <dt className="font-semibold">{t("pacts.side.DESTINATARIO")}</dt>
        <dd>{acc("DESTINATARIO")}</dd>
        <dt className="font-semibold">{t("pacts.proposal.executorAcceptance")}</dt>
        <dd>{acc("EXECUTOR")}</dd>
      </dl>
    </li>
  );
}

/**
 * Detalhe do pacto (RF49): partes, pedido, mediação em rodadas (propostas com aceites de cada lado e do executor), acordo
 * vigente e histórico de acordos, entregas, marcos, check-ins, esclarecimentos, escalonamentos e a linha do tempo. As ações
 * aparecem só para quem pode agir agora; o resultado (ou o erro explicável) é anunciado.
 */
export function PactDetail({ pact, repo, userId, now, onClose }: { pact: CooperationPact; repo: PactRepository; userId: string; now: Date; onClose: () => void }) {
  const { t, intl } = useI18n();
  const org = repo.org;
  const [mode, setMode] = useState<Mode>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const keys = useRef(0);
  const idem = useRef<string | null>(null);
  const av = availability(org, pact, userId);
  const today = localDay(now);
  const agreement = currentAgreement(pact);
  const openProposal = [...pact.proposals].reverse().find((p) => p.status === "ABERTA");

  const open = (m: Mode) => {
    setMode(m);
    setFeedback(null);
    idem.current = `${pact.id}:${String(m)}:${++keys.current}`;
  };

  const explain = (r: Extract<CommandResult, { ok: false }>) => {
    if (r.error === "VALIDACAO" && r.fields) {
      const parts = Object.entries(r.fields).map(([f, code]) => t("pacts.error.field", { field: t(`pacts.fieldName.${f}`), problem: t(`pacts.problem.${code}`) }));
      return `${t("pacts.error.VALIDACAO")} ${parts.join(" ")}`;
    }
    return t(`pacts.error.${r.error}`, { count: r.info?.count ?? "", limit: r.info?.limit ?? "", path: r.info?.path ?? "", hours: r.info?.hours ?? "", version: r.info?.version ?? "" });
  };

  const run = (cmd: PactCommand, okKey: string) => {
    const r = repo.dispatch(cmd, { actorId: userId, now: new Date(), expectedVersion: pact.version, idempotencyKey: idem.current });
    if (!r.ok) {
      setFeedback({ ok: false, text: explain(r) });
      return;
    }
    setMode(null);
    idem.current = null;
    setFeedback({ ok: true, text: r.duplicate ? t("pacts.done.duplicate") : t(okKey) });
  };
  const once = (cmd: PactCommand, okKey: string) => {
    idem.current = `${pact.id}:${cmd.type}:${++keys.current}`;
    run(cmd, okKey);
  };

  const initialCommitments = (from: Proposal | null) =>
    (from?.commitments ?? agreement?.commitments ?? []).map((c) => ({ kind: c.kind, side: c.side, description: c.description, dueDate: c.dueDate && c.dueDate >= today ? c.dueDate : "" }));
  const overdue = isOverdue(pact, now);
  const dueDate = currentDueDate(pact);
  const name = (id: string | null | undefined) => personName(org, id);

  return (
    <Card as="article" aria-labelledby={`pact-${pact.id}-title`} className="grid gap-4" data-testid="pact-detail" data-pact={pact.id}>
      <header className="grid gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 id={`pact-${pact.id}-title`} className="min-w-0 flex-1 font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold [overflow-wrap:anywhere]">{pact.expectedDelivery}</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>{t("pacts.detail.close")}</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONE[pact.status]}>{t(`pacts.status.${pact.status}`)}</Badge>
          <Tag>{t(`social.access.${pact.accessClass}`)}</Tag>
          <span className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("pacts.detail.age", { days: waitingDays(pact, now) })}</span>
          <span className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("pacts.detail.due", { date: formatDay(dueDate, intl) })}</span>
          {overdue ? <Badge tone="danger">{t("pacts.detail.overdue")}</Badge> : null}
          <span className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] text-ws-text-faint">{t("pacts.detail.version", { v: pact.version })}</span>
        </div>
      </header>

      <dl className="grid gap-x-4 gap-y-1 text-[length:var(--ws-text-body-sm)] sm:grid-cols-[auto_1fr]">
        <dt className="font-semibold">{t("pacts.side.SOLICITANTE")}</dt>
        <dd>{partyLabel(t, org, pact.requester)} · {t("pacts.detail.openedBy", { name: name(pact.requesterId) })}</dd>
        <dt className="font-semibold">{t("pacts.side.DESTINATARIO")}</dt>
        <dd>{partyLabel(t, org, pact.target)}{agreement ? ` · ${t("pacts.detail.executor", { name: name(agreement.executorId) })}` : ""}</dd>
        <dt className="font-semibold">{t("pacts.detail.justification")}</dt>
        <dd className="[overflow-wrap:anywhere]">{pact.justification}</dd>
        <dt className="font-semibold">{t("pacts.detail.criterion")}</dt>
        <dd className="[overflow-wrap:anywhere]">{pact.acceptanceCriterion}</dd>
        <dt className="font-semibold">{t("pacts.detail.requestedDue")}</dt>
        <dd>{formatDay(pact.requestedDueDate, intl)}</dd>
        {pact.limitException ? (
          <>
            <dt className="font-semibold">{t("pacts.detail.limitException")}</dt>
            <dd>{t("pacts.detail.limitExceptionBy", { name: name(pact.limitException.by), reason: pact.limitException.reason })}</dd>
          </>
        ) : null}
        {pact.closure ? (
          <>
            <dt className="font-semibold">{t("pacts.detail.closure")}</dt>
            <dd>{t("pacts.detail.closureBy", { name: name(pact.closure.by), reason: pact.closure.reason })}</dd>
          </>
        ) : null}
      </dl>

      <div className="grid gap-2" data-testid="pact-actions">
        <div className="flex flex-wrap gap-2">
          {av.accept.map((a) => (
            <Button key={`${a.proposalId}-${a.as}`} size="sm" variant="primary" data-testid={`pact-accept-${a.as}`}
              onClick={() => once({ type: "ACEITAR", pactId: pact.id, proposalId: a.proposalId, as: a.as }, "pacts.done.accept")}>
              {a.as === "EXECUTOR" ? t("pacts.actions.acceptAsExecutor") : t("pacts.actions.acceptAs", { side: t(`pacts.side.${a.as}`) })}
            </Button>
          ))}
          {av.propose.length ? <Button size="sm" onClick={() => open("propose")} data-testid="pact-propose">{openProposal ? t("pacts.actions.counter") : t("pacts.actions.propose")}</Button> : null}
          {av.renegotiate.length ? <Button size="sm" onClick={() => open("renegotiate")} data-testid="pact-renegotiate">{t("pacts.actions.renegotiate")}</Button> : null}
          {av.ask ? <Button size="sm" onClick={() => open("ask")}>{t("pacts.actions.ask")}</Button> : null}
          {av.answer.map((id) => <Button key={id} size="sm" onClick={() => open(`answer:${id}`)}>{t("pacts.actions.answer")}</Button>)}
          {av.limitException ? <Button size="sm" onClick={() => open("exception")} data-testid="pact-exception">{t("pacts.actions.exception")}</Button> : null}
          {av.deliver ? <Button size="sm" variant="primary" onClick={() => open("deliver")} data-testid="pact-deliver">{t("pacts.actions.deliver")}</Button> : null}
          {av.validate ? <Button size="sm" variant="primary" onClick={() => once({ type: "VALIDAR", pactId: pact.id }, "pacts.done.validate")} data-testid="pact-validate">{t("pacts.actions.validate")}</Button> : null}
          {av.giveBack ? <Button size="sm" onClick={() => open("return")}>{t("pacts.actions.giveBack")}</Button> : null}
          {av.confirmUnblock ? <Button size="sm" variant="primary" onClick={() => once({ type: "CONFIRMAR_DESBLOQUEIO", pactId: pact.id }, "pacts.done.unblock")} data-testid="pact-unblock">{t("pacts.actions.confirmUnblock")}</Button> : null}
          {av.recognize ? <Button size="sm" onClick={() => open("recognize")}>{t("pacts.actions.recognize")}</Button> : null}
          {av.checkin ? <Button size="sm" onClick={() => open("checkin")} data-testid="pact-checkin">{t("pacts.actions.checkin")}</Button> : null}
          {av.milestone ? <Button size="sm" onClick={() => open("milestone")}>{t("pacts.actions.milestone")}</Button> : null}
          {av.escalate ? <Button size="sm" onClick={() => open("escalate")} data-testid="pact-escalate">{t("pacts.actions.escalate")}</Button> : null}
          {av.resolve.map((id) => <Button key={id} size="sm" variant="primary" onClick={() => open(`resolve:${id}`)} data-testid="pact-resolve">{t("pacts.actions.resolve")}</Button>)}
          {av.remind ? <Button size="sm" variant="ghost" onClick={() => once({ type: "LEMBRAR", pactId: pact.id }, "pacts.done.remind")}>{t("pacts.actions.remind")}</Button> : null}
          {av.refuse ? <Button size="sm" variant="danger" onClick={() => open("refuse")}>{t("pacts.actions.refuse")}</Button> : null}
          {av.cancel ? <Button size="sm" variant="danger" onClick={() => open("cancel")}>{t("pacts.actions.cancel")}</Button> : null}
          <Button size="sm" variant="spark" href={mediationHref(pact)} data-testid="pact-mediate">{t("pacts.actions.mediate")}</Button>
        </div>
        <p role="status" aria-live="polite" className={cn("text-[length:var(--ws-text-body-sm)]", feedback?.ok ? "text-ws-success-ink" : "text-ws-danger-ink")} data-testid="pact-feedback">
          {feedback?.text ?? ""}
        </p>

        {mode === "propose" || mode === "renegotiate" ? (
          <ProposalEditor
            org={org}
            sides={mode === "propose" ? av.propose : av.renegotiate}
            initial={initialCommitments(openProposal ?? null)}
            executors={validExecutors(org, pact)}
            mode={mode === "propose" ? "PROPOR" : "RENEGOCIAR"}
            onCancel={() => setMode(null)}
            onSubmit={(v) =>
              run(
                mode === "propose"
                  ? { type: "PROPOR", pactId: pact.id, side: v.side, commitments: v.commitments, executorId: v.executorId, note: v.note }
                  : { type: "RENEGOCIAR", pactId: pact.id, side: v.side, commitments: v.commitments, executorId: v.executorId, reason: v.reason, note: v.note },
                mode === "propose" ? "pacts.done.propose" : "pacts.done.renegotiate",
              )
            }
          />
        ) : null}
        {mode === "ask" ? <TextForm title={t("pacts.form.ask.title")} label={t("pacts.form.ask.label")} submitLabel={t("pacts.form.send")} onCancel={() => setMode(null)} onSubmit={(question) => run({ type: "PEDIR_ESCLARECIMENTO", pactId: pact.id, question }, "pacts.done.ask")} /> : null}
        {typeof mode === "string" && mode.startsWith("answer:") ? (
          <TextForm title={t("pacts.form.answer.title")} label={t("pacts.form.answer.label")} submitLabel={t("pacts.form.send")} onCancel={() => setMode(null)} onSubmit={(answer) => run({ type: "ESCLARECER", pactId: pact.id, clarificationId: mode.slice(7), answer }, "pacts.done.answer")} />
        ) : null}
        {mode === "refuse" ? <TextForm testId="pact-form-refuse" title={t("pacts.form.refuse.title")} label={t("pacts.form.reason")} hint={t("pacts.form.reasonHint")} submitLabel={t("pacts.actions.refuse")} onCancel={() => setMode(null)} onSubmit={(reason) => run({ type: "RECUSAR", pactId: pact.id, reason }, "pacts.done.refuse")} /> : null}
        {mode === "cancel" ? <TextForm title={t("pacts.form.cancel.title")} label={t("pacts.form.reason")} hint={t("pacts.form.reasonHint")} submitLabel={t("pacts.actions.cancel")} onCancel={() => setMode(null)} onSubmit={(reason) => run({ type: "CANCELAR", pactId: pact.id, reason }, "pacts.done.cancel")} /> : null}
        {mode === "exception" ? <TextForm testId="pact-form-exception" title={t("pacts.form.exception.title")} label={t("pacts.form.reason")} hint={t("pacts.form.exception.hint")} submitLabel={t("pacts.form.exception.submit")} onCancel={() => setMode(null)} onSubmit={(reason) => run({ type: "EXCECAO_LIMITE", pactId: pact.id, reason }, "pacts.done.exception")} /> : null}
        {mode === "deliver" ? <DeliveryForm onCancel={() => setMode(null)} onSubmit={(v) => run({ type: "ENTREGAR", pactId: pact.id, ...v }, "pacts.done.deliver")} /> : null}
        {mode === "return" ? <ReturnForm onCancel={() => setMode(null)} onSubmit={(v) => run({ type: "DEVOLVER", pactId: pact.id, ...v }, "pacts.done.return")} /> : null}
        {mode === "recognize" ? <TextForm title={t("pacts.form.recognize.title")} label={t("pacts.form.recognize.label")} hint={t("pacts.form.recognize.hint")} submitLabel={t("pacts.form.recognize.submit")} onCancel={() => setMode(null)} onSubmit={(text) => run({ type: "RECONHECER", pactId: pact.id, text }, "pacts.done.recognize")} /> : null}
        {mode === "checkin" && agreement ? <CheckinForm commitments={agreement.commitments} onCancel={() => setMode(null)} onSubmit={(v) => run({ type: "CHECKIN", pactId: pact.id, ...v }, "pacts.done.checkin")} /> : null}
        {mode === "milestone" ? <MilestoneForm onCancel={() => setMode(null)} onSubmit={(v) => run({ type: "MARCO", pactId: pact.id, ...v }, "pacts.done.milestone")} /> : null}
        {mode === "escalate" ? <TextForm testId="pact-form-escalate" title={t("pacts.form.escalate.title")} label={t("pacts.form.reason")} hint={t("pacts.form.escalate.hint")} submitLabel={t("pacts.form.escalate.submit")} onCancel={() => setMode(null)} onSubmit={(reason) => run({ type: "ESCALAR", pactId: pact.id, reason }, "pacts.done.escalate")} /> : null}
        {typeof mode === "string" && mode.startsWith("resolve:") ? (
          <TextForm testId="pact-form-resolve" title={t("pacts.form.resolve.title")} label={t("pacts.form.resolve.label")} hint={t("pacts.form.resolve.hint")} submitLabel={t("pacts.form.resolve.submit")} onCancel={() => setMode(null)} onSubmit={(text) => run({ type: "RESOLVER_ESCALONAMENTO", pactId: pact.id, escalationId: mode.slice(8), text }, "pacts.done.resolve")} />
        ) : null}
      </div>

      {pact.proposals.length ? (
        <Section title={t("pacts.detail.mediation")} testId="pact-mediation">
          <ol className="grid gap-2">{[...pact.proposals].reverse().map((p) => <ProposalCard key={p.id} p={p} org={org} />)}</ol>
        </Section>
      ) : (
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("pacts.detail.noProposal")}</p>
      )}

      {pact.agreements.length ? (
        <Section title={t("pacts.detail.agreement")} testId="pact-agreement">
          {agreement ? (
            <>
              <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("pacts.detail.agreementLine", { v: agreement.version, date: formatDay(agreement.agreedDueDate, intl), name: name(agreement.executorId), when: formatWhen(agreement.agreedAt, intl) })}</p>
              <CommitmentList items={agreement.commitments} today={today} />
            </>
          ) : null}
          {pact.agreements.filter((a) => a.supersededAt).map((a) => (
            <p key={a.version} className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
              {t("pacts.detail.superseded", { v: a.version, date: formatDay(a.agreedDueDate, intl), name: name(a.supersededBy), reason: a.supersedeReason ?? "—" })}
            </p>
          ))}
        </Section>
      ) : null}

      {pact.deliveries.length ? (
        <Section title={t("pacts.detail.deliveries")}>
          <ol className="grid gap-1.5 text-[length:var(--ws-text-body-sm)]">
            {pact.deliveries.map((d) => (
              <li key={d.attempt} data-testid="pact-delivery">
                {t("pacts.detail.delivery", { n: d.attempt, version: d.resourceVersion, evidence: d.evidence, name: name(d.by), when: formatWhen(d.at, intl) })}
                {d.returned ? <span className="text-ws-danger-ink"> — {t("pacts.detail.returned", { criterion: d.returned.unmetCriterion, reason: d.returned.reason })}</span> : null}
              </li>
            ))}
          </ol>
          {pact.validation ? <p className="text-[length:var(--ws-text-body-sm)] text-ws-success-ink">{t("pacts.detail.validated", { name: name(pact.validation.by), when: formatWhen(pact.validation.at, intl) })}</p> : null}
          {pact.status === "VALIDADO" ? (
            <p className="text-[length:var(--ws-text-body-sm)]">{pact.unblock ? t("pacts.detail.unblocked", { when: formatWhen(pact.unblock.at, intl) }) : t("pacts.detail.notUnblocked")}</p>
          ) : null}
          {pact.recognition ? <p className="text-[length:var(--ws-text-body-sm)]">{t("pacts.detail.recognition", { name: name(pact.recognition.by), text: pact.recognition.text })}</p> : null}
        </Section>
      ) : null}

      {pact.milestones.length ? (
        <Section title={t("pacts.detail.milestones")}>
          <ul className="grid gap-1 text-[length:var(--ws-text-body-sm)]">
            {pact.milestones.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-2">
                <Badge tone={m.doneAt ? "success" : m.dueDate < today ? "warning" : "neutral"}>{m.doneAt ? t("pacts.detail.milestoneDone") : m.dueDate < today ? t("pacts.commitment.late") : t("pacts.detail.milestoneOpen")}</Badge>
                <span>{m.title}</span>
                <span className="text-ws-text-muted">{formatDay(m.dueDate, intl)}</span>
                {!m.doneAt && av.completeMilestone.includes(m.id) ? <Button size="sm" variant="ghost" onClick={() => once({ type: "MARCO_CONCLUIDO", pactId: pact.id, milestoneId: m.id }, "pacts.done.milestoneDone")}>{t("pacts.actions.completeMilestone")}</Button> : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {pact.checkins.length ? (
        <Section title={t("pacts.detail.checkins")}>
          <ul className="grid gap-1 text-[length:var(--ws-text-body-sm)]">
            {pact.checkins.map((c) => <li key={c.id}>{t("pacts.detail.checkin", { name: name(c.by), when: formatWhen(c.at, intl), note: c.note })}</li>)}
          </ul>
        </Section>
      ) : null}

      {pact.clarifications.length ? (
        <Section title={t("pacts.detail.clarifications")}>
          <ul className="grid gap-1.5 text-[length:var(--ws-text-body-sm)]">
            {pact.clarifications.map((c) => (
              <li key={c.id}>
                <p>{t("pacts.detail.question", { name: name(c.by), text: c.question })}</p>
                <p className="text-ws-text-muted">{c.answer ? t("pacts.detail.answer", { name: name(c.answer.by), text: c.answer.text }) : t("pacts.detail.noAnswer")}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {pact.escalations.length ? (
        <Section title={t("pacts.detail.escalations")} testId="pact-escalations">
          <ul className="grid gap-1.5 text-[length:var(--ws-text-body-sm)]">
            {pact.escalations.map((e) => (
              <li key={e.id} className="grid gap-0.5">
                <p>
                  <Badge tone={e.status === "ABERTA" ? "warning" : "success"}>{t(`pacts.escalation.${e.status}`)}</Badge>{" "}
                  {t("pacts.detail.escalation", { name: name(e.by), targets: e.targets.map((x) => name(x)).join(", "), reason: e.reason })}
                </p>
                {e.resolution ? <p className="text-ws-text-muted">{t("pacts.detail.escalationResolved", { name: name(e.resolution.by), text: e.resolution.text })}</p> : null}
              </li>
            ))}
          </ul>
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("pacts.detail.escalationNote")}</p>
        </Section>
      ) : null}

      <details className="rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 px-3 py-2">
        <summary className="cursor-pointer text-[length:var(--ws-text-body-sm)] font-semibold">{t("pacts.detail.history", { n: pact.events.length })}</summary>
        <ol className="mt-2 grid gap-1 text-[length:var(--ws-text-caption)]" data-testid="pact-history">
          {pact.events.map((e) => (
            <li key={e.id}>
              {formatWhen(e.at, intl)} · {name(e.actorId)} · {t(`pacts.event.${e.kind}`)}
              {e.from && e.from !== e.to ? ` (${t(`pacts.status.${e.from}`)} → ${t(`pacts.status.${e.to}`)})` : ""}
              {e.reason ? ` — ${e.reason}` : ""}
            </li>
          ))}
        </ol>
      </details>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
        {t("pacts.detail.departments", { from: departmentOf(org, pact.requester.departmentId)?.name ?? deptAcronym(org, pact.requester.departmentId), to: departmentOf(org, pact.target.departmentId)?.name ?? deptAcronym(org, pact.target.departmentId) })}{" "}
        <Link href={mediationHref(pact)}>{t("pacts.detail.mediateLink")}</Link>
      </p>
    </Card>
  );
}
