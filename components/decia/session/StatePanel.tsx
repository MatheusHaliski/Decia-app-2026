"use client";
/**
 * Estado da sessão e decisão ligada (§A.1/§A.2): a decisão estruturada DEMO (card compacto com link ao workspace), o estado e a
 * fase atuais, as transições permitidas para a pessoa proprietária (com motivo onde é obrigatório) e o histórico de mudanças.
 */
import { useState } from "react";
import { Button, Card, EmptyState, Field, Tag, Textarea, type Tone } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { DecisionCard } from "@/components/decia/DecisionCard";
import { workspaceHref } from "@/components/decia/Views";
import { demoRepository, useDecisions } from "@/lib/decia/repository";
import { toDecisionCardViewModel } from "@/lib/decia/view-model";
import { reasonRequired, SESSION_TRANSITIONS } from "@/lib/decia/session/machine";
import { can } from "@/lib/decia/session/roles";
import type { SessionStatus } from "@/lib/decia/session/types";
import { formatWhen, personName, useDenial, useSessionCtx } from "./context";

export const SESSION_STATUS_META: Record<SessionStatus, { icon: string; tone: Tone; dashed?: boolean }> = {
  RASCUNHO: { icon: "✎", tone: "neutral", dashed: true },
  AGENDADA: { icon: "◷", tone: "info" },
  ABERTA: { icon: "●", tone: "accent" },
  CONVERGINDO: { icon: "✦", tone: "spark" },
  DECISAO_PROPOSTA: { icon: "✦", tone: "spark" },
  EM_REVISAO: { icon: "⊘", tone: "warning" },
  VALIDADA: { icon: "✓", tone: "success" },
  DEVOLVIDA: { icon: "↩", tone: "danger" },
  REABERTA: { icon: "↺", tone: "warning" },
  ENCERRADA: { icon: "■", tone: "neutral" },
  ARQUIVADA: { icon: "▣", tone: "neutral" },
  CANCELADA: { icon: "✕", tone: "neutral" },
};

export function SessionStatusTag({ status }: { status: SessionStatus }) {
  const { t } = useI18n();
  const meta = SESSION_STATUS_META[status];
  return <Tag tone={meta.tone} dashed={meta.dashed} pulse={status === "ABERTA"}><span aria-hidden>{meta.icon}</span>{t(`session.status.${status}`)}</Tag>;
}

function LinkedDecision() {
  const { t } = useI18n();
  const { session, people, now } = useSessionCtx();
  const decisions = useDecisions(demoRepository());
  const agg = session.decisionId ? decisions.find((d) => d.decision.id === session.decisionId) : undefined;
  if (!agg) return <EmptyState compact title={t("session.decision.none")} description={t("session.decision.noneHint")} />;
  return <DecisionCard vm={toDecisionCardViewModel(agg, now, { people })} mode="COMPACT" href={workspaceHref(agg.decision.id)} />;
}

export function StatePanel() {
  const { t, intl } = useI18n();
  const { session, repo, me, people } = useSessionCtx();
  const denial = useDenial();
  const [target, setTarget] = useState<SessionStatus | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const owner = can(session, me, "MUDAR_ESTADO");
  const next = SESSION_TRANSITIONS[session.status];
  const go = (to: SessionStatus) => {
    if (reasonRequired(session.status, to) && target !== to) {
      setTarget(to);
      return;
    }
    const r = repo.transition(session.id, me, to, reason || null);
    if (!r.ok) {
      setError(denial(r.reason));
      return;
    }
    setError(null);
    setTarget(null);
    setReason("");
  };
  return (
    <div className="grid gap-[var(--ws-space-5)] lg:grid-cols-2">
      <section aria-labelledby="linked-decision" className="grid content-start gap-[var(--ws-space-3)]">
        <h2 id="linked-decision" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("session.decision.title")}</h2>
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("session.decision.intro")}</p>
        <LinkedDecision />
      </section>
      <section aria-labelledby="session-state" className="grid content-start gap-[var(--ws-space-3)]">
        <h2 id="session-state" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("session.state.title")}</h2>
        <Card padding="md" className="grid gap-[var(--ws-space-3)]">
          <p className="flex flex-wrap items-center gap-2 text-[length:var(--ws-text-body-sm)]">
            <SessionStatusTag status={session.status} />
            <span>{t("session.state.phase", { phase: t(`session.phase.${session.phase}`) })}</span>
          </p>
          <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t(`session.state.explain.${session.status}`)}</p>
          {next.length ? (
            owner ? (
              <div className="grid gap-2">
                <p className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("session.state.next")}</p>
                <div className="flex flex-wrap gap-2">
                  {next.map((to) => (
                    <Button key={to} size="sm" variant={target === to ? "primary" : "default"} onClick={() => go(to)} data-testid={`to-${to}`}>
                      {t(`session.state.action.${to}`)}
                    </Button>
                  ))}
                </div>
                {target ? (
                  <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); go(target); }}>
                    <Field label={t("session.state.reason", { to: t(`session.status.${target}`) })} hint={t("session.state.reasonHint")}>
                      {({ id, describedBy }) => <Textarea id={id} aria-describedby={describedBy} value={reason} onChange={(e) => setReason(e.target.value)} />}
                    </Field>
                    <Button size="sm" variant="primary" type="submit" className="w-fit">{t("session.state.confirm")}</Button>
                  </form>
                ) : null}
              </div>
            ) : <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("session.state.onlyOwner")}</p>
          ) : <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("session.state.terminal")}</p>}
          {error ? <p role="alert" className="text-[length:var(--ws-text-body-sm)] text-ws-danger-ink">{error}</p> : null}
        </Card>
        <details className="rounded-[var(--ws-radius-md)] border border-ws-border p-[var(--ws-space-3)]">
          <summary className="cursor-pointer text-[length:var(--ws-text-body-sm)] font-semibold">{t("session.state.history", { n: session.statusLog.length })}</summary>
          <ol className="mt-2 grid gap-1 text-[length:var(--ws-text-body-sm)]">
            {[...session.statusLog].reverse().map((c, i) => (
              <li key={i}>
                {t("session.state.change", { from: t(`session.status.${c.from}`), to: t(`session.status.${c.to}`), by: personName(people, c.by), when: formatWhen(c.at, intl) })}
                {c.reason ? ` — ${c.reason}` : ""}
              </li>
            ))}
          </ol>
        </details>
      </section>
    </div>
  );
}
