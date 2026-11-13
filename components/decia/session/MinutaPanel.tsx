"use client";
/**
 * Minuta da sessão e propostas da IA ✦ (RF51.CA02/CA05): a pessoa vê a diferença ANTES × DEPOIS de cada proposta e decide —
 * aceitar, editar e aceitar, rejeitar (com motivo) —, e pode reverter uma proposta aplicada (ponto de restauração). Proposta
 * calculada em política ou revisão anterior aparece como OBSOLETA, não aplicável, com o motivo; o rascunho continua lá.
 */
import { useState } from "react";
import { Badge, Button, Card, EmptyState, Field, Tag, Textarea } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { evaluateAiAction } from "@/lib/ai/autonomy";
import { isMinutaEditable } from "@/lib/decia/session/minuta";
import { aiVisibility, proposalView } from "@/lib/decia/session/policy";
import { can } from "@/lib/decia/session/roles";
import type { SessionDenial, SessionProposal } from "@/lib/decia/session/types";
import { WordDiff } from "../audit/WordDiff";
import { formatWhen, personName, useDenial, useMinutaLabels, useSessionCtx } from "./context";

function ProposalCard({ p }: { p: SessionProposal }) {
  const { t, intl } = useI18n();
  const { session, org, repo, me, people, viewer } = useSessionCtx();
  const denial = useDenial();
  const [mode, setMode] = useState<"none" | "edit" | "reject" | "revert">("none");
  const [text, setText] = useState(p.text);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const view = proposalView(session, org, p);
  const vis = aiVisibility(viewer.policy, p.requestedBy, me);
  const mayDecide = can(session, me, "DECIDIR_PROPOSTA") && isMinutaEditable(session.status);
  const applied = (p.status === "ACEITA" || p.status === "EDITADA_E_ACEITA") && !p.revertedAt;
  const canRevert = applied && mayDecide && session.minuta.revision === p.appliedRevision;
  const run = (r: { ok: true } | { ok: false; reason: SessionDenial }) => {
    if (!r.ok) setError(denial(r.reason));
    else {
      setError(null);
      setMode("none");
      setReason("");
    }
  };
  if (vis === "OCULTA" && p.status === "PENDENTE") return <li className="rounded-[var(--ws-radius-md)] border border-dashed border-ws-border p-[var(--ws-space-2)] text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("session.ai.hiddenManual")}</li>;
  if (vis === "SOB_PEDIDO" && p.status === "PENDENTE" && !revealed) {
    return (
      <li className="flex flex-wrap items-center gap-2 rounded-[var(--ws-radius-md)] border border-dashed border-ws-ai-spark p-[var(--ws-space-2)] text-[length:var(--ws-text-caption)] text-ws-text-muted">
        <span>{t("session.ai.onRequest", { mode: t(`aiAutonomy.${viewer.mode}`) })}</span>
        <Button size="sm" variant="ghost" onClick={() => setRevealed(true)}>{t("session.ai.show")}</Button>
      </li>
    );
  }
  const stateTone = view.state === "PENDENTE" ? "spark" : view.state === "OBSOLETA" ? "neutral" : view.state === "REJEITADA" ? "danger" : "success";
  return (
    <Card as="li" padding="md" className="grid gap-[var(--ws-space-3)] border-ws-ai-spark" data-testid="proposal" data-state={view.state}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="spark">✦ {t("session.proposal.title")}</Badge>
        <Tag tone={stateTone}>{view.state === "OBSOLETA" ? `⊘ ${t("session.proposal.state.OBSOLETA")}` : t(`session.proposal.state.${view.state}`)}</Tag>
        {p.revertedAt ? <Tag tone="warning">↺ {t("session.proposal.reverted")}</Tag> : null}
        <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
          {t(p.requestedBy ? "session.proposal.meta" : "session.proposal.metaSpontaneous", { when: formatWhen(p.createdAt, intl), name: personName(people, p.requestedBy), mode: t(`aiAutonomy.${p.mode}`), version: p.policyVersion, revision: p.baseRevision })}
        </span>
      </div>
      {view.state === "OBSOLETA" ? (
        <p role="note" className="rounded-[var(--ws-radius-md)] bg-ws-warning-soft p-[var(--ws-space-2)] text-[length:var(--ws-text-body-sm)]" data-testid="obsolete-reason">
          {t("session.proposal.obsoleteExplain", { reason: t(`session.denial.${view.reason}`), version: session.policy.version, revision: session.minuta.revision })}
        </p>
      ) : null}
      {p.status !== "PENDENTE" && p.resolvedBy ? (
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("session.proposal.resolved", { name: personName(people, p.resolvedBy), when: p.resolvedAt ? formatWhen(p.resolvedAt, intl) : "—" })}{p.reason ? ` · ${t("session.proposal.reason", { reason: p.reason })}` : ""}</p>
      ) : null}
      <WordDiff before={p.baseText} after={p.text} beforeLabel={t("session.proposal.before")} afterLabel={t("session.proposal.after")} />
      {view.state === "PENDENTE" && mayDecide ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="primary" onClick={() => run(repo.resolveProposal(session.id, me, p.id, { kind: "ACEITAR" }))} data-testid="accept-proposal">{t("session.proposal.accept")}</Button>
          <Button size="sm" variant="default" onClick={() => setMode(mode === "edit" ? "none" : "edit")}>{t("session.proposal.edit")}</Button>
          <Button size="sm" variant="ghost" onClick={() => setMode(mode === "reject" ? "none" : "reject")}>{t("session.proposal.reject")}</Button>
        </div>
      ) : null}
      {view.state === "PENDENTE" && !mayDecide ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("session.proposal.roleCannot")}</p> : null}
      {view.state === "OBSOLETA" && mayDecide && evaluateAiAction(viewer.policy, "PROPOR_ALTERACAO", { requestedByUser: true }).ok ? (
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("session.proposal.askAgain")}</p>
      ) : null}
      {canRevert ? <Button size="sm" variant="ghost" className="w-fit" onClick={() => setMode(mode === "revert" ? "none" : "revert")}>↺ {t("session.proposal.revert")}</Button> : null}
      {mode === "edit" ? (
        <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); run(repo.resolveProposal(session.id, me, p.id, { kind: "EDITAR_E_ACEITAR", text })); }}>
          <Field label={t("session.proposal.editLabel")}>{({ id }) => <Textarea id={id} value={text} onChange={(e) => setText(e.target.value)} className="min-h-40" />}</Field>
          <Button size="sm" variant="primary" type="submit" className="w-fit">{t("session.proposal.editAccept")}</Button>
        </form>
      ) : null}
      {mode === "reject" || mode === "revert" ? (
        <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); run(mode === "reject" ? repo.resolveProposal(session.id, me, p.id, { kind: "REJEITAR", reason }) : repo.revertProposal(session.id, me, p.id, reason)); }}>
          <Field label={t(mode === "reject" ? "session.proposal.rejectReason" : "session.proposal.revertReason")} hint={t("session.proposal.reasonHint")}>
            {({ id, describedBy }) => <Textarea id={id} aria-describedby={describedBy} value={reason} onChange={(e) => setReason(e.target.value)} />}
          </Field>
          <Button size="sm" variant={mode === "reject" ? "danger" : "default"} type="submit" className="w-fit">{t(mode === "reject" ? "session.proposal.confirmReject" : "session.proposal.confirmRevert")}</Button>
        </form>
      ) : null}
      {error ? <p role="alert" className="text-[length:var(--ws-text-body-sm)] text-ws-danger-ink">{error}</p> : null}
    </Card>
  );
}

