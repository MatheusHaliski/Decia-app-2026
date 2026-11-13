"use client";
/**
 * Revisão da ata compilada (RF37.CA03): a IA ✦ propôs (por regras, a partir da transcrição); a pessoa edita decisões e pauta,
 * aceita ou recusa cada encaminhamento, escolhe o responsável entre os membros e confere o prazo. "Ratificar ata" só libera
 * quando todo encaminhamento foi decidido e os aceitos têm responsável e prazo (o 422 do RF37 vira aviso por item).
 */
import { Badge, Button, Card, Field, Input, Select, Tag, Textarea, useToast } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { validateMinutes, type FollowUpProblem } from "@/lib/decia/session/meeting";
import type { DueDate, FollowUpDraft, Meeting, MinutesDraft, MinutesItem, SourceSpan } from "@/lib/decia/session/types";
import { formatDateOnly, personName, useDenial, useMinutesTextLabels, useSessionCtx } from "./context";

function SourceQuote({ source }: { source: SourceSpan | null }) {
  const { t } = useI18n();
  if (!source) return <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("ata.review.addedByPerson")}</p>;
  return (
    <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
      <span className="font-semibold">{t("ata.review.source", { line: String(source.line), speaker: source.speaker ?? t("ata.review.noSpeaker") })}</span>{" "}
      <q className="italic">{source.text}</q>
    </p>
  );
}

let localSeq = 0;
const localId = (prefix: string) => `${prefix}-p${Date.now().toString(36)}${(localSeq++).toString(36)}`;

function ItemsEditor({ title, items, onChange, addLabel, removeLabel, itemLabel }: { title: string; items: MinutesItem[]; onChange: (items: MinutesItem[]) => void; addLabel: string; removeLabel: string; itemLabel: (n: number) => string }) {
  return (
    <section className="grid gap-2" aria-label={title}>
      <h4 className="text-[length:var(--ws-text-body)] font-semibold">{title}</h4>
      {items.map((it, i) => (
        <div key={it.id} className="grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-border p-[var(--ws-space-2)]">
          <div className="flex items-start gap-2">
            <Textarea aria-label={itemLabel(i + 1)} className="min-h-12" value={it.text} onChange={(e) => onChange(items.map((x) => (x.id === it.id ? { ...x, text: e.target.value } : x)))} />
            <Button size="sm" variant="ghost" onClick={() => onChange(items.filter((x) => x.id !== it.id))}>{removeLabel}</Button>
          </div>
          <SourceQuote source={it.source} />
        </div>
      ))}
      <Button size="sm" variant="ghost" className="w-fit" onClick={() => onChange([...items, { id: localId("it"), text: "", source: null }])}>+ {addLabel}</Button>
    </section>
  );
}

function FollowUpEditor({ f, n, problems, onChange, baseDate }: { f: FollowUpDraft; n: number; problems: FollowUpProblem[]; onChange: (f: FollowUpDraft) => void; baseDate: string }) {
  const { t, intl } = useI18n();
  const { session, people } = useSessionCtx();
  const members = session.participants.map((p) => ({ value: p.userId, label: personName(people, p.userId) }));
  const responsibleText = f.responsible.status === "CASADO"
    ? t("ata.review.matched", { name: personName(people, f.responsible.userId) })
    : f.responsible.status === "AMBIGUO"
      ? t("ata.review.ambiguous", { names: f.responsible.candidates.map((c) => personName(people, c)).join(", "), raw: f.responsible.raw })
      : f.responsible.raw ? t("ata.review.unmatched", { raw: f.responsible.raw }) : t("ata.toDefine");
  const setDue = (date: string) => onChange({ ...f, due: date ? ({ date, raw: f.due?.raw ?? "", kind: f.due?.kind ?? "ABSOLUTA" } satisfies DueDate) : null });
  const state = f.accepted === null ? t("ata.review.undecided") : f.accepted ? t("ata.review.acceptedState") : t("ata.review.refusedState");
  return (
    <li className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)]" data-testid="followup-editor" aria-label={t("ata.review.followUpN", { n })}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="spark">✦ {t("ata.review.followUpN", { n })}</Badge>
        <Tag tone={f.accepted === null ? "warning" : f.accepted ? "success" : "neutral"}>{f.accepted === null ? "?" : f.accepted ? "✓" : "✕"} {state}</Tag>
      </div>
      <Field label={t("ata.review.action")}>
        {({ id }) => <Input id={id} value={f.action} onChange={(e) => onChange({ ...f, action: e.target.value })} />}
      </Field>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label={t("ata.review.responsible")} hint={responsibleText}>
          {({ id, describedBy }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              value={f.responsible.status === "CASADO" ? f.responsible.userId : ""}
              onChange={(e) => onChange({ ...f, responsible: e.target.value ? { status: "CASADO", userId: e.target.value, raw: f.responsible.raw ?? "" } : { status: "A_DEFINIR", raw: f.responsible.raw } })}
              options={[{ value: "", label: t("ata.toDefine") }, ...members]}
            />
          )}
        </Field>
        <Field label={t("ata.review.due")} hint={f.due?.raw ? t("ata.review.dueRead", { raw: f.due.raw, base: formatDateOnly(baseDate, intl) }) : t("ata.review.dueNone")}>
          {({ id, describedBy }) => <Input id={id} type="date" aria-describedby={describedBy} value={f.due?.date ?? ""} onChange={(e) => setDue(e.target.value)} />}
        </Field>
      </div>
      <SourceQuote source={f.source} />
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("ata.review.decideN", { n })}>
        <Button size="sm" variant={f.accepted === true ? "primary" : "default"} aria-pressed={f.accepted === true} onClick={() => onChange({ ...f, accepted: true })}>{t("ata.review.accept")}</Button>
        <Button size="sm" variant={f.accepted === false ? "danger" : "default"} aria-pressed={f.accepted === false} onClick={() => onChange({ ...f, accepted: false })}>{t("ata.review.refuse")}</Button>
      </div>
      {problems.length ? (
        <ul className="grid gap-0.5 text-[length:var(--ws-text-caption)] font-medium text-ws-danger-ink">
          {problems.map((p) => <li key={p}>! {t(`ata.issue.${p}`)}</li>)}
        </ul>
      ) : null}
    </li>
  );
}

