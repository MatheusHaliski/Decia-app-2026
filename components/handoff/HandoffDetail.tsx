"use client";
/**
 * Detalhe do Dossiê de Transição (RF36): o resumo ✦ montado só com as contagens do dossiê (D-12), os itens por seção (projetos,
 * tarefas, decisões, pendências, riscos, contatos, fontes de conhecimento), o plano de transferência com sucessor por item, o
 * checklist, a ciência do(s) sucessor(es) e a exportação (Markdown, JSON e versão para impressão). Todo comando é uma função pura
 * de `lib/handoff/workflow.ts`; a tela só grava o resultado no repositório DEMO.
 */
import { useState } from "react";
import { Badge, Button, Card, Checkbox, Dialog, Field, Input, Link, Select, Tabs, Tag, Textarea, useToast, type Tone } from "@/components/ui";
import { canManage, HANDOFF_PEOPLE, peopleList } from "@/lib/handoff/access";
import { exportFileName, itemTitle, renderFact, sectionItems, toJson, toMarkdown, toPrintHtml, type ExportContext } from "@/lib/handoff/export";
import type { HandoffRepository } from "@/lib/handoff/repository";
import { HANDOFF_SECTIONS, type HandoffDossier, type HandoffItem, type HandoffSection, type PendencyKind } from "@/lib/handoff/types";
import {
  acknowledge, assignDefaultSuccessor, assignSuccessor, cancel, checklist, refuse, sendToSuccessors, setItemNote, successorsOf, summarize,
  toggleCheck, transferableItems, unassigned, type HandoffResult,
} from "@/lib/handoff/workflow";
import { baseLocale } from "@/lib/i18n/state";
import { useI18n } from "@/lib/i18n/useI18n";
import { useViewer } from "@/lib/viewer/ViewerProvider";
import { STATUS_MARK, STATUS_TONE } from "./status";

const PENDENCY_TONE: Record<PendencyKind, Tone> = {
  PRAZO_LEGAL: "danger", VENCIDA: "danger", DECISAO_ATRASADA: "warning", BLOQUEADA: "warning", REVISAO_PROXIMA: "info", MUDANCA_PENDENTE: "info",
};

