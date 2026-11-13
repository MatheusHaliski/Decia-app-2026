"use client";
/**
 * Dossiê de Transição de Gestão / Handoff (RF36) — `/handoffs`. Escolher a pessoa (EMPRESA e CHEFE: qualquer pessoa da equipe;
 * EMPREGADO: a própria), o motivo (mudança de setor, saída, fim de gestão, troca de chefia) e a data; o sistema reúne projetos (Mesa,
 * DEMO, só leitura), tarefas (Acervo: API real quando logado, exemplo no laboratório), decisões (DECIA, DEMO, só leitura),
 * pendências, riscos, contatos e fontes de conhecimento (com trechos da Memória Institucional); o plano de transferência ganha
 * sucessor por item, checklist e ciência do sucessor; exporta em Markdown, JSON e versão para impressão.
 * Os dossiês ficam no repositório DEMO da aba (selo DEMO na página): a API do RF36 ainda não existe.
 * Atalho de outras telas: `/handoffs?pessoa=<id>&motivo=<SAIDA|…>` já abre o formulário preenchido; `?dossie=<id>` abre um dossiê.
 */
import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Badge, Button, Card, EmptyState, Field, Input, RadioCards, Select, Switch, Tag, useToast } from "@/components/ui";
import { demoRepository } from "@/lib/decia/repository";
import { actorFor, canGenerate, canView, HANDOFF_PEOPLE, peopleList, SELF_ID, subjectsFor } from "@/lib/handoff/access";
import { collectWithMemory, type HandoffTaskInput } from "@/lib/handoff/collect";
import { buildDemoHandoffTasks } from "@/lib/handoff/fixtures";
import { demoHandoffRepository, useHandoffs, type HandoffRepository } from "@/lib/handoff/repository";
import { HANDOFF_REASONS, type HandoffDossier, type HandoffReason } from "@/lib/handoff/types";
import { createDossier } from "@/lib/handoff/workflow";
import { useI18n } from "@/lib/i18n/useI18n";
import { searchMemory, type MemorySearch } from "@/lib/memory/search";
import { DEMO_PROJECT_ID } from "@/lib/projects/fixtures";
import { demoProjectRepository } from "@/lib/projects/repository";
import { useOptionalCurrentUser } from "@/lib/session/CurrentUserProvider";
import { tasksApi } from "@/lib/tasks/client";
import { useViewer } from "@/lib/viewer/ViewerProvider";
import { HandoffDetail } from "./HandoffDetail";
import { STATUS_MARK, STATUS_TONE } from "./status";

