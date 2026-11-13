"use client";
/**
 * Chat classificado da sessão (§B.3 L1): `role="log"` + `aria-live="polite"`, cada mensagem com o TIPO em texto (nunca só cor),
 * referências das evidências, perguntas com resposta aceita, reações de qualidade, avisos do sistema com selo de não lido, a ata
 * publicada e as mensagens da IA ✦ — estas só aparecem conforme o modo efetivo de quem vê (Manual oculta, Sob solicitação
 * mostra o que a pessoa pediu e o resto sob pedido). O compositor envia mensagem, evidência, pergunta ou resposta, e pergunta à
 * IA (que só responde com fontes do sistema).
 */
import { useState } from "react";
import { Badge, Button, Field, Input, Link, Select, Tag, Textarea, cn, type Tone } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { evaluateAiAction } from "@/lib/ai/autonomy";
import { answersTo, openQuestions } from "@/lib/decia/session/chat";
import { isChatOpen } from "@/lib/decia/session/machine";
import { aiVisibility, proposalView } from "@/lib/decia/session/policy";
import { can } from "@/lib/decia/session/roles";
import {
  QUALITY_REACTIONS, REFERENCE_KINDS, type AiAnswer, type HumanMessageKind, type MessageKind, type QualityReaction, type ReferenceKind, type SessionFact, type SessionMessage, type SystemNotice,
} from "@/lib/decia/session/types";
import { formatDateOnly, formatWhen, personName, useDenial, useSessionCtx } from "./context";
import { PointsLine } from "./PointsLine";

export const KIND_META: Record<MessageKind, { icon: string; tone: Tone }> = {
  MENSAGEM: { icon: "✎", tone: "neutral" },
  EVIDENCIA: { icon: "▤", tone: "info" },
  PERGUNTA: { icon: "?", tone: "accent" },
  RESPOSTA: { icon: "↩", tone: "green" },
  PROPOSTA_IA: { icon: "✦", tone: "spark" },
  SISTEMA: { icon: "ⓘ", tone: "warning" },
  ATA: { icon: "▣", tone: "success" },
};

export function KindTag({ kind, ai }: { kind: MessageKind; ai?: boolean }) {
  const { t } = useI18n();
  const meta = ai ? KIND_META.PROPOSTA_IA : KIND_META[kind];
  return <Tag tone={meta.tone}><span aria-hidden>{meta.icon}</span>{t(`session.kind.${kind}`)}{ai && kind !== "PROPOSTA_IA" ? ` · ${t("session.kind.ai")}` : ""}</Tag>;
}

function Facts({ facts }: { facts: SessionFact[] }) {
  const { t } = useI18n();
  return (
    <ul className="grid gap-2">
      {facts.map((f) => (
        <li key={f.key} className="grid gap-1">
          <span className="font-semibold">{f.key === "ENCAMINHAMENTOS" ? t("session.ai.fact.ENCAMINHAMENTOS", { open: f.open, done: f.done }) : t(`session.ai.fact.${f.key}`, { n: f.n })}</span>
          {f.items.length ? <ul className="ml-4 list-disc text-ws-text-muted">{f.items.map((it, i) => <li key={i}>{it}</li>)}</ul> : null}
        </li>
      ))}
    </ul>
  );
}

export function AiAnswerView({ ai }: { ai: AiAnswer }) {
  const { t } = useI18n();
  if (!ai.citations.length && !ai.facts.length) {
    return <p data-testid="ai-no-source">{t("session.ai.noSource", { query: ai.query })}</p>;
  }
  return (
    <div className="grid gap-2" data-testid="ai-answer">
      {ai.facts.length ? <><p>{t("session.ai.factsIntro")}</p><Facts facts={ai.facts} /></> : null}
      {ai.citations.length ? (
        <>
          <p>{t("session.ai.citationsIntro", { n: ai.citations.length })}</p>
          <ol className="grid gap-2">
            {ai.citations.map((c) => (
              <li key={c.n} className="grid gap-1" data-testid="citation">
                <p className="font-semibold"><span className="font-[family-name:var(--ws-font-mono)]">[{c.n}]</span> {c.citation}</p>
                <blockquote className="border-l-2 border-ws-ai-spark pl-3 italic text-ws-text">“{c.passage}”</blockquote>
                {c.href ? <Link href={c.href} className="w-fit text-[length:var(--ws-text-caption)]">{t("session.ai.openSource", { title: c.title })}</Link> : <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{c.title}</span>}
              </li>
            ))}
          </ol>
        </>
      ) : <p className="text-ws-text-muted">{t("session.ai.noMemorySource")}</p>}
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("session.ai.onlySources")}</p>
    </div>
  );
}