function saveFile(content: string, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export interface HandoffDetailProps {
  dossier: HandoffDossier;
  repo: HandoffRepository;
  actor: { id: string; name: string };
  now: () => Date;
}

export function HandoffDetail({ dossier: d, repo, actor, now }: HandoffDetailProps) {
  const { t, intl, locale } = useI18n();
  const { toast } = useToast();
  const { profile, session } = useViewer();
  const manage = canManage(profile, d, actor.id);
  const editable = manage && (d.status === "GERADO" || d.status === "RECUSADO");
  const [tab, setTab] = useState<HandoffSection>("PROJETOS");
  const [error, setError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [refuseFor, setRefuseFor] = useState<string | null>(null);
  const [refuseReason, setRefuseReason] = useState("");
  const [defaultSuccessor, setDefaultSuccessor] = useState(d.defaultSuccessorId ?? "");
  const nowIso = () => now().toISOString();
  const fmtDateTime = (iso: string) => new Intl.DateTimeFormat(intl, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  const fmtDate = (iso: string) => new Intl.DateTimeFormat(intl, { dateStyle: "medium" }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));
  const nameOf = (id: string | null) => (id ? HANDOFF_PEOPLE[id]?.name ?? id : t("handoff.noSuccessor"));
  const ctx: ExportContext = { t, people: HANDOFF_PEOPLE, formatDateTime: fmtDateTime };
  const candidates = peopleList().filter((p) => p.id !== d.subjectId);
  const successors = successorsOf(d);
  const total = transferableItems(d).length;
  const missing = unassigned(d).length;

  const run = (r: HandoffResult, ok?: string) => {
    if (!r.ok) {
      setError(t(`handoff.error.${r.error}`, r.vars));
      return false;
    }
    repo.save(r.dossier);
    setError("");
    if (ok) toast({ title: ok, tone: "sucesso" });
    return true;
  };

  const printVersion = () => {
    const doc = toPrintHtml(d, ctx, baseLocale(locale));
    const url = URL.createObjectURL(new Blob([doc], { type: "text/html" }));
    const w = typeof window.open === "function" ? window.open(url, "_blank") : null;
    if (w) w.addEventListener("load", () => { w.focus(); w.print(); }, { once: true });
    else saveFile(doc, "text/html", exportFileName(d, "html")); // janela bloqueada: baixa o HTML para imprimir
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <section aria-labelledby="dossier-title" className="grid gap-[var(--ws-space-4)]" data-testid="handoff-detail" data-status={d.status}>
      <Card>
        <div className="flex flex-wrap items-start gap-2">
          <h2 id="dossier-title" className="min-w-0 flex-1 font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h2)] font-semibold">{t("handoff.detail.title", { name: d.subjectName })}</h2>
          <Tag tone={STATUS_TONE[d.status]} filled><span aria-hidden>{STATUS_MARK[d.status]}</span>{t(`handoff.status.${d.status}`)}</Tag>
        </div>
        <dl className="mt-3 grid gap-x-4 gap-y-1 text-[length:var(--ws-text-body-sm)] sm:grid-cols-[auto_1fr]">
          <dt className="font-semibold">{t("handoff.export.reason")}</dt><dd>{t(`handoff.reason.${d.reason}`)}</dd>
          <dt className="font-semibold">{t("handoff.export.effective")}</dt><dd>{fmtDate(d.effectiveDate)}</dd>
          <dt className="font-semibold">{t("handoff.export.requestedBy")}</dt><dd>{d.requestedByName} · {t(`profile.${d.requestedByProfile}`)}</dd>
          <dt className="font-semibold">{t("handoff.detail.collectedOn")}</dt><dd>{fmtDate(d.collectedOn)} · v{d.version}</dd>
          <dt className="font-semibold">{t("handoff.export.sources")}</dt>
          <dd className="flex flex-wrap gap-1.5">{d.sources.map((s) => <Badge key={s} tone={s === "API" ? "success" : s === "MEMORIA" ? "info" : "neutral"} title={t(`handoff.sourceHint.${s}`)}>{t(`handoff.source.${s}`)}</Badge>)}</dd>
        </dl>
      </Card>

      {/* resumo ✦: frases montadas pelo sistema a partir das contagens do dossiê (D-12) */}
      <Card tone="soft" padding="sm" data-testid="handoff-summary">
        <p className="flex items-center gap-2 font-semibold"><span aria-hidden className="text-ws-ai-spark-ink">✦</span>{t("handoff.summary.title")}</p>
        <ul className="mt-1 grid list-disc gap-0.5 pl-6 text-[length:var(--ws-text-body-sm)] text-ws-ai-spark-ink" aria-live="polite">
          {summarize(d).map((f, i) => <li key={i}>{renderFact(t, f)}</li>)}
        </ul>
        <p className="mt-1 text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("handoff.summary.note")}</p>
      </Card>

      <Card title={t("handoff.items.title")}>
        <Tabs
          label={t("handoff.items.title")}
          param={null}
          value={tab}
          onChange={(s) => setTab(s as HandoffSection)}
          look="pills"
          tabs={HANDOFF_SECTIONS.map((s) => ({ slug: s, label: t(`handoff.section.${s}`), badge: <Badge tone="neutral">{sectionItems(d, s).length}</Badge> }))}
        >
          {(active) => {
            const items = sectionItems(d, active as HandoffSection);
            return (
              <div className="mt-3 grid gap-2" data-testid={`handoff-section-${active}`}>
                <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t(`handoff.sectionHint.${active}`)}</p>
                {items.length ? (
                  <ul className="grid gap-2">
                    {items.map((it) => (
                      <ItemRow
                        key={it.id} item={it} editable={editable} candidates={candidates} nameOf={nameOf}
                        onSuccessor={(id) => run(assignSuccessor(d, it.id, id, actor.id, nowIso()))}
                        onNote={(note) => run(setItemNote(d, it.id, note, nowIso()))}
                      />
                    ))}
                  </ul>
                ) : <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("handoff.empty")}</p>}
              </div>
            );
          }}
        </Tabs>
      </Card>

      <Card title={t("handoff.plan.title")} eyebrow={t("handoff.plan.eyebrow")}>
        <p className="text-[length:var(--ws-text-body-sm)]" aria-live="polite" data-testid="handoff-plan-progress">
          {t("handoff.plan.progress", { done: total - missing, total, successors: successors.length })}
        </p>
        {editable ? (
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <Field label={t("handoff.plan.default")} className="min-w-56">
              {({ id }) => (
                <Select id={id} value={defaultSuccessor} onChange={(e) => setDefaultSuccessor(e.target.value)}
                  options={[{ value: "", label: t("handoff.form.choose") }, ...candidates.map((p) => ({ value: p.id, label: p.name }))]} />
              )}
            </Field>
            <Button size="sm" disabled={!defaultSuccessor} onClick={() => run(assignDefaultSuccessor(d, defaultSuccessor, actor.id, nowIso()), t("handoff.plan.applied", { name: nameOf(defaultSuccessor) }))} data-testid="handoff-apply-default">
              {t("handoff.plan.apply")}
            </Button>
          </div>
        ) : null}
        {successors.length ? (
          <ul className="mt-2 grid gap-1 text-[length:var(--ws-text-caption)] text-ws-text-muted">
            {successors.map((s) => <li key={s}>{t("handoff.plan.bySuccessor", { name: nameOf(s), n: transferableItems(d).filter((i) => i.successorId === s).length })}</li>)}
          </ul>
        ) : null}
      </Card>

      <Card title={t("handoff.checklist.title")}>
        <ul className="grid gap-1" data-testid="handoff-checklist">
          {checklist(d).map((c) => (
            <li key={c.id} data-check={c.id} data-done={c.done}>
              {c.auto || !manage || d.status === "CANCELADO" || d.status === "TRANSFERIDO" ? (
                <p className="flex items-start gap-2 py-1 text-[length:var(--ws-text-body-sm)]">
                  <Tag tone={c.done ? "success" : "neutral"}><span aria-hidden>{c.done ? "✓" : "○"}</span>{t(c.done ? "handoff.checklist.done" : "handoff.checklist.open")}</Tag>
                  <span>{renderFact(t, c.label)}{c.auto ? <span className="text-ws-text-muted"> · {t("handoff.checklist.auto")}</span> : null}</span>
                </p>
              ) : (
                <Checkbox checked={c.done} onCheckedChange={(v) => run(toggleCheck(d, c.id, v, actor.id, nowIso()))} label={renderFact(t, c.label)} />
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card title={t("handoff.ack.title")} data-testid="handoff-ack">
        {error ? <p role="alert" className="mb-2 rounded-[var(--ws-radius-md)] border border-ws-danger bg-ws-danger-soft px-3 py-2 text-[length:var(--ws-text-body-sm)] text-ws-danger-ink">{error}</p> : null}
        {d.refusal && d.status === "RECUSADO" ? (
          <p className="mb-2 text-[length:var(--ws-text-body-sm)]" data-testid="handoff-refusal">{t("handoff.ack.refused", { name: nameOf(d.refusal.successorId), reason: d.refusal.reason })}</p>
        ) : null}
        {d.status === "GERADO" || d.status === "RECUSADO" ? (
          <div className="grid gap-2">
            <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t(manage ? "handoff.ack.beforeSend" : "handoff.ack.waitingManager")}</p>
            {manage ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => run(sendToSuccessors(d, actor.id, nowIso()), t("handoff.ack.sent"))} data-testid="handoff-send">{t("handoff.ack.send")}</Button>
                <Button variant="danger" onClick={() => setCancelOpen(true)}>{t("handoff.cancel.open")}</Button>
              </div>
            ) : null}
          </div>
        ) : null}
        {d.status === "AGUARDANDO_SUCESSOR" || d.status === "TRANSFERIDO" ? (
          <ul className="grid gap-2">
            {successors.map((s) => {
              const ack = d.acknowledgments.find((a) => a.successorId === s);
              const mine = s === actor.id;
              const simulate = !mine && session === "lab";
              return (
                <li key={s} className="flex flex-wrap items-center gap-2 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 px-3 py-2" data-successor={s}>
                  <span className="min-w-0 flex-1 font-semibold">{nameOf(s)}</span>
                  <Tag tone={ack ? "success" : "warning"}><span aria-hidden>{ack ? "✓" : "…"}</span>{ack ? t("handoff.ack.done", { when: fmtDateTime(ack.at) }) : t("handoff.ack.pending")}</Tag>
                  {!ack && d.status === "AGUARDANDO_SUCESSOR" && (mine || simulate) ? (
                    <>
                      <Button size="sm" variant="primary" onClick={() => run(acknowledge(d, s, nowIso()), t("handoff.ack.registered", { name: nameOf(s) }))} data-testid={`handoff-ack-${s}`}>
                        {t(mine ? "handoff.ack.give" : "handoff.ack.simulate", { name: nameOf(s) })}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setRefuseFor(s); setRefuseReason(""); }}>{t(mine ? "handoff.ack.refuse" : "handoff.ack.simulateRefuse", { name: nameOf(s) })}</Button>
                    </>
                  ) : null}
                </li>
              );
            })}
            {d.status === "AGUARDANDO_SUCESSOR" && manage ? <li><Button size="sm" variant="danger" onClick={() => setCancelOpen(true)}>{t("handoff.cancel.open")}</Button></li> : null}
          </ul>
        ) : null}
        {d.status === "TRANSFERIDO" ? <p className="mt-2 text-[length:var(--ws-text-body-sm)]" data-testid="handoff-transferred">{t("handoff.ack.transferred")}</p> : null}
        {d.status === "CANCELADO" && d.cancellation ? <p className="text-[length:var(--ws-text-body-sm)]">{t("handoff.cancelled", { reason: d.cancellation.reason })}</p> : null}
        <p className="mt-2 text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("handoff.ack.note")}</p>
      </Card>

      <Card title={t("handoff.exportCard.title")}>
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("handoff.exportCard.hint")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => saveFile(toMarkdown(d, ctx), "text/markdown;charset=utf-8", exportFileName(d, "md"))} data-testid="handoff-export-md">{t("handoff.exportCard.markdown")}</Button>
          <Button size="sm" onClick={() => saveFile(toJson(d, HANDOFF_PEOPLE), "application/json", exportFileName(d, "json"))} data-testid="handoff-export-json">{t("handoff.exportCard.json")}</Button>
          <Button size="sm" variant="secondary" onClick={printVersion} data-testid="handoff-print">{t("handoff.exportCard.print")}</Button>
        </div>
      </Card>

      <details className="rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 px-3 py-2 text-[length:var(--ws-text-body-sm)]">
        <summary className="cursor-pointer select-none font-semibold">{t("handoff.history.title", { n: d.history.length })}</summary>
        <ol className="mt-2 grid gap-1">
          {d.history.map((e, i) => (
            <li key={i} className="text-ws-text-muted">{fmtDateTime(e.at)} · {t(`handoff.history.${e.kind}`, { name: e.actorId === d.requestedById ? d.requestedByName : nameOf(e.actorId) })}</li>
          ))}
        </ol>
      </details>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen} title={t("handoff.cancel.title")} description={t("handoff.cancel.description")}>
        <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); if (run(cancel(d, cancelReason, actor.id, nowIso()), t("handoff.cancel.done"))) setCancelOpen(false); }}>
          <Field label={t("handoff.cancel.reason")} required>
            {({ id }) => <Textarea id={id} rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} maxLength={500} />}
          </Field>
          {error ? <p role="alert" className="text-[length:var(--ws-text-caption)] text-ws-danger-ink">{error}</p> : null}
          <div className="flex gap-2"><Button type="submit" variant="danger">{t("handoff.cancel.confirm")}</Button><Button variant="ghost" onClick={() => setCancelOpen(false)}>{t("common.close")}</Button></div>
        </form>
      </Dialog>

      <Dialog open={refuseFor !== null} onOpenChange={(o) => { if (!o) setRefuseFor(null); }} title={t("handoff.refuse.title", { name: nameOf(refuseFor) })} description={t("handoff.refuse.description")}>
        <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); if (refuseFor && run(refuse(d, refuseFor, refuseReason, nowIso()), t("handoff.refuse.done"))) setRefuseFor(null); }}>
          <Field label={t("handoff.refuse.reason")} required>
            {({ id }) => <Textarea id={id} rows={3} value={refuseReason} onChange={(e) => setRefuseReason(e.target.value)} maxLength={500} />}
          </Field>
          {error ? <p role="alert" className="text-[length:var(--ws-text-caption)] text-ws-danger-ink">{error}</p> : null}
          <div className="flex gap-2"><Button type="submit" variant="danger">{t("handoff.refuse.confirm")}</Button><Button variant="ghost" onClick={() => setRefuseFor(null)}>{t("common.close")}</Button></div>
        </form>
      </Dialog>
    </section>
  );
}

