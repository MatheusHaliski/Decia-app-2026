"use client";
/**
 * Ata Viva na sessão (RF37): reuniões, nova reunião (colar transcrição, enviar .txt/.vtt/.srt ou gravar no navegador com
 * consentimento), compilação ✦, revisão, ratificação, ratificar/contestar em 48 h e os encaminhamentos gerados — cada um com
 * "Criar no Acervo" (rascunho entregue ao criador de tarefas, lib/tasks/drafts) e "Marcar como cumprido".
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Card, Checkbox, Dialog, EmptyState, Field, Input, RadioCards, Tag, Textarea, useToast, type Tone } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { draftHref, saveTaskDraft } from "@/lib/tasks/drafts";
import { acceptsMeetings } from "@/lib/decia/session/machine";
import { allowedSources, canRecord, followUpTaskDraft, minutesTaskDraft, missingConsents } from "@/lib/decia/session/meeting";
import { todayLocal } from "@/lib/decia/session/dates";
import { can } from "@/lib/decia/session/roles";
import { ACCEPTED_EXTENSIONS, checkTranscriptFile } from "@/lib/decia/session/transcript";
import { MEETING_SOURCES, type FollowUpTask, type Meeting, type MeetingSource, type MeetingStatus } from "@/lib/decia/session/types";
import { formatDateOnly, formatWhen, personName, useDenial, useMinutesTextLabels, useSessionCtx } from "./context";
import { MinutesReview } from "./MinutesReview";
import { PointsLine } from "./PointsLine";
import { Recorder } from "./Recorder";

const STATUS_TONE: Record<MeetingStatus, Tone> = { GRAVANDO: "warning", TRANSCREVENDO: "info", ATA_PROPOSTA: "spark", CONFIRMADA: "success", CONTESTADA: "danger" };

export function MeetingStatusTag({ status }: { status: MeetingStatus }) {
  const { t } = useI18n();
  return <Tag tone={STATUS_TONE[status]}>{t(`ata.status.${status}`)}</Tag>;
}

function NewMeetingDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const { t } = useI18n();
  const { session, repo, me, people } = useSessionCtx();
  const denial = useDenial();
  const allowed = allowedSources(session.accessClass);
  const [title, setTitle] = useState("");
  const [baseDate, setBaseDate] = useState(() => todayLocal(new Date()));
  const [source, setSource] = useState<MeetingSource>("TRANSCRICAO_COLADA");
  const [present, setPresent] = useState<string[]>(() => session.participants.map((p) => p.userId));
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    const r = repo.startMeeting(session.id, me, { title, baseDate, source, participantIds: present });
    if (!r.ok) {
      setError(denial(r.reason));
      return;
    }
    setError(null);
    setTitle("");
    onCreated(r.meetingId);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("ata.new.title")} description={t("ata.new.description")} className="w-[min(94vw,40rem)]">
      <form className="grid gap-[var(--ws-space-3)]" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Field label={t("ata.new.meetingTitle")} required>
          {({ id }) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("ata.new.meetingTitlePlaceholder")} />}
        </Field>
        <Field label={t("ata.new.baseDate")} hint={t("ata.new.baseDateHint")}>
          {({ id, describedBy }) => <Input id={id} type="date" aria-describedby={describedBy} value={baseDate} onChange={(e) => setBaseDate(e.target.value)} />}
        </Field>
        <RadioCards
          label={t("ata.new.source")}
          value={source}
          onValueChange={(v) => setSource(v as MeetingSource)}
          columns={1}
          options={MEETING_SOURCES.map((s) => ({
            value: s,
            label: t(`ata.source.${s}`),
            hint: allowed.includes(s) ? t(`ata.source.${s}Hint`) : t("ata.source.blockedByClass", { access: session.accessClass }),
            disabled: !allowed.includes(s),
          }))}
        />
        <fieldset className="grid gap-1">
          <legend className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("ata.new.present")}</legend>
          {session.participants.map((p) => (
            <Checkbox key={p.userId} label={personName(people, p.userId)} checked={present.includes(p.userId)} disabled={p.userId === me} onCheckedChange={(v) => setPresent((cur) => (v ? [...cur, p.userId] : cur.filter((x) => x !== p.userId)))} />
          ))}
        </fieldset>
        {error ? <p role="alert" className="text-[length:var(--ws-text-body-sm)] text-ws-danger-ink">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button variant="primary" type="submit" disabled={!title.trim()}>{t("ata.new.create")}</Button>
        </div>
      </form>
    </Dialog>
  );
}

async function readText(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function TranscriptInput({ meeting }: { meeting: Meeting }) {
  const { t } = useI18n();
  const { session, repo, me, people } = useSessionCtx();
  const denial = useDenial();
  const [text, setText] = useState(meeting.transcript);
  const [fileName, setFileName] = useState<string | null>(meeting.fileName);
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recording = meeting.source === "GRAVACAO_NAVEGADOR";
  const missing = missingConsents(meeting);
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const content = await readText(file);
    const problem = checkTranscriptFile(file.name, file.size, content);
    if (problem) {
      setFileError(t(`ata.file.${problem}`, { max: "1 MB" }));
      return;
    }
    setFileError(null);
    setFileName(file.name);
    setText(content);
  };
  const compile = () => {
    const r = repo.compileMeeting(session.id, me, meeting.id, text, fileName);
    setError(r.ok ? null : denial(r.reason));
  };
  return (
    <div className="grid gap-[var(--ws-space-3)]">
      {recording ? (
        <section className="grid gap-2" aria-label={t("ata.consent.title")}>
          <h4 className="text-[length:var(--ws-text-body)] font-semibold">{t("ata.consent.title")}</h4>
          <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("ata.consent.intro")}</p>
          {meeting.participantIds.map((u) => (
            <Checkbox
              key={u}
              label={t("ata.consent.person", { name: personName(people, u) })}
              checked={meeting.consents.includes(u)}
              onCheckedChange={(v) => { const r = repo.setConsent(session.id, me, meeting.id, u, v); if (!r.ok) setError(denial(r.reason)); }}
            />
          ))}
          <p aria-live="polite" className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{missing.length ? t("ata.consent.missing", { n: missing.length }) : t("ata.consent.ok")}</p>
          <Recorder
            speakers={meeting.participantIds.map((u) => ({ userId: u, name: personName(people, u) }))}
            defaultSpeaker={me}
            consentOk={canRecord(meeting)}
            onLine={(line) => setText((cur) => (cur ? `${cur}\n${line}` : line))}
          />
        </section>
      ) : null}
      {meeting.source === "ARQUIVO" || meeting.source === "TRANSCRICAO_COLADA" ? (
        <Field label={t("ata.file.label")} hint={t("ata.file.hint", { ext: ACCEPTED_EXTENSIONS.join(", ") })} error={fileError ?? undefined}>
          {({ id, describedBy, invalid }) => <Input id={id} type="file" accept=".txt,.vtt,.srt,text/plain,text/vtt" aria-describedby={describedBy} invalid={invalid} onChange={(e) => void onFile(e.target.files?.[0])} />}
        </Field>
      ) : null}
      <Field label={t("ata.transcript.label")} hint={fileName ? t("ata.transcript.fromFile", { name: fileName }) : t("ata.transcript.hint")}>
        {({ id, describedBy }) => <Textarea id={id} aria-describedby={describedBy} className="min-h-48 font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-body-sm)]" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("ata.transcript.placeholder")} />}
      </Field>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("ata.transcript.privacy")}</p>
      {error ? <p role="alert" className="text-[length:var(--ws-text-body-sm)] text-ws-danger-ink">{error}</p> : null}
      <Button variant="spark" className="w-fit" onClick={compile} disabled={!text.trim() || (recording && missing.length > 0)} data-testid="compile">✦ {t("ata.compile")}</Button>
    </div>
  );
}

function MeetingSummary({ meeting }: { meeting: Meeting }) {
  const { t, intl } = useI18n();
  const { session, repo, me, people, now } = useSessionCtx();
  const router = useRouter();
  const denial = useDenial();
  const labels = useMinutesTextLabels();
  const { toast } = useToast();
  const [contesting, setContesting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isParticipant = meeting.participantIds.includes(me);
  const ratified = meeting.ratifications.some((r) => r.userId === me);
  const open = meeting.status === "CONFIRMADA" && !!meeting.ratificationDeadlineAt && now.getTime() <= Date.parse(meeting.ratificationDeadlineAt);
  const organizer = me === meeting.organizerId || can(session, me, "MUDAR_ESTADO");
  const mine = meeting.ratifications.find((r) => r.userId === me);
  const ratify = () => {
    const r = repo.ratifyAsParticipant(session.id, me, meeting.id);
    if (!r.ok) setError(denial(r.reason));
  };
  const contest = () => {
    const r = repo.contestMeeting(session.id, me, meeting.id, reason);
    if (!r.ok) {
      setError(denial(r.reason));
      return;
    }
    setContesting(false);
    setReason("");
  };
  const toAcervo = () => {
    const id = saveTaskDraft({ draft: minutesTaskDraft(session, meeting, people, labels), origin: { kind: "ATA", label: t("ata.draft.origin", { meeting: meeting.title }), ref: meeting.id } });
    toast({ title: t("ata.draft.saved"), tone: "info" });
    router.push(draftHref(id));
  };
  return (
    <div className="grid gap-[var(--ws-space-3)]" data-testid="meeting-summary">
      <p className="text-[length:var(--ws-text-body-sm)]">
        {t("ata.summary.ratifiedBy", { name: personName(people, meeting.ratifiedBy), when: meeting.ratifiedAt ? formatWhen(meeting.ratifiedAt, intl) : "—", version: meeting.version })}
      </p>
      <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted" aria-live="polite">
        {t("ata.summary.ratifications", { n: meeting.ratifications.length, total: meeting.participantIds.length, names: meeting.ratifications.map((r) => personName(people, r.userId)).join(", ") })}
        {" · "}
        {meeting.ratificationDeadlineAt ? t(open ? "ata.summary.deadlineOpen" : "ata.summary.deadlineClosed", { when: formatWhen(meeting.ratificationDeadlineAt, intl) }) : null}
      </p>
      {mine?.points ? <PointsLine note={mine.points} viewerId={me} /> : null}
      {meeting.contests.length ? (
        <ul className="grid gap-1 rounded-[var(--ws-radius-md)] bg-ws-danger-soft p-[var(--ws-space-2)] text-[length:var(--ws-text-body-sm)]">
          {meeting.contests.map((c, i) => <li key={i}><span className="font-semibold">{t("ata.summary.contestBy", { name: personName(people, c.userId) })}</span> {c.reason}</li>)}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {open && isParticipant && !ratified ? <Button size="sm" variant="primary" onClick={ratify}>{t("ata.summary.ratify")}</Button> : null}
        {open && isParticipant ? <Button size="sm" variant="ghost" onClick={() => setContesting((v) => !v)}>{t("ata.summary.contest")}</Button> : null}
        {meeting.status === "CONTESTADA" && organizer ? <Button size="sm" variant="primary" onClick={() => { const r = repo.reopenMinutes(session.id, me, meeting.id); if (!r.ok) setError(denial(r.reason)); }}>{t("ata.summary.correct")}</Button> : null}
        {meeting.draft ? <Button size="sm" variant="default" icon="acervo" onClick={toAcervo}>{t("ata.summary.toAcervo")}</Button> : null}
      </div>
      {contesting ? (
        <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); contest(); }}>
          <Field label={t("ata.summary.contestReason")} hint={t("ata.summary.contestHint")}>
            {({ id, describedBy }) => <Textarea id={id} aria-describedby={describedBy} value={reason} onChange={(e) => setReason(e.target.value)} />}
          </Field>
          <Button size="sm" variant="danger" type="submit" className="w-fit">{t("ata.summary.contestSend")}</Button>
        </form>
      ) : null}
      {error ? <p role="alert" className="text-[length:var(--ws-text-body-sm)] text-ws-danger-ink">{error}</p> : null}
    </div>
  );
}

function MeetingCard({ meeting, expanded, onToggle }: { meeting: Meeting; expanded: boolean; onToggle: () => void }) {
  const { t, intl } = useI18n();
  const { people } = useSessionCtx();
  return (
    <Card as="li" padding="md" className="grid gap-[var(--ws-space-3)]" data-testid="meeting">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 text-[length:var(--ws-text-body)] font-semibold">{meeting.title}</h3>
        <MeetingStatusTag status={meeting.status} />
        <Badge tone="neutral">{t(`ata.source.${meeting.source}`)}</Badge>
        <Button size="sm" variant="ghost" aria-expanded={expanded} onClick={onToggle}>{expanded ? t("ata.close") : t("ata.open")}</Button>
      </div>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
        {t("ata.meta", { date: formatDateOnly(meeting.baseDate, intl), organizer: personName(people, meeting.organizerId), n: meeting.participantIds.length })}
      </p>
      {expanded ? (
        meeting.status === "ATA_PROPOSTA" && meeting.draft ? <MinutesReview meeting={meeting} />
          : meeting.status === "CONFIRMADA" || meeting.status === "CONTESTADA" ? <MeetingSummary meeting={meeting} />
            : <TranscriptInput meeting={meeting} />
      ) : null}
    </Card>
  );
}

function dueText(f: FollowUpTask, today: string, t: (k: string, v?: Record<string, string | number>) => string): string {
  if (f.status === "CUMPRIDO") return t("ata.followUps.done");
  const days = Math.round((Date.parse(`${f.dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (days < 0) return t("ata.followUps.overdue", { n: -days });
  if (days === 0) return t("ata.followUps.today");
  return t("ata.followUps.inDays", { n: days });
}

export function FollowUpList() {
  const { t, intl } = useI18n();
  const { session, repo, me, people, now } = useSessionCtx();
  const router = useRouter();
  const denial = useDenial();
  const labels = useMinutesTextLabels();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const today = todayLocal(now);
  if (!session.followUps.length) return <EmptyState compact title={t("ata.followUps.empty")} description={t("ata.followUps.emptyHint")} />;
  const owner = can(session, me, "MUDAR_ESTADO");
  const toAcervo = (f: FollowUpTask) => {
    const meeting = session.meetings.find((m) => m.id === f.meetingId);
    const id = saveTaskDraft({ draft: followUpTaskDraft(session, f, meeting?.title ?? "", labels), origin: { kind: "ATA", label: t("ata.draft.origin", { meeting: meeting?.title ?? "" }), ref: f.meetingId } });
    toast({ title: t("ata.draft.saved"), tone: "info" });
    router.push(draftHref(id));
  };
  return (
    <div className="grid gap-2">
      <ul className="grid gap-2" aria-label={t("ata.followUps.title")}>
        {session.followUps.map((f) => (
          <li key={f.id} className="grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)]" data-testid="followup">
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 font-semibold">{f.action}</span>
              <Tag tone={f.status === "CUMPRIDO" ? "success" : "warning"}>{f.status === "CUMPRIDO" ? "✓" : "○"} {t(`ata.followUps.status.${f.status}`)}</Tag>
            </div>
            <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">
              {t("ata.followUps.line", { name: personName(people, f.responsibleId), date: formatDateOnly(f.dueDate, intl), when: dueText(f, today, t) })}
            </p>
            {f.sourceText ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("ata.followUps.source")} <q className="italic">{f.sourceText}</q></p> : null}
            {f.points ? <PointsLine note={f.points} viewerId={me} /> : null}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="default" icon="criar-tarefa" onClick={() => toAcervo(f)}>{t("ata.followUps.toAcervo")}</Button>
              {f.status === "ABERTO" && (f.responsibleId === me || owner) ? (
                <Button size="sm" variant="ghost" onClick={() => { const r = repo.completeFollowUp(session.id, me, f.id); setError(r.ok ? null : denial(r.reason)); }}>{t("ata.followUps.complete")}</Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {error ? <p role="alert" className="text-[length:var(--ws-text-body-sm)] text-ws-danger-ink">{error}</p> : null}
    </div>
  );
}

export interface AtaVivaPanelProps { newOpen: boolean; onNewOpenChange: (open: boolean) => void }

export function AtaVivaPanel({ newOpen, onNewOpenChange }: AtaVivaPanelProps) {
  const { t } = useI18n();
  const { session, me } = useSessionCtx();
  const [expanded, setExpanded] = useState<string | null>(() => session.meetings.find((m) => m.status !== "CONFIRMADA")?.id ?? null);
  const canStart = can(session, me, "NOVA_REUNIAO") && acceptsMeetings(session.status);
  const reason = !acceptsMeetings(session.status) ? t("ata.cannotStartState", { status: t(`session.status.${session.status}`) }) : !can(session, me, "NOVA_REUNIAO") ? t("ata.cannotStartRole") : null;
  return (
    <div className="grid gap-[var(--ws-space-5)]">
      <section aria-labelledby="ata-meetings" className="grid gap-[var(--ws-space-3)]">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="ata-meetings" className="min-w-0 flex-1 font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("ata.title")}</h2>
          <Button variant="primary" size="sm" onClick={() => onNewOpenChange(true)} disabled={!canStart} title={reason ?? undefined} data-testid="new-meeting">+ {t("ata.newMeeting")}</Button>
        </div>
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("ata.intro")}</p>
        {reason ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{reason}</p> : null}
        {session.meetings.length ? (
          <ul className="grid gap-[var(--ws-space-3)]">
            {[...session.meetings].reverse().map((m) => <MeetingCard key={m.id} meeting={m} expanded={expanded === m.id} onToggle={() => setExpanded((cur) => (cur === m.id ? null : m.id))} />)}
          </ul>
        ) : <EmptyState compact title={t("ata.empty")} description={t("ata.emptyHint")} />}
      </section>
      <section aria-labelledby="ata-followups" className="grid gap-[var(--ws-space-3)]">
        <h2 id="ata-followups" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("ata.followUps.title")}</h2>
        <FollowUpList />
      </section>
      <NewMeetingDialog open={newOpen} onOpenChange={onNewOpenChange} onCreated={(id) => { onNewOpenChange(false); setExpanded(id); }} />
    </div>
  );
}