function noticeText(n: SystemNotice, t: (k: string, v?: Record<string, string | number>) => string, people: Record<string, { name: string }>, byLabel: (by: string) => string): string {
  switch (n.kind) {
    case "MODO_ALTERADO":
      return t("session.notice.MODO_ALTERADO", { by: personName(people, n.by), from: t(`aiAutonomy.${n.from}`), to: t(`aiAutonomy.${n.to}`), version: n.policyVersion, n: n.invalidated });
    case "TETO_ALTERADO":
      return t("session.notice.TETO_ALTERADO", { by: byLabel(n.by), ceiling: t(`aiAutonomy.${n.ceiling}`), before: t(`aiAutonomy.${n.before}`), after: t(`aiAutonomy.${n.after}`), version: n.policyVersion, n: n.invalidated });
    case "ESTADO_ALTERADO":
      return t(n.reason ? "session.notice.ESTADO_ALTERADO_motivo" : "session.notice.ESTADO_ALTERADO", { by: personName(people, n.by), from: t(`session.status.${n.from}`), to: t(`session.status.${n.to}`), reason: n.reason ?? "" });
    case "REUNIAO_INICIADA":
      return t("session.notice.REUNIAO_INICIADA", { by: personName(people, n.by), title: n.title });
    case "ATA_CONTESTADA":
      return t("session.notice.ATA_CONTESTADA", { by: personName(people, n.by), title: n.title, reason: n.reason });
    case "ENCAMINHAMENTO_CUMPRIDO":
      return t("session.notice.ENCAMINHAMENTO_CUMPRIDO", { by: personName(people, n.by), action: n.action, name: personName(people, n.responsibleId) });
  }
}

/** Quem mudou a política: uma pessoa (id) ou a organização ("org:ADMIN"/"org:EMPRESA"). */
export function useByLabel() {
  const { t } = useI18n();
  const { people } = useSessionCtx();
  return (by: string) => (by.startsWith("org:") ? t("aiPolicy.byOrg", { profile: t(`profile.${by.slice(4)}`) }) : personName(people, by));
}

function Reactions({ message }: { message: SessionMessage }) {
  const { t } = useI18n();
  const { session, repo, me, people } = useSessionCtx();
  const own = message.author.kind === "PESSOA" && message.author.userId === me;
  const allowed = can(session, me, "REAGIR") && !own;
  const reason = own ? t("session.react.own") : !can(session, me, "REAGIR") ? t("session.react.role") : undefined;
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label={t("session.react.label")}>
      {QUALITY_REACTIONS.map((r: QualityReaction) => {
        const who = message.reactions[r] ?? [];
        const on = who.includes(me);
        return (
          <Button
            key={r}
            size="sm"
            variant={on ? "primary" : "ghost"}
            aria-pressed={on}
            disabled={!allowed}
            title={reason ?? (who.length ? who.map((u) => personName(people, u)).join(", ") : undefined)}
            onClick={() => repo.react(session.id, me, message.id, r)}
            className="min-h-0 px-2 py-0.5 text-[length:var(--ws-text-caption)]"
          >
            {t(`session.react.${r}`)}{who.length ? ` · ${who.length}` : ""}
          </Button>
        );
      })}
    </div>
  );
}