function ItemRow({ item, editable, candidates, nameOf, onSuccessor, onNote }: {
  item: HandoffItem; editable: boolean; candidates: { id: string; name: string }[]; nameOf: (id: string | null) => string;
  onSuccessor: (id: string | null) => void; onNote: (note: string) => void;
}) {
  const { t } = useI18n();
  const title = itemTitle(t, item);
  return (
    <li className="grid gap-1.5 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 px-3 py-2" data-item={item.id} data-pendency={item.pendency ?? ""}>
      <div className="flex flex-wrap items-center gap-1.5">
        {item.href ? <Link href={item.href} className="min-w-0 flex-1 font-semibold">{title}</Link> : <span className="min-w-0 flex-1 font-semibold">{title}</span>}
        {item.restricted ? <Tag tone="danger"><span aria-hidden>🔒</span>{t("handoff.item.restricted")}</Tag> : null}
        {item.pendency ? <Tag tone={PENDENCY_TONE[item.pendency]}><span aria-hidden>⚠</span>{t(`handoff.pendency.${item.pendency}`)}</Tag> : null}
        <Badge tone={item.source === "API" ? "success" : item.source === "MEMORIA" ? "info" : "neutral"} title={t(`handoff.sourceHint.${item.source}`)}>{t(`handoff.source.${item.source}`)}</Badge>
      </div>
      {item.facts.length ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{item.facts.map((f) => renderFact(t, f)).join(" · ")}</p> : null}
      {item.citation ? (
        <blockquote className="border-l-4 border-ws-info pl-2 text-[length:var(--ws-text-caption)]">
          “{item.citation.text}” <span className="text-ws-text-muted">— {item.citation.ref}</span>
        </blockquote>
      ) : null}
      {item.transferable ? (
        editable ? (
          <div className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
            <Select aria-label={t("handoff.item.successorFor", { item: title })} value={item.successorId ?? ""} onChange={(e) => onSuccessor(e.target.value || null)}
              options={[{ value: "", label: t("handoff.noSuccessor") }, ...candidates.map((p) => ({ value: p.id, label: p.name }))]} />
            <Input aria-label={t("handoff.item.noteFor", { item: title })} placeholder={t("handoff.item.notePh")} value={item.note} maxLength={500} onChange={(e) => onNote(e.target.value)} />
          </div>
        ) : (
          <p className="text-[length:var(--ws-text-caption)]">
            <span className="font-semibold">{t("handoff.export.successor")}:</span> {nameOf(item.successorId)}
            {item.note ? <span className="text-ws-text-muted"> · {item.note}</span> : null}
          </p>
        )
      ) : null}
    </li>
  );
}