export function MinutaPanel() {
  const { t, intl } = useI18n();
  const { session, repo, me, people, viewer, personal } = useSessionCtx();
  const denial = useDenial();
  const labels = useMinutaLabels();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(session.minuta.text);
  const [status, setStatus] = useState<string | null>(null);
  const editable = isMinutaEditable(session.status);
  const mayEdit = can(session, me, "EDITAR_MINUTA") && editable;
  const aiOk = evaluateAiAction(viewer.policy, "PROPOR_ALTERACAO", { requestedByUser: true }).ok;
  const request = () => {
    const r = repo.requestProposal(session.id, me, personal, labels);
    setStatus(r.ok ? t("session.minuta.proposalCreated") : denial(r.reason));
  };
  const save = () => {
    const r = repo.editMinuta(session.id, me, text);
    if (r.ok) {
      setEditing(false);
      setStatus(t("session.minuta.saved", { revision: r.session.minuta.revision }));
    } else setStatus(denial(r.reason));
  };
  const proposals = [...session.proposals].reverse();
  return (
    <div className="grid gap-[var(--ws-space-5)]">
      <section aria-labelledby="minuta-title" className="grid gap-[var(--ws-space-3)]">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="minuta-title" className="min-w-0 flex-1 font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("session.minuta.title", { revision: session.minuta.revision })}</h2>
          {!editable ? <Tag tone="neutral">⊘ {t("session.minuta.readOnly")}</Tag> : null}
          {mayEdit && !editing ? <Button size="sm" variant="default" onClick={() => { setText(session.minuta.text); setEditing(true); }}>{t("session.minuta.edit")}</Button> : null}
          <Button size="sm" variant="spark" onClick={request} disabled={!mayEdit || !aiOk} title={!aiOk ? t("session.composer.aiOff", { mode: t(`aiAutonomy.${viewer.mode}`) }) : undefined} data-testid="request-proposal">✦ {t("session.minuta.request")}</Button>
        </div>
        {editing ? (
          <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <Field label={t("session.minuta.textLabel")} hint={t("session.minuta.editHint")}>{({ id, describedBy }) => <Textarea id={id} aria-describedby={describedBy} value={text} onChange={(e) => setText(e.target.value)} className="min-h-48" />}</Field>
            <div className="flex gap-2">
              <Button size="sm" variant="primary" type="submit">{t("session.minuta.save")}</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>{t("common.cancel")}</Button>
            </div>
          </form>
        ) : (
          <div className="whitespace-pre-wrap rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-4)] text-[length:var(--ws-text-body-sm)] [overflow-wrap:anywhere]" data-testid="minuta-text">
            {session.minuta.text || <span className="text-ws-text-muted">{t("session.minuta.empty")}</span>}
          </div>
        )}
        {!aiOk ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("session.composer.aiOff", { mode: t(`aiAutonomy.${viewer.mode}`) })}</p> : null}
        <p aria-live="polite" className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{status}</p>
      </section>
      <section aria-labelledby="proposals-title" className="grid gap-[var(--ws-space-3)]">
        <h2 id="proposals-title" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("session.minuta.proposals", { n: proposals.length })}</h2>
        {proposals.length ? <ul className="grid gap-[var(--ws-space-3)]">{proposals.map((p) => <ProposalCard key={p.id} p={p} />)}</ul> : <EmptyState compact title={t("session.minuta.noProposals")} />}
      </section>
      <details className="rounded-[var(--ws-radius-md)] border border-ws-border p-[var(--ws-space-3)]">
        <summary className="cursor-pointer text-[length:var(--ws-text-body-sm)] font-semibold">{t("session.minuta.history", { n: session.minuta.history.length })}</summary>
        <ol className="mt-2 grid gap-1 text-[length:var(--ws-text-body-sm)]">
          {[...session.minuta.history].reverse().map((h) => (
            <li key={h.revision}>
              <span className="font-[family-name:var(--ws-font-mono)]">r{h.revision}</span> · {t(`session.minuta.origin.${h.origin}`)} · {personName(people, h.by)} · {formatWhen(h.at, intl)}
              {h.revertedFrom ? ` · ${t("session.minuta.revertedFrom", { revision: h.revertedFrom })}` : ""}
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