function AtaMessage({ message }: { message: SessionMessage }) {
  const { t, intl } = useI18n();
  const { people, goTo } = useSessionCtx();
  const m = message.minutes;
  if (!m) return null;
  const accepted = m.followUps.filter((f) => f.accepted);
  return (
    <div className="grid gap-2" data-testid="ata-message">
      <p className="font-semibold">{t("session.ata.published", { title: message.meetingTitle ?? "", version: message.minutesVersion ?? 1, date: formatDateOnly(m.baseDate, intl) })}</p>
      <p className="text-ws-text-muted">{t("session.ata.participants", { names: m.participants.map((p) => p.name).join(", ") || "—" })}</p>
      {m.decisions.length ? (
        <div><p className="font-semibold">{t("ata.text.decisions")}</p><ul className="ml-4 list-disc">{m.decisions.map((d) => <li key={d.id}>{d.text}</li>)}</ul></div>
      ) : null}
      {accepted.length ? (
        <div>
          <p className="font-semibold">{t("ata.text.followUps")}</p>
          <ul className="ml-4 list-disc">
            {accepted.map((f) => (
              <li key={f.id}>{f.action} — {f.responsible.status === "CASADO" ? personName(people, f.responsible.userId) : t("ata.toDefine")} — {f.due ? formatDateOnly(f.due.date, intl) : t("ata.toDefine")}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <Button size="sm" variant="ghost" className="w-fit" onClick={() => goTo("artefatos")}>{t("session.ata.open")}</Button>
    </div>
  );
}

function ProposalMessage({ message }: { message: SessionMessage }) {
  const { t } = useI18n();
  const { session, org, goTo } = useSessionCtx();
  const p = session.proposals.find((x) => x.id === message.proposalId);
  if (!p) return null;
  const view = proposalView(session, org, p);
  const stateText = view.state === "OBSOLETA" ? t("session.proposal.obsolete", { reason: t(`session.denial.${view.reason}`) }) : t(`session.proposal.state.${view.state}`);
  return (
    <div className="grid gap-2">
      <p>{t(message.requestedBy ? "session.proposal.requested" : "session.proposal.spontaneous", { mode: t(`aiAutonomy.${p.mode}`), version: p.policyVersion })}</p>
      <p className="flex flex-wrap items-center gap-2">
        <Tag tone={view.state === "PENDENTE" ? "spark" : view.state === "OBSOLETA" ? "neutral" : view.state === "REJEITADA" ? "danger" : "success"}>{stateText}</Tag>
        {p.revertedAt ? <Tag tone="warning">{t("session.proposal.reverted")}</Tag> : null}
      </p>
      <Button size="sm" variant="ghost" className="w-fit" onClick={() => goTo("minuta")}>{t("session.proposal.review")}</Button>
    </div>
  );
}

function MessageItem({ message }: { message: SessionMessage }) {
  const { t, intl } = useI18n();
  const { session, repo, me, people, viewer } = useSessionCtx();
  const byLabel = useByLabel();
  const denial = useDenial();
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAi = message.author.kind === "IA";
  const unread = (session.unread[me] ?? []).includes(message.id);
  const vis = isAi ? aiVisibility(viewer.policy, message.requestedBy, me) : "VISIVEL";
  const author = message.author.kind === "PESSOA" ? personName(people, message.author.userId) : message.author.kind === "IA" ? t("session.ai.name") : t("session.system");
  const question = message.kind === "RESPOSTA" ? session.messages.find((m) => m.id === message.replyTo) : undefined;
  const asker = question?.author.kind === "PESSOA" ? question.author.userId : null;
  const canAccept = message.kind === "RESPOSTA" && !!question && !question.acceptedAnswerId && message.author.kind === "PESSOA" && (asker === me || can(session, me, "MUDAR_ESTADO"));
  if (isAi && vis === "OCULTA") {
    return (
      <li className="rounded-[var(--ws-radius-md)] border border-dashed border-ws-border p-[var(--ws-space-2)] text-[length:var(--ws-text-caption)] text-ws-text-muted" data-testid="ai-hidden">
        {t("session.ai.hiddenManual")}
      </li>
    );
  }
  if (isAi && vis === "SOB_PEDIDO" && !revealed) {
    return (
      <li className="flex flex-wrap items-center gap-2 rounded-[var(--ws-radius-md)] border border-dashed border-ws-ai-spark p-[var(--ws-space-2)] text-[length:var(--ws-text-caption)] text-ws-text-muted" data-testid="ai-on-request">
        <span><span aria-hidden className="text-ws-ai-spark-ink">✦ </span>{t("session.ai.onRequest", { mode: t(`aiAutonomy.${viewer.mode}`) })}</span>
        <Button size="sm" variant="ghost" onClick={() => setRevealed(true)}>{t("session.ai.show")}</Button>
      </li>
    );
  }
  return (
    <li
      className={cn(
        "grid gap-2 rounded-[var(--ws-radius-md)] border p-[var(--ws-space-3)] text-[length:var(--ws-text-body-sm)]",
        isAi ? "border-ws-ai-spark bg-ws-ai-spark-soft" : message.kind === "SISTEMA" ? "border-ws-border bg-ws-surface-2" : "border-ws-border bg-ws-surface-1",
      )}
      data-kind={message.kind}
      data-testid="message"
    >
      <div className="flex flex-wrap items-center gap-2">
        <KindTag kind={message.kind} ai={isAi} />
        <span className={cn("font-semibold", isAi && "text-ws-ai-spark-ink")}>{isAi ? <span aria-hidden>✦ </span> : null}{author}</span>
        <time dateTime={message.at} className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{formatWhen(message.at, intl)}</time>
        {message.toAi ? <Badge tone="spark">{t("session.toAi")}</Badge> : null}
        {message.kind === "PERGUNTA" && !message.toAi ? <Tag tone={message.acceptedAnswerId ? "success" : "warning"}>{message.acceptedAnswerId ? `✓ ${t("session.question.answered")}` : `○ ${t("session.question.open")}`}</Tag> : null}
        {unread ? <Badge tone="danger">{t("session.unread")}</Badge> : null}
      </div>
      {question ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("session.replyTo", { name: question.author.kind === "PESSOA" ? personName(people, question.author.userId) : "—", text: question.text.slice(0, 120) })}</p> : null}
      {message.text ? <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{message.text}</p> : null}
      {message.reference ? (
        <p className="flex flex-wrap items-center gap-2 text-[length:var(--ws-text-caption)]">
          <Tag tone="info">{t(`session.reference.${message.reference.kind}`)}</Tag>
          {message.reference.href ? <Link href={message.reference.href}>{message.reference.label}</Link> : <span>{message.reference.label}</span>}
        </p>
      ) : null}
      {message.notice ? <p>{noticeText(message.notice, t, people, byLabel)}</p> : null}
      {message.ai ? <AiAnswerView ai={message.ai} /> : null}
      {message.kind === "PROPOSTA_IA" ? <ProposalMessage message={message} /> : null}
      {message.kind === "ATA" ? <AtaMessage message={message} /> : null}
      {(message.points ?? []).map((n) => <PointsLine key={n.event + n.userId} note={n} viewerId={me} />)}
      {message.kind !== "SISTEMA" ? <Reactions message={message} /> : null}
      {canAccept ? (
        <Button size="sm" variant="ghost" className="w-fit" onClick={() => { const r = repo.acceptAnswer(session.id, me, question!.id, message.id); setError(r.ok ? null : denial(r.reason)); }}>
          {t("session.question.accept")}
        </Button>
      ) : null}
      {question?.acceptedAnswerId === message.id ? <Tag tone="success">✓ {t("session.question.acceptedAnswer")}</Tag> : null}
      {error ? <p role="alert" className="text-ws-danger-ink">{error}</p> : null}
    </li>
  );
}

function Composer() {
  const { t } = useI18n();
  const { session, repo, me, viewer, personal } = useSessionCtx();
  const denial = useDenial();
  const kinds: HumanMessageKind[] = (["MENSAGEM", "EVIDENCIA", "PERGUNTA", "RESPOSTA"] as const).filter((k) =>
    can(session, me, k === "MENSAGEM" ? "ENVIAR_MENSAGEM" : k === "EVIDENCIA" ? "ENVIAR_EVIDENCIA" : k === "PERGUNTA" ? "PERGUNTAR" : "RESPONDER"));
  const questions = openQuestions(session);
  const [kind, setKind] = useState<HumanMessageKind>(kinds[0] ?? "PERGUNTA");
  const [text, setText] = useState("");
  const [refKind, setRefKind] = useState<ReferenceKind>("DOCUMENTO");
  const [refLabel, setRefLabel] = useState("");
  const [refHref, setRefHref] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const open = isChatOpen(session.status);
  const aiOk = evaluateAiAction(viewer.policy, "RESPONDER", { requestedByUser: true }).ok && can(session, me, "PERGUNTAR_IA");
  if (!open) return <p className="rounded-[var(--ws-radius-md)] bg-ws-surface-2 p-[var(--ws-space-3)] text-[length:var(--ws-text-body-sm)] text-ws-text-muted" data-testid="chat-closed">{t("session.composer.closed", { status: t(`session.status.${session.status}`) })}</p>;
  if (!kinds.length) return <p className="rounded-[var(--ws-radius-md)] bg-ws-surface-2 p-[var(--ws-space-3)] text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("session.composer.readOnly")}</p>;
  const reset = () => { setText(""); setRefLabel(""); setRefHref(""); setReplyTo(""); };
  const send = () => {
    const withRef = kind === "EVIDENCIA" || ((kind === "RESPOSTA" || kind === "MENSAGEM") && refLabel.trim());
    const r = repo.post(session.id, me, { kind, text, reference: withRef ? { kind: refKind, label: refLabel, href: refHref || null } : null, replyTo: kind === "RESPOSTA" ? replyTo || null : null });
    if (!r.ok) {
      setStatus(denial(r.reason));
      return;
    }
    setStatus(t("session.composer.sent"));
    reset();
  };
  const ask = () => {
    const r = repo.askAi(session.id, me, personal, text);
    if (!r.ok) {
      setStatus(denial(r.reason));
      return;
    }
    setStatus(t("session.composer.askedAi"));
    reset();
  };
  return (
    <form className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)]" onSubmit={(e) => { e.preventDefault(); send(); }} aria-label={t("session.composer.label")}>
      <div className="grid gap-2 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <Field label={t("session.composer.kind")}>
          {({ id }) => <Select id={id} value={kind} onChange={(e) => setKind(e.target.value as HumanMessageKind)} options={kinds.map((k) => ({ value: k, label: t(`session.kind.${k}`) }))} />}
        </Field>
        {kind === "RESPOSTA" ? (
          <Field label={t("session.composer.replyTo")}>
            {({ id }) => <Select id={id} value={replyTo} onChange={(e) => setReplyTo(e.target.value)} options={[{ value: "", label: t("session.composer.chooseQuestion") }, ...questions.map((q) => ({ value: q.id, label: q.text.slice(0, 80) }))]} />}
          </Field>
        ) : null}
      </div>
      <Field label={t("session.composer.text")} hint={kind === "EVIDENCIA" ? t("session.composer.evidenceHint") : undefined}>
        {({ id, describedBy }) => <Textarea id={id} aria-describedby={describedBy} value={text} onChange={(e) => setText(e.target.value)} className="min-h-20" />}
      </Field>
      {kind === "EVIDENCIA" || kind === "RESPOSTA" ? (
        <fieldset className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)]">
          <legend className="mb-1 text-[length:var(--ws-text-body-sm)] font-semibold">{t(kind === "EVIDENCIA" ? "session.composer.reference" : "session.composer.referenceOptional")}</legend>
          <Field label={t("session.composer.refKind")}>
            {({ id }) => <Select id={id} value={refKind} onChange={(e) => setRefKind(e.target.value as ReferenceKind)} options={REFERENCE_KINDS.map((k) => ({ value: k, label: t(`session.reference.${k}`) }))} />}
          </Field>
          <Field label={t("session.composer.refLabel")}>
            {({ id }) => <Input id={id} value={refLabel} onChange={(e) => setRefLabel(e.target.value)} />}
          </Field>
          <Field label={t("session.composer.refHref")} hint={t("session.composer.refHrefHint")}>
            {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} value={refHref} onChange={(e) => setRefHref(e.target.value)} inputMode="url" />}
          </Field>
        </fieldset>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="primary" disabled={!text.trim()} data-testid="send">{t("session.composer.send")}</Button>
        <Button
          variant="spark"
          onClick={ask}
          disabled={!aiOk || !text.trim()}
          title={aiOk ? t("session.composer.askAiHint") : t("session.composer.aiOff", { mode: t(`aiAutonomy.${viewer.mode}`) })}
          data-testid="ask-ai"
        >
          ✦ {t("session.composer.askAi")}
        </Button>
        <span aria-live="polite" className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{status}</span>
      </div>
      {!aiOk ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("session.composer.aiOff", { mode: t(`aiAutonomy.${viewer.mode}`) })}</p> : null}
    </form>
  );
}