export function MinutesReview({ meeting }: { meeting: Meeting }) {
  const { t, intl } = useI18n();
  const { session, repo, me, people } = useSessionCtx();
  const { toast } = useToast();
  const denial = useDenial();
  const labels = useMinutesTextLabels();
  const draft = meeting.draft!;
  const save = (next: MinutesDraft) => {
    const r = repo.updateDraft(session.id, me, meeting.id, next);
    if (!r.ok) toast({ title: denial(r.reason), tone: "erro" });
  };
  const issues = validateMinutes(draft);
  const problemsOf = (id: string) => issues.filter((i) => i.followUpId === id).map((i) => i.problem);
  const ratify = () => {
    const r = repo.ratifyMeeting(session.id, me, meeting.id, labels);
    if (!r.ok) {
      toast({ title: denial(r.reason), tone: "erro" });
      return;
    }
    toast({ title: t("ata.ratified", { title: meeting.title }), tone: "sucesso" });
  };
  return (
    <Card padding="md" className="grid gap-[var(--ws-space-4)]" data-testid="minutes-review">
      <div className="grid gap-1">
        <h3 className="flex flex-wrap items-center gap-2 font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">
          <span aria-hidden className="text-ws-ai-spark-ink">✦</span>{t("ata.review.title", { title: meeting.title })}
        </h3>
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("ata.review.intro", { date: formatDateOnly(draft.baseDate, intl) })}</p>
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("ata.review.stats", { segments: draft.stats.segments, speakers: draft.stats.speakers, words: draft.stats.words })}</p>
      </div>
      <section className="grid gap-1" aria-label={t("ata.text.participants")}>
        <h4 className="text-[length:var(--ws-text-body)] font-semibold">{t("ata.text.participants")}</h4>
        <p className="text-[length:var(--ws-text-body-sm)]">{draft.participants.length ? draft.participants.map((p) => (p.userId ? personName(people, p.userId) : `${p.name} (${t("ata.review.notMember")})`)).join(" · ") : t("ata.text.none")}</p>
      </section>
      <ItemsEditor title={t("ata.text.agenda")} items={draft.agenda} onChange={(agenda) => save({ ...draft, agenda })} addLabel={t("ata.review.addAgenda")} removeLabel={t("ata.review.remove")} itemLabel={(n) => t("ata.review.agendaN", { n })} />
      <ItemsEditor title={t("ata.text.decisions")} items={draft.decisions} onChange={(decisions) => save({ ...draft, decisions })} addLabel={t("ata.review.addDecision")} removeLabel={t("ata.review.remove")} itemLabel={(n) => t("ata.review.decisionN", { n })} />
      <section className="grid gap-2" aria-label={t("ata.text.followUps")}>
        <h4 className="text-[length:var(--ws-text-body)] font-semibold">{t("ata.text.followUps")}</h4>
        {draft.followUps.length ? (
          <ol className="grid gap-2">
            {draft.followUps.map((f, i) => (
              <FollowUpEditor key={f.id} f={f} n={i + 1} baseDate={draft.baseDate} problems={problemsOf(f.id)} onChange={(nf) => save({ ...draft, followUps: draft.followUps.map((x) => (x.id === f.id ? nf : x)) })} />
            ))}
          </ol>
        ) : <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("ata.review.noFollowUps")}</p>}
        <Button size="sm" variant="ghost" className="w-fit" onClick={() => save({ ...draft, followUps: [...draft.followUps, { id: localId("fu"), action: "", responsible: { status: "A_DEFINIR", raw: null }, due: null, source: null, accepted: true }] })}>+ {t("ata.review.addFollowUp")}</Button>
      </section>
      {draft.pending.length ? (
        <ItemsEditor title={t("ata.text.pending")} items={draft.pending} onChange={(pending) => save({ ...draft, pending })} addLabel={t("ata.review.addPending")} removeLabel={t("ata.review.remove")} itemLabel={(n) => t("ata.review.pendingN", { n })} />
      ) : null}
      {draft.speeches.length ? (
        <details className="rounded-[var(--ws-radius-md)] border border-ws-border p-[var(--ws-space-2)]">
          <summary className="cursor-pointer text-[length:var(--ws-text-body-sm)] font-semibold">{t("ata.review.speeches", { n: draft.speeches.length })}</summary>
          <div className="mt-2 grid gap-2">
            {draft.speeches.map((s) => (
              <div key={s.name} className="grid gap-1">
                <p className="text-[length:var(--ws-text-body-sm)] font-semibold">{s.userId ? personName(people, s.userId) : s.name}</p>
                <ul className="grid gap-0.5 text-[length:var(--ws-text-caption)] text-ws-text-muted">
                  {s.utterances.map((u, i) => <li key={i}>{t("ata.review.lineN", { line: String(u.line) })} {u.text}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </details>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 border-t border-ws-border pt-[var(--ws-space-3)]">
        <Button variant="primary" onClick={ratify} disabled={issues.length > 0} data-testid="ratify">{t("ata.ratify")}</Button>
        <span aria-live="polite" className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">
          {issues.length ? t("ata.review.pendingIssues", { n: issues.length }) : t("ata.review.ready")}
        </span>
      </div>
    </Card>
  );
}