const DAY = 86_400_000;
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const newId = () => `dossie-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export interface HandoffWorkspaceProps {
  repo?: HandoffRepository;
  /** busca na Memória Institucional (injetável nos testes) */
  memory?: MemorySearch;
  /** relógio (testes) */
  now?: () => Date;
}

export function HandoffWorkspace({ repo = demoHandoffRepository(), memory = searchMemory, now = () => new Date() }: HandoffWorkspaceProps) {
  const { t, intl } = useI18n();
  const { profile, user } = useViewer();
  const search = useSearchParams();
  const all = useHandoffs(repo);
  const displayName = user.name ?? t(user.nameKey);
  const actor = actorFor(profile, displayName);
  const visible = useMemo(() => all.filter((d) => canView(profile, d)), [all, profile]);
  const [selectedId, setSelectedId] = useState<string | null>(() => search?.get("dossie") ?? null);
  const selected = visible.find((d) => d.id === selectedId) ?? null;
  const fmtDate = (iso: string) => new Intl.DateTimeFormat(intl, { dateStyle: "medium" }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));

  return (
    <div className="grid gap-[var(--ws-space-5)]" data-testid="handoff-workspace">
      <Card tone="soft" padding="sm">
        <p className="text-[length:var(--ws-text-body-sm)]">{t("handoff.intro")}</p>
        <p className="mt-1 text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("handoff.privacyNote")}</p>
      </Card>

      {canGenerate(profile) ? (
        <GenerateForm repo={repo} memory={memory} now={now} actor={actor} onCreated={(id) => setSelectedId(id)} />
      ) : (
        <p className="rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-3 text-[length:var(--ws-text-body-sm)] text-ws-text-muted" data-testid="handoff-readonly">{t("handoff.readOnly", { profile: t(`profile.${profile}`) })}</p>
      )}

      <Card title={t("handoff.list.title")} eyebrow={t("handoff.list.eyebrow", { n: visible.length })}>
        {visible.length ? (
          <ul className="grid gap-2" data-testid="handoff-list">
            {visible.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 px-3 py-2" data-dossier={d.id} aria-current={d.id === selectedId ? "true" : undefined}>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{d.subjectName}</span>
                  <span className="block text-[length:var(--ws-text-caption)] text-ws-text-muted">
                    {t(`handoff.reason.${d.reason}`)} · {t("handoff.list.effective", { date: fmtDate(d.effectiveDate) })} · {t("handoff.list.items", { n: d.items.length })}
                  </span>
                </span>
                <Tag tone={STATUS_TONE[d.status]}><span aria-hidden>{STATUS_MARK[d.status]}</span>{t(`handoff.status.${d.status}`)}</Tag>
                <Button size="sm" variant={d.id === selectedId ? "primary" : "default"} onClick={() => setSelectedId(d.id)} aria-label={t("handoff.list.openNamed", { name: d.subjectName })}>{t("handoff.list.open")}</Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState compact moji="vazio" title={t("handoff.list.empty")} description={t("handoff.list.emptyHint")} />
        )}
      </Card>

      {selected ? <HandoffDetail key={selected.id} dossier={selected} repo={repo} actor={actor} now={now} /> : null}
    </div>
  );
}

function GenerateForm({ repo, memory, now, actor, onCreated }: { repo: HandoffRepository; memory: MemorySearch; now: () => Date; actor: { id: string; name: string }; onCreated: (id: string) => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { profile } = useViewer();
  const session = useOptionalCurrentUser();
  const search = useSearchParams();
  const subjects = subjectsFor(profile);
  const self = profile === "EMPREGADO";
  const askedPerson = search?.get("pessoa");
  const askedReason = search?.get("motivo");
  const [subjectId, setSubjectId] = useState<string>(() => (self ? SELF_ID : subjects.find((p) => p.id === askedPerson)?.id ?? ""));
  const [reason, setReason] = useState<HandoffReason>(() => (HANDOFF_REASONS as readonly string[]).includes(askedReason ?? "") ? (askedReason as HandoffReason) : "TRANSFERENCIA");
  const [effectiveDate, setEffectiveDate] = useState(() => isoDate(new Date(now().getTime() + 14 * DAY)));
  const [successorId, setSuccessorId] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!subjectId) errs.subject = t("handoff.form.errSubject");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) errs.date = t("handoff.form.errDate");
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setStatus(t("handoff.form.collecting"));
    const at = now();
    const today = isoDate(at);
    const subject = { id: subjectId, name: subjectId === SELF_ID && self ? actor.name : HANDOFF_PEOPLE[subjectId]?.name ?? subjectId };
    // tarefas: as reais da pessoa logada (o próprio dossiê); de outra pessoa ou sem sessão, o exemplo do laboratório
    let tasks: HandoffTaskInput[] = buildDemoHandoffTasks(at);
    let taskSource: "API" | "DEMO" = "DEMO";
    if (self && session?.status === "authenticated") {
      try {
        tasks = (await tasksApi.mine(100)).map((v) => ({ ...v, ownerId: SELF_ID, responsibleId: v.responsibleId && v.responsibleId === v.ownerId ? SELF_ID : v.responsibleId ?? null }));
        taskSource = "API";
      } catch {
        toast({ title: t("handoff.form.apiFallback"), tone: "aviso" });
      }
    }
    const project = demoProjectRepository().get(DEMO_PROJECT_ID);
    const collected = collectWithMemory({
      subject,
      today,
      consentForPrivateItems: consent,
      people: HANDOFF_PEOPLE,
      projects: project ? [project] : [],
      decisions: demoRepository().list(),
      tasks,
      taskSource,
    }, memory);
    const dossier: HandoffDossier = createDossier({
      id: newId(),
      subject,
      reason,
      effectiveDate,
      today,
      requestedBy: { id: actor.id, name: actor.name, profile },
      consentForPrivateItems: consent,
      defaultSuccessorId: successorId || null,
      collected,
      now: at.toISOString(),
    });
    repo.save(dossier);
    setBusy(false);
    setStatus(t("handoff.form.done", { n: dossier.items.length }));
    toast({ title: t("handoff.form.created", { name: subject.name }), tone: "sucesso" });
    onCreated(dossier.id);
  }

  const people = peopleList();
  return (
    <Card title={t("handoff.form.title")} eyebrow={t("handoff.form.eyebrow")}>
      <form className="grid gap-[var(--ws-space-4)]" onSubmit={(e) => void submit(e)} noValidate data-testid="handoff-form" aria-busy={busy}>
        <div className="grid gap-3 md:grid-cols-2">
          {self ? (
            <div className="grid gap-1.5">
              <p className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("handoff.form.subject")}</p>
              <p className="rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 px-3 py-2 text-[length:var(--ws-text-body-sm)]" data-testid="handoff-self">{t("handoff.form.self", { name: actor.name })}</p>
            </div>
          ) : (
            <Field label={t("handoff.form.subject")} required error={errors.subject} hint={t("handoff.form.subjectHint")}>
              {({ id, describedBy, invalid }) => (
                <Select id={id} aria-describedby={describedBy} invalid={invalid} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
                  options={[{ value: "", label: t("handoff.form.choose") }, ...subjects.map((p) => ({ value: p.id, label: p.name }))]} />
              )}
            </Field>
          )}
          <Field label={t("handoff.form.date")} required error={errors.date} hint={t("handoff.form.dateHint")}>
            {({ id, describedBy, invalid }) => <Input id={id} type="date" aria-describedby={describedBy} invalid={invalid} value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="max-w-48" />}
          </Field>
        </div>
        <div className="grid gap-1.5">
          <p className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("handoff.form.reason")}</p>
          <RadioCards label={t("handoff.form.reason")} value={reason} onValueChange={(v) => setReason(v as HandoffReason)} columns={2}
            options={HANDOFF_REASONS.map((r) => ({ value: r, label: t(`handoff.reason.${r}`), hint: t(`handoff.reasonHint.${r}`) }))} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={t("handoff.form.successor")} hint={t("handoff.form.successorHint")}>
            {({ id, describedBy }) => (
              <Select id={id} aria-describedby={describedBy} value={successorId} onChange={(e) => setSuccessorId(e.target.value)}
                options={[{ value: "", label: t("handoff.form.successorLater") }, ...people.filter((p) => p.id !== subjectId).map((p) => ({ value: p.id, label: p.name }))]} />
            )}
          </Field>
          <Switch checked={consent} onCheckedChange={setConsent} label={t(self ? "handoff.form.consentSelf" : "handoff.form.consent")} hint={t("handoff.form.consentHint")} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant="primary" icon="acervo" busy={busy} data-testid="handoff-generate">{t("handoff.form.submit")}</Button>
          <Badge tone="neutral" title={t("handoff.demoHint")}>{t("decia.demo")}</Badge>
          <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted" aria-live="polite">{status}</span>
        </div>
      </form>
    </Card>
  );
}
