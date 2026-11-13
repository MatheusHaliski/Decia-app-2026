"use client";
/**
 * Passo 2 do Autopiloto (RF30.CA01; D-12): o que o sistema leu da demanda — remetente, assunto, objetivo, nº do ofício, prazo,
 * valores, entregas, partes interessadas, restrições, riscos e o tipo da demanda — editável, cada item com o trecho de origem
 * realçado no texto ao lado. "✦" marca o que é proposta (regras determinísticas sobre o texto); o que a pessoa muda vira "✎".
 */
import { useState, type ReactNode } from "react";
import { Button, Field, Input, Select, Tag } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { relativeDeadline } from "@/lib/projects/autopilot/dates";
import {
  DELIVERABLE_TYPES, DEMAND_KINDS, deliverableTypeOf, type DeadlineFact, type DemandFacts, type DeliverableType, type Fact, type StakeholderRole,
} from "@/lib/projects/autopilot/extract";
import type { Span } from "@/lib/projects/autopilot/text";
import { fmt } from "../shared";
import { ProposalMark } from "./marks";
import { SourceText } from "./SourceText";

type ScalarKey = "subject" | "objective" | "sender" | "signatory" | "recipient" | "reference";
const SCALARS: readonly ScalarKey[] = ["subject", "objective", "sender", "signatory", "recipient", "reference"];
const ROLES: readonly StakeholderRole[] = ["DEMANDANTE", "DESTINATARIO", "CONTROLE", "PUBLICO", "OUTRO"];