export function Chat() {
  const { t } = useI18n();
  const { session } = useSessionCtx();
  return (
    <div className="grid gap-[var(--ws-space-3)]">
      <ol role="log" aria-live="polite" aria-label={t("session.chat.label")} className="grid gap-2" data-testid="chat-log">
        {session.messages.map((m) => <MessageItem key={m.id} message={m} />)}
      </ol>
      <Composer />
    </div>
  );
}

/** Perguntas em aberto com as respostas recebidas (painel lateral). */
export function OpenQuestions() {
  const { t } = useI18n();
  const { session, people } = useSessionCtx();
  const qs = openQuestions(session);
  return (
    <section aria-labelledby="open-questions" className="grid gap-2">
      <h3 id="open-questions" className="text-[length:var(--ws-text-body)] font-semibold">{t("session.questions.title", { n: qs.length })}</h3>
      {qs.length ? (
        <ul className="grid gap-1 text-[length:var(--ws-text-body-sm)]">
          {qs.map((q) => (
            <li key={q.id}>
              <span className="font-semibold">{q.author.kind === "PESSOA" ? personName(people, q.author.userId) : "—"}:</span> {q.text}{" "}
              <span className="text-ws-text-muted">{t("session.questions.answers", { n: answersTo(session, q.id).length })}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("session.questions.none")}</p>}
    </section>
  );
}