export function FactsEditor({ facts, onChange }: { facts: DemandFacts; onChange: (f: DemandFacts) => void }) {
  const { t, intl } = useI18n();
  const [highlight, setHighlight] = useState<Span | null>(null);
  const show = (span?: Span) => setHighlight(span ?? null);
  const nextId = (prefix: string, items: readonly { id: string }[]) => `${prefix}${Math.max(0, ...items.map((x) => Number(x.id.replace(/\D/g, "")) || 0)) + 1}`;

  const setScalar = (key: ScalarKey, value: string) => {
    const prev = facts[key];
    onChange({ ...facts, [key]: value.trim() || prev ? ({ value, span: prev?.span, edited: true } satisfies Fact<string>) : undefined });
  };
  const setReferenceDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    const d = facts.deadline;
    // prazo relativo ("60 dias úteis") é refeito a partir da nova data do documento
    const deadline: DeadlineFact | undefined = d && !d.edited && d.amount && d.kind !== "DATA" && d.kind !== "MES" ? { ...d, from: value, date: relativeDeadline(d.kind, d.amount, value) } : d;
    onChange({ ...facts, referenceDate: { ...facts.referenceDate, value, edited: true }, deadline });
  };
  const setDeadline = (value: string | null) => {
    if (value !== null && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    onChange({ ...facts, deadline: value ? { date: value, kind: "DATA", span: facts.deadline?.span, edited: true } : undefined });
  };
  const deadlineHint = (d: DeadlineFact) =>
    d.edited ? t("autopilot.facts.deadlineEdited")
    : d.kind === "DATA" || d.kind === "MES" ? t(`autopilot.facts.deadlineKind.${d.kind}`)
    : t(`autopilot.facts.deadlineKind.${d.kind}`, { n: d.amount ?? 0, from: fmt.date(intl, d.from) });

  const showButton = (span: Span | undefined, field: string) =>
    span ? <Button size="sm" variant="ghost" aria-label={t("autopilot.facts.showSourceOf", { field })} onClick={() => show(span)}>{t("autopilot.facts.showSource")}</Button> : null;

  return (
    <div className="grid gap-[var(--ws-space-4)] lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <div className="grid content-start gap-[var(--ws-space-4)]" data-facts>
        <p className="flex items-start gap-2 rounded-[var(--ws-radius-md)] border border-ws-ai-spark bg-ws-ai-spark-soft px-3 py-2 text-[length:var(--ws-text-body-sm)] text-ws-text">
          <ProposalMark />
          <span>{t("autopilot.facts.intro")}</span>
        </p>

        <Section title={t("autopilot.facts.identification")}>
          {SCALARS.map((key) => {
            const fact = facts[key];
            const label = t(`autopilot.facts.${key}`);
            return (
              <Field key={key} label={<LabelWithMark label={label} fact={fact} />}>
                {({ id }) => (
                  <div className="flex gap-2">
                    <Input id={id} value={fact?.value ?? ""} placeholder={t("autopilot.facts.notFound")} onChange={(e) => setScalar(key, e.target.value)} data-fact={key} />
                    {showButton(fact?.span, label)}
                  </div>
                )}
              </Field>
            );
          })}
          <Field label={<LabelWithMark label={t("autopilot.facts.referenceDate")} fact={facts.referenceDate} />} hint={facts.referenceDate.span || facts.referenceDate.edited ? t("autopilot.facts.referenceDateHint") : t("autopilot.facts.referenceDateToday")}>
            {({ id, describedBy }) => (
              <div className="flex gap-2">
                <Input id={id} aria-describedby={describedBy} type="date" value={facts.referenceDate.value} onChange={(e) => setReferenceDate(e.target.value)} className="w-48" />
                {showButton(facts.referenceDate.span, t("autopilot.facts.referenceDate"))}
              </div>
            )}
          </Field>
        </Section>

        <Section title={t("autopilot.facts.deadline")}>
          <Field label={<LabelWithMark label={t("autopilot.facts.deadlineLabel")} fact={facts.deadline ? { value: facts.deadline.date, span: facts.deadline.span, edited: facts.deadline.edited } : undefined} />} hint={facts.deadline ? deadlineHint(facts.deadline) : t("autopilot.facts.deadlineNone")}>
            {({ id, describedBy }) => (
              <div className="flex flex-wrap gap-2">
                <Input id={id} aria-describedby={describedBy} type="date" value={facts.deadline?.date ?? ""} onChange={(e) => setDeadline(e.target.value || null)} className="w-48" data-fact="deadline" />
                {showButton(facts.deadline?.span, t("autopilot.facts.deadlineLabel"))}
                {facts.deadline ? <Button size="sm" variant="ghost" onClick={() => setDeadline(null)}>{t("autopilot.facts.deadlineClear")}</Button> : null}
              </div>
            )}
          </Field>
        </Section>

        <Section title={t("autopilot.facts.kind")}>
          <Field label={<LabelWithMark label={t("autopilot.facts.kindLabel")} fact={{ value: facts.kind.value, edited: facts.kind.edited, span: facts.kind.evidence[0] }} />} hint={t("autopilot.facts.kindHint")}>
            {({ id, describedBy }) => (
              <Select id={id} aria-describedby={describedBy} value={facts.kind.value} onChange={(e) => onChange({ ...facts, kind: { ...facts.kind, value: e.target.value as DemandFacts["kind"]["value"], edited: true } })}
                options={DEMAND_KINDS.map((k) => ({ value: k, label: t(`autopilot.kind.${k}`) }))} className="w-72" data-fact="kind" />
            )}
          </Field>
          {facts.kind.evidence.length && !facts.kind.edited ? (
            <p className="flex flex-wrap items-center gap-1.5 text-[length:var(--ws-text-caption)] text-ws-text-muted">
              <span>{t("autopilot.facts.kindWhy")}</span>
              {facts.kind.evidence.map((e, i) => (
                <Button key={i} size="sm" variant="ghost" className="min-h-0 px-2 py-0.5" onClick={() => show(e)} aria-label={t("autopilot.facts.showSourceOf", { field: facts.text.slice(e.start, e.end) })}>
                  {facts.text.slice(e.start, e.end)}
                </Button>
              ))}
            </p>
          ) : null}
        </Section>

        <Section title={t("autopilot.facts.deliverables")} count={facts.deliverables.length}>
          {facts.deliverables.length ? (
            <ol className="grid gap-2">
              {facts.deliverables.map((d, i) => (
                <li key={d.id} className="grid gap-1.5 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-2" data-deliverable={d.id}>
                  <div className="flex items-center gap-2">
                    <ProposalMark edited={d.edited} />
                    <Input aria-label={t("autopilot.facts.deliverableText", { n: i + 1 })} value={d.text}
                      onChange={(e) => onChange({ ...facts, deliverables: facts.deliverables.map((x) => (x.id === d.id ? { ...x, text: e.target.value, edited: true } : x)) })} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select aria-label={t("autopilot.facts.deliverableType", { n: i + 1 })} value={d.type} className="min-h-[var(--ws-control-sm)] w-56"
                      onChange={(e) => onChange({ ...facts, deliverables: facts.deliverables.map((x) => (x.id === d.id ? { ...x, type: e.target.value as DeliverableType, edited: true } : x)) })}
                      options={DELIVERABLE_TYPES.map((x) => ({ value: x, label: t(`autopilot.dtype.${x}`) }))} />
                    {d.due ? <Tag tone="warning">{t("autopilot.facts.due", { date: fmt.date(intl, d.due) })}</Tag> : null}
                    {showButton(d.span, d.text)}
                    <Button size="sm" variant="ghost" aria-label={t("pm.ui.removeItem", { item: d.text })} onClick={() => onChange({ ...facts, deliverables: facts.deliverables.filter((x) => x.id !== d.id) })}>×</Button>
                  </div>
                </li>
              ))}
            </ol>
          ) : <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("autopilot.facts.deliverablesEmpty")}</p>}
          <AddForm label={t("autopilot.facts.addDeliverable")} onAdd={(text) => onChange({ ...facts, deliverables: [...facts.deliverables, { id: nextId("d", facts.deliverables), text, type: deliverableTypeOf(text), edited: true }] })} />
        </Section>

        <Section title={t("autopilot.facts.stakeholders")} count={facts.stakeholders.length}>
          {facts.stakeholders.length ? (
            <ul className="grid gap-1.5">
              {facts.stakeholders.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-2" data-stakeholder={s.id}>
                  <ProposalMark edited={s.edited} />
                  <Input aria-label={t("autopilot.facts.stakeholderName")} value={s.name} className="min-w-0 flex-1 basis-48"
                    onChange={(e) => onChange({ ...facts, stakeholders: facts.stakeholders.map((x) => (x.id === s.id ? { ...x, name: e.target.value, edited: true } : x)) })} />
                  <Select aria-label={t("autopilot.facts.stakeholderRole", { name: s.name })} value={s.role} className="min-h-[var(--ws-control-sm)] w-48"
                    onChange={(e) => onChange({ ...facts, stakeholders: facts.stakeholders.map((x) => (x.id === s.id ? { ...x, role: e.target.value as StakeholderRole, edited: true } : x)) })}
                    options={ROLES.map((r) => ({ value: r, label: t(`autopilot.stkRole.${r}`) }))} />
                  {showButton(s.span, s.name)}
                  <Button size="sm" variant="ghost" aria-label={t("pm.ui.removeItem", { item: s.name })} onClick={() => onChange({ ...facts, stakeholders: facts.stakeholders.filter((x) => x.id !== s.id) })}>×</Button>
                </li>
              ))}
            </ul>
          ) : <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("autopilot.facts.empty")}</p>}
          <AddForm label={t("autopilot.facts.addStakeholder")} onAdd={(name) => onChange({ ...facts, stakeholders: [...facts.stakeholders, { id: nextId("s", facts.stakeholders), name, role: "OUTRO", edited: true }] })} />
        </Section>

        <Section title={t("autopilot.facts.amounts")} count={facts.amounts.length}>
          <List items={facts.amounts.map((a) => ({ id: a.id, edited: a.edited, span: a.span, text: `${fmt.money(intl, a.value)} — ${a.label}`, remove: () => onChange({ ...facts, amounts: facts.amounts.filter((x) => x.id !== a.id) }) }))} onShow={show} />
        </Section>

        <Section title={t("autopilot.facts.constraints")} count={facts.constraints.length}>
          <List items={facts.constraints.map((c) => ({ id: c.id, edited: c.edited, span: c.span, text: c.text, remove: () => onChange({ ...facts, constraints: facts.constraints.filter((x) => x.id !== c.id) }) }))} onShow={show} />
          <AddForm label={t("autopilot.facts.addConstraint")} onAdd={(text) => onChange({ ...facts, constraints: [...facts.constraints, { id: nextId("c", facts.constraints), text, edited: true }] })} />
        </Section>

        <Section title={t("autopilot.facts.risks")} count={facts.risks.length}>
          <List items={facts.risks.map((r) => ({
            id: r.id, edited: r.edited, span: r.span, text: r.title,
            detail: t("autopilot.facts.riskLine", { p: fmt.percent(intl, r.probability), i: r.impactLevel }),
            remove: () => onChange({ ...facts, risks: facts.risks.filter((x) => x.id !== r.id) }),
          }))} onShow={show} />
        </Section>
      </div>
      <SourceText text={facts.text} highlight={highlight} onClear={() => setHighlight(null)} />
    </div>
  );
}

function LabelWithMark({ label, fact }: { label: string; fact?: { edited?: boolean } }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {fact ? <ProposalMark edited={fact.edited} /> : null}
      {label}
    </span>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="grid gap-2 rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-0 p-[var(--ws-space-3)]">
      <h3 className="flex items-center gap-2 font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-body)] font-semibold">
        {title}
        {count !== undefined ? <Tag>{count}</Tag> : null}
      </h3>
      {children}
    </section>
  );
}

function List({ items, onShow }: { items: { id: string; text: string; detail?: string; edited?: boolean; span?: Span; remove: () => void }[]; onShow: (s?: Span) => void }) {
  const { t } = useI18n();
  if (!items.length) return <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("autopilot.facts.empty")}</p>;
  return (
    <ul className="grid gap-1.5">
      {items.map((it) => (
        <li key={it.id} className="flex flex-wrap items-start gap-2 text-[length:var(--ws-text-body-sm)]">
          <ProposalMark edited={it.edited} className="mt-0.5" />
          <span className="min-w-0 flex-1 basis-56 break-words">
            {it.text}
            {it.detail ? <span className="block text-[length:var(--ws-text-caption)] text-ws-text-muted">{it.detail}</span> : null}
          </span>
          {it.span ? <Button size="sm" variant="ghost" aria-label={t("autopilot.facts.showSourceOf", { field: it.text.slice(0, 60) })} onClick={() => onShow(it.span)}>{t("autopilot.facts.showSource")}</Button> : null}
          <Button size="sm" variant="ghost" aria-label={t("pm.ui.removeItem", { item: it.text.slice(0, 60) })} onClick={it.remove}>×</Button>
        </li>
      ))}
    </ul>
  );
}

function AddForm({ label, onAdd }: { label: string; onAdd: (text: string) => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  return (
    <form className="flex gap-2" onSubmit={(e) => {
      e.preventDefault();
      const text = draft.replace(/\s+/g, " ").trim();
      if (!text) return;
      onAdd(text);
      setDraft("");
    }}>
      <Input aria-label={label} placeholder={label} value={draft} onChange={(e) => setDraft(e.target.value)} />
      <Button type="submit" size="sm" disabled={!draft.trim()}>{t("pm.ui.add")}</Button>
    </form>
  );
}
