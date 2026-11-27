"use client";
/**
 * Criador completo de projetos em `/projects/new` (RF5, RF21; 12/11/2026): assistente em passos — identificação e área, TAP (objetivo
 * SMART, justificativa, escopo e fora do escopo, premissas, restrições, entregas com formato, critérios de sucesso), partes interessadas
 * (poder × interesse → estratégia de Mendelow), equipe, patrocinador e RACI básico por entrega, abordagem e ciclo (sprints), cronograma
 * inicial (datas e marcos), orçamento (linhas, contingência e gerencial), riscos iniciais (P × I) e governança/classificação de acesso,
 * com revisão final. Cada passo valida ao avançar (foco no primeiro erro); a revisão lista o que falta por passo. O projeto nasce pelo
 * repositório (`ProjectRepository.create`, DEMO nesta aba) a partir de `wizardToProject` e abre na Mesa.
 *
 * "Começar de um modelo" preenche o assistente com o modelo escolhido para revisar; os atalhos de hoje (modelo direto, Autopiloto)
 * continuam ao lado (`CreateProject`).
 */
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Badge, Button, Card, Checkbox, Input, RadioCards, Select, Textarea, cn, useToast } from "@/components/ui";
import { FormatPicker } from "@/components/tasks/FormatPicker";
import { DEMO_CURRENT_USER_ID, DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { useI18n } from "@/lib/i18n/useI18n";
import { todayIso } from "@/lib/projects/autopilot/dates";
import { newProjectId, PROJECT_TEMPLATE_IDS, projectFromTemplate, type ProjectTemplateId } from "@/lib/projects/autopilot/proposal";
import { gut, mendelow, OPPORTUNITY_RESPONSES, ORG_STRUCTURES, probabilityLevel, riskSeverity, THREAT_RESPONSES, type RaciLetter } from "@/lib/projects/engine/methods";
import { demoProjectRepository, type ProjectRepository } from "@/lib/projects/repository";
import {
  APPROACHES, BOARD_MODELS, PROJECT_ACCESS_CLASSES, PROJECT_AREAS, PROJECT_VISIBILITIES,
  type Approach, type BoardModel, type ProjectAccessClass, type ProjectArea, type ProjectRole, type ProjectVisibility,
} from "@/lib/projects/types";
import {
  budgetTotals, emptyWizard, isSmart, newDeliverable, parseNumber, projectPeople, rowId, smartParts, sprintCalendar, validateStep, validateWizard,
  WIZARD_STEPS, wizardFromProject, wizardToProject, type ProjectWizardInput, type WizardErrors, type WizardStep,
} from "@/lib/projects/wizard";
import { fmt } from "../shared";
import { F, SCALE, StringList } from "./fields";

const ROLES: readonly ProjectRole[] = ["PRODUCT_OWNER", "SCRUM_MASTER", "EQUIPE", "CONSULTOR"];
const NEEDS = ["INFORMACAO", "SERVICO", "INFRAESTRUTURA", "CONTRATACAO", "PESSOAL"] as const;
const SPENDS = ["RUN", "GROW", "TRANSFORM"] as const;
const ISO = ["RESPONSABILIDADE", "ESTRATEGIA", "AQUISICAO", "DESEMPENHO", "CONFORMIDADE", "COMPORTAMENTO_HUMANO"] as const;
const RACI_OPTIONS: { value: string; letters: RaciLetter[] }[] = [
  { value: "", letters: [] }, { value: "R", letters: ["R"] }, { value: "A", letters: ["A"] }, { value: "RA", letters: ["R", "A"] },
  { value: "C", letters: ["C"] }, { value: "I", letters: ["I"] },
];
const raciValue = (letters: readonly RaciLetter[] | undefined) => RACI_OPTIONS.find((o) => o.letters.join("") === (letters ?? []).join(""))?.value ?? "";

export interface ProjectWizardProps {
  repo?: ProjectRepository;
  actorId?: string;
  now?: () => Date;
  onCreated?: (projectId: string) => void;
}

export function ProjectWizard({ repo, actorId = DEMO_CURRENT_USER_ID, now = () => new Date(), onCreated }: ProjectWizardProps) {
  const { t, intl } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const today = todayIso(now());
  const [w, setW] = useState<ProjectWizardInput>(() => emptyWizard({ today, actorId }));
  const [step, setStep] = useState<WizardStep>("ident");
  const [errors, setErrors] = useState<WizardErrors>({});
  const [visited, setVisited] = useState<Set<WizardStep>>(() => new Set(["ident"]));
  const [tpl, setTpl] = useState<ProjectTemplateId>("tipo-ti");
  const [focusReq, setFocusReq] = useState<{ field: string | null; n: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const people = projectPeople(w);
  const personName = (id: string) => DEMO_PEOPLE[id]?.name ?? id;
  const personOptions = (empty?: string) => [...(empty !== undefined ? [{ value: "", label: empty }] : []), ...Object.entries(DEMO_PEOPLE).map(([id, p]) => ({ value: id, label: p.name }))];
  const err = (k: string) => (errors[k] ? t(errors[k]!) : undefined);
  const set = <K extends keyof ProjectWizardInput>(k: K, v: ProjectWizardInput[K]) => setW((cur) => ({ ...cur, [k]: v }));
  const patchRow = <K extends "objectives" | "deliverables" | "stakeholders" | "team" | "milestones" | "budgetLines" | "risks" | "goals">(k: K, i: number, patch: Partial<ProjectWizardInput[K][number]>) =>
    setW((cur) => ({ ...cur, [k]: (cur[k] as ProjectWizardInput[K][number][]).map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const removeRow = (k: "objectives" | "deliverables" | "stakeholders" | "team" | "milestones" | "budgetLines" | "risks" | "goals", i: number) =>
    setW((cur) => ({ ...cur, [k]: (cur[k] as unknown[]).filter((_, j) => j !== i) }));
  const allErrors = useMemo(() => validateWizard(w), [w]);
  const totals = budgetTotals(w);
  const sprints = sprintCalendar(w);
  const index = WIZARD_STEPS.indexOf(step);

  // foco: no primeiro campo com erro, ou no título do passo ao trocar de passo
  useEffect(() => {
    if (!focusReq || !boxRef.current) return;
    const box = focusReq.field ? boxRef.current.querySelector<HTMLElement>(`[data-field="${focusReq.field}"]`) : null;
    const target = box?.querySelector<HTMLElement>("input,select,textarea,button,[role=radio],[role=checkbox]") ?? boxRef.current.querySelector<HTMLElement>("[data-step-heading]");
    target?.focus();
  }, [focusReq]);

  const go = (next: WizardStep) => {
    setStep(next);
    setErrors({});
    setVisited((v) => new Set(v).add(next));
    setFocusReq((r) => ({ field: null, n: (r?.n ?? 0) + 1 }));
  };
  const showErrors = (e: WizardErrors) => {
    setErrors(e);
    setFocusReq((r) => ({ field: Object.keys(e)[0] ?? null, n: (r?.n ?? 0) + 1 }));
  };
  const next = () => {
    const e = validateStep(step, w);
    if (Object.keys(e).length) return showErrors(e);
    go(WIZARD_STEPS[Math.min(index + 1, WIZARD_STEPS.length - 1)]!);
  };
  const create = () => {
    const firstBad = WIZARD_STEPS.find((s) => allErrors[s]);
    if (firstBad) {
      setStep(firstBad);
      setVisited((v) => new Set(v).add(firstBad));
      showErrors(allErrors[firstBad]!);
      return;
    }
    const store = repo ?? demoProjectRepository();
    if (!store.create) return toast({ title: t("projectNew.error"), tone: "erro" });
    const r = store.create(wizardToProject(w, { id: newProjectId("p", now()), actorId, now: now() }));
    if (!r.ok) return toast({ title: t("projectNew.error"), description: r.error, tone: "erro" });
    toast({ title: t("projectNew.created", { title: r.model.title }), tone: "sucesso" });
    (onCreated ?? ((id: string) => router.push(`/projects/${id}/edit`)))(r.model.id);
  };
  const useTemplate = () => {
    const model = projectFromTemplate(tpl, { id: "tmp", title: w.title, startDate: w.startDate || today, actorId, now: now(), templateLabel: t(`projectNew.template.${tpl}.name`) });
    setW({ ...wizardFromProject(model, { today, actorId }), startDate: w.startDate || today, area: tpl === "aula-decia" ? "SOFTWARE" : w.area });
    toast({ title: t("projectForm.templateApplied", { name: t(`projectNew.template.${tpl}.name`) }), tone: "sucesso" });
    go("ident");
  };
  const addDeliverable = () => setW((cur) => {
    const { deliverable, raci } = newDeliverable(cur);
    return { ...cur, deliverables: [...cur.deliverables, deliverable], raci };
  });
  const stepState = (s: WizardStep) => (allErrors[s] && visited.has(s) && s !== step ? "error" : visited.has(s) && !allErrors[s] ? "done" : s === step ? "current" : "todo");
  const MARK = { error: "!", done: "✓", current: "●", todo: "○" } as const;

  return (
    <div className="grid gap-[var(--ws-space-4)]" data-project-wizard ref={boxRef}>
      <Card as="section" padding="md" className="grid gap-3" data-testid="wizard-start">
        <h2 className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("projectForm.start.title")}</h2>
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("projectForm.start.hint")}</p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[16rem] flex-1">
            <F k="template" label={t("projectForm.start.template")} err={() => undefined}>
              {({ id }) => <Select id={id} value={tpl} onChange={(e) => setTpl(e.target.value as ProjectTemplateId)} options={PROJECT_TEMPLATE_IDS.map((x) => ({ value: x, label: t(`projectNew.template.${x}.name`) }))} />}
            </F>
          </div>
          <Button variant="default" onClick={useTemplate} data-testid="wizard-use-template">{t("projectForm.start.useTemplate")}</Button>
          <Button variant="spark" href="/autopilot"><span aria-hidden className="text-ws-ai-spark-ink">✦</span>{t("projectForm.start.autopilot")}</Button>
        </div>
      </Card>

      <nav aria-label={t("projectForm.steps.label")} className="rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-1 p-2">
        <ol className="flex flex-wrap gap-1" data-testid="wizard-steps">
          {WIZARD_STEPS.map((s, i) => {
            const st = stepState(s);
            return (
              <li key={s} data-step={s} data-state={st}>
                <Button size="sm" variant={s === step ? "primary" : "ghost"} aria-current={s === step ? "step" : undefined} onClick={() => go(s)}
                  className={cn(st === "error" && s !== step && "text-ws-danger-ink")}>
                  <span aria-hidden>{MARK[st]}</span> {i + 1}. {t(`projectForm.step.${s}`)}
                  <span className="sr-only"> — {t(`projectForm.state.${st}`)}</span>
                </Button>
              </li>
            );
          })}
        </ol>
      </nav>

      <Card as="section" padding="md" className="grid gap-4" aria-labelledby="wizard-step-title" data-wizard-step={step}>
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="wizard-step-title" tabIndex={-1} data-step-heading className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold focus-visible:outline-none">
            {t("projectForm.stepOf", { n: index + 1, total: WIZARD_STEPS.length })} · {t(`projectForm.step.${step}`)}
          </h2>
          <Badge tone="neutral">DEMO</Badge>
        </header>
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t(`projectForm.stepHint.${step}`)}</p>
        {Object.keys(errors).length ? (
          <p role="alert" className="rounded-[var(--ws-radius-md)] border border-ws-danger bg-ws-danger-soft p-2 text-[length:var(--ws-text-body-sm)]" data-testid="wizard-errors">
            {t(Object.keys(errors).length === 1 ? "projectForm.errorsOne" : "projectForm.errorsMany", { n: Object.keys(errors).length })}
          </p>
        ) : null}

        {step === "ident" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <F k="title" label={t("projectForm.title")} required err={err} className="md:col-span-2">
              {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} aria-required value={w.title} maxLength={200} onChange={(e) => set("title", e.target.value)} />}
            </F>
            <F k="area" label={t("projectNew.field.area")} hint={t("projectNew.field.areaHint")} err={err}>
              {({ id, describedBy }) => <Select id={id} aria-describedby={describedBy} value={w.area} onChange={(e) => set("area", e.target.value as ProjectArea)} options={PROJECT_AREAS.map((a) => ({ value: a, label: t(`tasks.area.${a}`) }))} />}
            </F>
            <F k="originRef" label={t("projectForm.originRef")} hint={t("projectForm.originRefHint")} err={err}>
              {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} value={w.originRef} maxLength={80} onChange={(e) => set("originRef", e.target.value)} />}
            </F>
            <F k="description" label={t("projectForm.description")} hint={t("projectForm.descriptionHint")} err={err} className="md:col-span-2">
              {({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} invalid={invalid} rows={3} maxLength={2000} value={w.description} onChange={(e) => set("description", e.target.value)} />}
            </F>
          </div>
        ) : null}

        {step === "charter" ? (
          <div className="grid gap-4">
            <fieldset className="grid gap-3" data-testid="wizard-objectives">
              <legend className="text-[length:var(--ws-text-body)] font-semibold">{t("projectForm.objectives")}</legend>
              <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("projectForm.objectivesHint")}</p>
              {w.objectives.map((o, i) => {
                const parts = smartParts(o);
                return (
                  <div key={o.id} className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-3 md:grid-cols-2" data-objective={i}>
                    <F k={`objectives.${i}.text`} label={t("projectForm.objective", { n: i + 1 })} required={i === 0} err={err} className="md:col-span-2">
                      {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} value={o.text} maxLength={300} onChange={(e) => patchRow("objectives", i, { text: e.target.value })} />}
                    </F>
                    <F k={`objectives.${i}.indicator`} label={t("projectForm.indicator")} err={err}>
                      {({ id }) => <Input id={id} value={o.indicator} maxLength={120} onChange={(e) => patchRow("objectives", i, { indicator: e.target.value })} />}
                    </F>
                    <F k={`objectives.${i}.target`} label={t("projectForm.target")} err={err}>
                      {({ id }) => <Input id={id} value={o.target} maxLength={60} onChange={(e) => patchRow("objectives", i, { target: e.target.value })} />}
                    </F>
                    <F k={`objectives.${i}.deadline`} label={t("projectForm.deadline")} err={err}>
                      {({ id, describedBy, invalid }) => <Input id={id} type="date" aria-describedby={describedBy} invalid={invalid} value={o.deadline} onChange={(e) => patchRow("objectives", i, { deadline: e.target.value })} />}
                    </F>
                    <F k={`objectives.${i}.goalCode`} label={t("projectForm.goalCode")} hint={t("projectForm.goalCodeHint")} err={err}>
                      {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} value={o.goalCode} maxLength={20} onChange={(e) => patchRow("objectives", i, { goalCode: e.target.value })} />}
                    </F>
                    <p className="md:col-span-2 text-[length:var(--ws-text-caption)]" aria-live="polite" data-testid={`smart-${i}`} data-smart={isSmart(o)}>
                      {(["S", "M", "A", "R", "T"] as const).map((l) => (
                        <span key={l} className={cn("mr-2", parts[l] ? "text-ws-success-ink" : "text-ws-text-muted")}>
                          <span aria-hidden>{parts[l] ? "✓" : "○"}</span> {t(`projectForm.smart.${l}`)}
                        </span>
                      ))}
                    </p>
                    {i > 0 ? <div><Button size="sm" variant="ghost" onClick={() => removeRow("objectives", i)}>{t("projectForm.removeObjective")}</Button></div> : null}
                  </div>
                );
              })}
              <div><Button size="sm" variant="ghost" onClick={() => set("objectives", [...w.objectives, { id: rowId("o"), text: "", indicator: "", target: "", deadline: "", goalCode: "" }])}>+ {t("projectForm.addObjective")}</Button></div>
            </fieldset>
            <StringList k="justification" title={t("projectForm.justification")} required items={w.justification} onChange={(v) => set("justification", v)} err={err} addLabel={t("projectForm.addLine")} />
            <F k="product" label={t("projectForm.product")} hint={t("projectForm.productHint")} err={err}>
              {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} value={w.product} maxLength={300} onChange={(e) => set("product", e.target.value)} />}
            </F>
            <div className="grid gap-4 md:grid-cols-2">
              <StringList k="scopeIn" title={t("projectForm.scopeIn")} required items={w.scopeIn} onChange={(v) => set("scopeIn", v)} err={err} addLabel={t("projectForm.addLine")} />
              <StringList k="scopeOut" title={t("projectForm.scopeOut")} hint={t("projectForm.scopeOutHint")} items={w.scopeOut} onChange={(v) => set("scopeOut", v)} err={err} addLabel={t("projectForm.addLine")} />
              <StringList k="premises" title={t("projectForm.premises")} items={w.premises} onChange={(v) => set("premises", v)} err={err} addLabel={t("projectForm.addLine")} />
              <StringList k="constraints" title={t("projectForm.constraints")} items={w.constraints} onChange={(v) => set("constraints", v)} err={err} addLabel={t("projectForm.addLine")} />
              <StringList k="requirements" title={t("projectForm.requirements")} items={w.requirements} onChange={(v) => set("requirements", v)} err={err} addLabel={t("projectForm.addLine")} />
              <StringList k="successCriteria" title={t("projectForm.successCriteria")} required items={w.successCriteria} onChange={(v) => set("successCriteria", v)} err={err} addLabel={t("projectForm.addLine")} />
            </div>
            <fieldset className="grid gap-3" data-field="deliverables" data-testid="wizard-deliverables">
              <legend className="text-[length:var(--ws-text-body)] font-semibold">{t("projectForm.deliverables")}<span className="ml-1 text-ws-danger-ink" aria-hidden>*</span></legend>
              <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("projectForm.deliverablesHint")}</p>
              {err("deliverables") ? <p role="alert" className="text-[length:var(--ws-text-caption)] font-medium text-ws-danger-ink">{err("deliverables")}</p> : null}
              {w.deliverables.map((d, i) => (
                <div key={d.id} className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-3 md:grid-cols-2" data-deliverable={i}>
                  <F k={`deliverables.${i}.title`} label={t("projectForm.deliverable", { n: i + 1 })} required err={err}>
                    {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} value={d.title} maxLength={200} onChange={(e) => patchRow("deliverables", i, { title: e.target.value })} />}
                  </F>
                  <F k={`deliverables.${i}.acceptance`} label={t("projectForm.acceptance")} err={err}>
                    {({ id }) => <Input id={id} value={d.acceptance} maxLength={300} onChange={(e) => patchRow("deliverables", i, { acceptance: e.target.value })} />}
                  </F>
                  <div className="md:col-span-2">
                    <FormatPicker value={d.format} onChange={(f) => patchRow("deliverables", i, { format: f })} testId={`wizard-format-${i}`} />
                  </div>
                  <div><Button size="sm" variant="ghost" onClick={() => removeRow("deliverables", i)} aria-label={t("projectForm.remove", { item: t("projectForm.deliverable", { n: i + 1 }) })}>{t("projectForm.removeDeliverable")}</Button></div>
                </div>
              ))}
              <div><Button size="sm" variant="ghost" onClick={addDeliverable} data-testid="wizard-add-deliverable">+ {t("projectForm.addDeliverable")}</Button></div>
            </fieldset>
          </div>
        ) : null}

        {step === "stakeholders" ? (
          <fieldset className="grid gap-3" data-field="stakeholders">
            <legend className="sr-only">{t("projectForm.step.stakeholders")}</legend>
            {err("stakeholders") ? <p role="alert" className="text-[length:var(--ws-text-caption)] font-medium text-ws-danger-ink">{err("stakeholders")}</p> : null}
            {w.stakeholders.map((s, i) => (
              <div key={s.id} className="grid items-end gap-2 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-3 md:grid-cols-[2fr_2fr_1fr_1fr_auto]" data-stakeholder={i}>
                <F k={`stakeholders.${i}.name`} label={t("projectForm.stkName", { n: i + 1 })} required err={err}>
                  {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} value={s.name} maxLength={120} onChange={(e) => patchRow("stakeholders", i, { name: e.target.value })} />}
                </F>
                <F k={`stakeholders.${i}.role`} label={t("projectForm.stkRole")} err={err}>
                  {({ id }) => <Input id={id} value={s.role} maxLength={120} onChange={(e) => patchRow("stakeholders", i, { role: e.target.value })} />}
                </F>
                <F k={`stakeholders.${i}.power`} label={t("projectForm.power")} err={err}>
                  {({ id }) => <Select id={id} value={String(s.power)} onChange={(e) => patchRow("stakeholders", i, { power: Number(e.target.value) })} options={SCALE} />}
                </F>
                <F k={`stakeholders.${i}.interest`} label={t("projectForm.interest")} err={err}>
                  {({ id }) => <Select id={id} value={String(s.interest)} onChange={(e) => patchRow("stakeholders", i, { interest: Number(e.target.value) })} options={SCALE} />}
                </F>
                <Button size="sm" variant="ghost" onClick={() => removeRow("stakeholders", i)} aria-label={t("projectForm.remove", { item: s.name || t("projectForm.stkName", { n: i + 1 }) })}>×</Button>
                <p className="text-[length:var(--ws-text-caption)] md:col-span-5" data-testid={`strategy-${i}`}>
                  {t("projectForm.strategy", { strategy: t(`pm.engagement.${mendelow(s.power, s.interest)}`) })}
                </p>
              </div>
            ))}
            <div><Button size="sm" variant="ghost" onClick={() => set("stakeholders", [...w.stakeholders, { id: rowId("s"), name: "", role: "", power: 3, interest: 3 }])} data-testid="wizard-add-stakeholder">+ {t("projectForm.addStakeholder")}</Button></div>
          </fieldset>
        ) : null}

        {step === "team" ? (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <F k="sponsorId" label={t("pm.role.PATROCINADOR")} required err={err}>
                {({ id, describedBy, invalid }) => <Select id={id} aria-describedby={describedBy} invalid={invalid} value={w.sponsorId} onChange={(e) => set("sponsorId", e.target.value)} options={personOptions(t("projectForm.choosePerson"))} />}
              </F>
              <F k="managerId" label={t("pm.role.GERENTE")} required err={err}>
                {({ id, describedBy, invalid }) => <Select id={id} aria-describedby={describedBy} invalid={invalid} value={w.managerId} onChange={(e) => set("managerId", e.target.value)} options={personOptions(t("projectForm.choosePerson"))} />}
              </F>
            </div>
            <fieldset className="grid gap-2">
              <legend className="text-[length:var(--ws-text-body)] font-semibold">{t("projectForm.team")}</legend>
              {w.team.map((m, i) => (
                <div key={m.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                  <F k={`team.${i}.userId`} label={t("projectForm.member", { n: i + 1 })} err={err}>
                    {({ id }) => <Select id={id} value={m.userId} onChange={(e) => patchRow("team", i, { userId: e.target.value })} options={personOptions(t("projectForm.choosePerson"))} />}
                  </F>
                  <F k={`team.${i}.role`} label={t("projectForm.memberRole")} err={err}>
                    {({ id }) => <Select id={id} value={m.role} onChange={(e) => patchRow("team", i, { role: e.target.value as ProjectRole })} options={ROLES.map((r) => ({ value: r, label: t(`pm.role.${r}`) }))} />}
                  </F>
                  <Button size="sm" variant="ghost" onClick={() => removeRow("team", i)} aria-label={t("projectForm.remove", { item: t("projectForm.member", { n: i + 1 }) })}>×</Button>
                </div>
              ))}
              <div><Button size="sm" variant="ghost" onClick={() => set("team", [...w.team, { id: rowId("m"), userId: "", role: "EQUIPE" }])}>+ {t("projectForm.addMember")}</Button></div>
            </fieldset>
            <StringList k="teamRoles" title={t("projectForm.teamRoles")} hint={t("projectForm.teamRolesHint")} items={w.teamRoles} onChange={(v) => set("teamRoles", v)} err={err} addLabel={t("projectForm.addLine")} />
            <div className="grid gap-2">
              <h3 className="text-[length:var(--ws-text-body)] font-semibold">{t("projectForm.raci")}</h3>
              <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("projectForm.raciHint")}</p>
              {w.deliverables.length && people.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[length:var(--ws-text-body-sm)]" data-testid="wizard-raci">
                    <caption className="sr-only">{t("projectForm.raciCaption")}</caption>
                    <thead>
                      <tr>
                        <th scope="col" className="p-1 text-left">{t("projectForm.deliverables")}</th>
                        {people.map((u) => <th key={u} scope="col" className="p-1 text-left">{personName(u)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {w.deliverables.map((d, i) => (
                        <tr key={d.id} className="border-t border-ws-border" data-field={`raci.${i}`}>
                          <th scope="row" className="p-1 text-left font-medium">
                            {d.title || t("projectForm.deliverable", { n: i + 1 })}
                            {err(`raci.${i}`) ? <span role="alert" className="block text-[length:var(--ws-text-caption)] text-ws-danger-ink">{err(`raci.${i}`)}</span> : null}
                          </th>
                          {people.map((u) => (
                            <td key={u} className="p-1">
                              <Select aria-label={t("projectForm.raciCell", { person: personName(u), deliverable: d.title || String(i + 1) })} value={raciValue(w.raci[d.id]?.[u])}
                                onChange={(e) => setW((cur) => ({ ...cur, raci: { ...cur.raci, [d.id]: { ...(cur.raci[d.id] ?? {}), [u]: RACI_OPTIONS.find((o) => o.value === e.target.value)?.letters ?? [] } } }))}
                                options={RACI_OPTIONS.map((o) => ({ value: o.value, label: o.value ? o.letters.join("+") : "—" }))} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("projectForm.raciEmpty")}</p>}
            </div>
          </div>
        ) : null}

        {step === "approach" ? (
          <div className="grid gap-4">
            <RadioCards label={t("projectNew.field.approach")} value={w.approach} onValueChange={(v) => set("approach", v as Approach)} columns={4}
              options={APPROACHES.map((a) => ({ value: a, label: t(`pm.approach.${a}`), hint: t(`projectForm.approachHint.${a}`) }))} />
            <F k="boardModel" label={t("pm.board.modelLabel")} hint={t(`pm.board.modelHint.${w.boardModel}`)} err={err}>
              {({ id, describedBy }) => <Select id={id} aria-describedby={describedBy} value={w.boardModel} onChange={(e) => set("boardModel", e.target.value as BoardModel)} options={BOARD_MODELS.map((b) => ({ value: b, label: t(`pm.boardModel.${b}`) }))} />}
            </F>
            {w.approach !== "PREDITIVO" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <F k="sprintWeeks" label={t("projectForm.sprintWeeks")} hint={t("projectForm.sprintWeeksHint")} err={err}>
                  {({ id, describedBy, invalid }) => <Input id={id} inputMode="numeric" aria-describedby={describedBy} invalid={invalid} value={w.sprintWeeks} maxLength={1} onChange={(e) => set("sprintWeeks", e.target.value)} />}
                </F>
                <F k="sprintCount" label={t("projectForm.sprintCount")} hint={t("projectForm.sprintCountHint")} err={err}>
                  {({ id, describedBy, invalid }) => <Input id={id} inputMode="numeric" aria-describedby={describedBy} invalid={invalid} value={w.sprintCount} maxLength={2} onChange={(e) => set("sprintCount", e.target.value)} />}
                </F>
                {sprints.length ? (
                  <p className="md:col-span-2 text-[length:var(--ws-text-caption)]" aria-live="polite" data-testid="wizard-sprints">
                    {t("projectForm.sprintsPreview", { n: sprints.length, first: fmt.date(intl, sprints[0]!.start), last: fmt.date(intl, sprints.at(-1)!.end) })}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {step === "schedule" ? (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <F k="startDate" label={t("projectForm.startDate")} required err={err}>
                {({ id, describedBy, invalid }) => <Input id={id} type="date" aria-describedby={describedBy} invalid={invalid} value={w.startDate} onChange={(e) => set("startDate", e.target.value)} />}
              </F>
              <F k="endDate" label={t("projectForm.endDate")} err={err}>
                {({ id, describedBy, invalid }) => <Input id={id} type="date" aria-describedby={describedBy} invalid={invalid} value={w.endDate} onChange={(e) => set("endDate", e.target.value)} />}
              </F>
            </div>
            <fieldset className="grid gap-2">
              <legend className="text-[length:var(--ws-text-body)] font-semibold">{t("projectForm.milestones")}</legend>
              {w.milestones.map((m, i) => (
                <div key={m.id} className="grid grid-cols-[2fr_1fr_auto] items-end gap-2" data-milestone={i}>
                  <F k={`milestones.${i}.title`} label={t("projectForm.milestone", { n: i + 1 })} required err={err}>
                    {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} value={m.title} maxLength={200} onChange={(e) => patchRow("milestones", i, { title: e.target.value })} />}
                  </F>
                  <F k={`milestones.${i}.date`} label={t("projectForm.milestoneDate")} required err={err}>
                    {({ id, describedBy, invalid }) => <Input id={id} type="date" aria-describedby={describedBy} invalid={invalid} value={m.date} onChange={(e) => patchRow("milestones", i, { date: e.target.value })} />}
                  </F>
                  <Button size="sm" variant="ghost" onClick={() => removeRow("milestones", i)} aria-label={t("projectForm.remove", { item: t("projectForm.milestone", { n: i + 1 }) })}>×</Button>
                </div>
              ))}
              <div><Button size="sm" variant="ghost" onClick={() => set("milestones", [...w.milestones, { id: rowId("m"), title: "", date: "" }])}>+ {t("projectForm.addMilestone")}</Button></div>
            </fieldset>
            <fieldset className="grid gap-2">
              <legend className="text-[length:var(--ws-text-body)] font-semibold">{t("projectForm.deliverableDates")}</legend>
              {w.deliverables.length ? w.deliverables.map((d, i) => (
                <div key={d.id} className="grid items-end gap-2 md:grid-cols-[2fr_1fr_1fr_1fr]">
                  <p className="self-center font-medium">{d.title || t("projectForm.deliverable", { n: i + 1 })}</p>
                  <F k={`deliverables.${i}.durationDays`} label={t("projectForm.durationDays")} err={err}>
                    {({ id, describedBy, invalid }) => <Input id={id} inputMode="numeric" aria-describedby={describedBy} invalid={invalid} value={d.durationDays} maxLength={3} onChange={(e) => patchRow("deliverables", i, { durationDays: e.target.value })} />}
                  </F>
                  <F k={`deliverables.${i}.dueAt`} label={t("projectForm.dueAt")} err={err}>
                    {({ id, describedBy, invalid }) => <Input id={id} type="date" aria-describedby={describedBy} invalid={invalid} value={d.dueAt} onChange={(e) => patchRow("deliverables", i, { dueAt: e.target.value })} />}
                  </F>
                  <F k={`deliverables.${i}.ownerId`} label={t("projectForm.owner")} err={err}>
                    {({ id }) => <Select id={id} value={d.ownerId} onChange={(e) => patchRow("deliverables", i, { ownerId: e.target.value })} options={personOptions(t("projectForm.noOwner"))} />}
                  </F>
                </div>
              )) : <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("projectForm.noDeliverablesYet")}</p>}
            </fieldset>
          </div>
        ) : null}

        {step === "budget" ? (
          <div className="grid gap-4">
            <fieldset className="grid gap-2">
              <legend className="text-[length:var(--ws-text-body)] font-semibold">{t("projectForm.budgetLines")}</legend>
              {w.budgetLines.map((b, i) => (
                <div key={b.id} className="grid items-end gap-2 md:grid-cols-[2fr_1fr_1fr_auto]" data-budget-line={i}>
                  <F k={`budgetLines.${i}.title`} label={t("projectForm.lineTitle", { n: i + 1 })} required err={err}>
                    {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} value={b.title} maxLength={120} onChange={(e) => patchRow("budgetLines", i, { title: e.target.value })} />}
                  </F>
                  <F k={`budgetLines.${i}.amount`} label={t("projectForm.amount")} required err={err}>
                    {({ id, describedBy, invalid }) => <Input id={id} inputMode="decimal" aria-describedby={describedBy} invalid={invalid} value={b.amount} maxLength={16} onChange={(e) => patchRow("budgetLines", i, { amount: e.target.value })} />}
                  </F>
                  <F k={`budgetLines.${i}.spend`} label={t("projectForm.spend")} err={err}>
                    {({ id }) => <Select id={id} value={b.spend} onChange={(e) => patchRow("budgetLines", i, { spend: e.target.value as (typeof SPENDS)[number] })} options={SPENDS.map((s) => ({ value: s, label: t(`pm.spend.${s}`) }))} />}
                  </F>
                  <Button size="sm" variant="ghost" onClick={() => removeRow("budgetLines", i)} aria-label={t("projectForm.remove", { item: t("projectForm.lineTitle", { n: i + 1 }) })}>×</Button>
                </div>
              ))}
              <div><Button size="sm" variant="ghost" onClick={() => set("budgetLines", [...w.budgetLines, { id: rowId("b"), title: "", amount: "", spend: "GROW" }])}>+ {t("projectForm.addLineBudget")}</Button></div>
            </fieldset>
            <div className="grid gap-3 md:grid-cols-2">
              <F k="contingency" label={t("projectForm.contingency")} hint={t("projectForm.contingencyHint", { emv: fmt.money(intl, totals.threatsEmv) })} err={err}>
                {({ id, describedBy, invalid }) => <Input id={id} inputMode="decimal" aria-describedby={describedBy} invalid={invalid} value={w.contingency} maxLength={16} onChange={(e) => set("contingency", e.target.value)} />}
              </F>
              <F k="management" label={t("projectForm.management")} hint={t("projectForm.managementHint")} err={err}>
                {({ id, describedBy, invalid }) => <Input id={id} inputMode="decimal" aria-describedby={describedBy} invalid={invalid} value={w.management} maxLength={16} onChange={(e) => set("management", e.target.value)} />}
              </F>
            </div>
            <dl className="grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-3 text-[length:var(--ws-text-body-sm)] sm:grid-cols-2" aria-live="polite" data-testid="wizard-budget-totals">
              <dt>{t("projectForm.totalLines")}</dt><dd className="font-[family-name:var(--ws-font-mono)]">{fmt.money(intl, totals.lines)}</dd>
              <dt>{t("projectForm.totalBaseline")}</dt><dd className="font-[family-name:var(--ws-font-mono)]">{fmt.money(intl, totals.baseline)}</dd>
              <dt className="font-semibold">{t("projectForm.totalBudget")}</dt><dd className="font-[family-name:var(--ws-font-mono)] font-semibold" data-testid="wizard-total">{fmt.money(intl, totals.total)}</dd>
            </dl>
          </div>
        ) : null}

        {step === "risks" ? (
          <fieldset className="grid gap-3">
            <legend className="sr-only">{t("projectForm.step.risks")}</legend>
            {w.risks.map((r, i) => {
              const p = parseNumber(r.probability);
              const sev = Number.isFinite(p) ? riskSeverity(probabilityLevel(p / 100), r.impactLevel) : null;
              const responses = r.kind === "AMEACA" ? THREAT_RESPONSES : OPPORTUNITY_RESPONSES;
              return (
                <div key={r.id} className="grid items-end gap-2 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-3 md:grid-cols-3" data-risk={i}>
                  <F k={`risks.${i}.title`} label={t("projectForm.riskTitle", { n: i + 1 })} required err={err} className="md:col-span-2">
                    {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} value={r.title} maxLength={200} onChange={(e) => patchRow("risks", i, { title: e.target.value })} />}
                  </F>
                  <F k={`risks.${i}.kind`} label={t("projectForm.riskKind")} err={err}>
                    {({ id }) => <Select id={id} value={r.kind} onChange={(e) => patchRow("risks", i, { kind: e.target.value as typeof r.kind, response: "" })} options={(["AMEACA", "OPORTUNIDADE"] as const).map((k) => ({ value: k, label: t(`pm.riskKind.${k}`) }))} />}
                  </F>
                  <F k={`risks.${i}.probability`} label={t("projectForm.probability")} required err={err}>
                    {({ id, describedBy, invalid }) => <Input id={id} inputMode="numeric" aria-describedby={describedBy} invalid={invalid} value={r.probability} maxLength={5} onChange={(e) => patchRow("risks", i, { probability: e.target.value })} />}
                  </F>
                  <F k={`risks.${i}.impactLevel`} label={t("projectForm.impactLevel")} err={err}>
                    {({ id }) => <Select id={id} value={String(r.impactLevel)} onChange={(e) => patchRow("risks", i, { impactLevel: Number(e.target.value) })} options={SCALE} />}
                  </F>
                  <F k={`risks.${i}.impact`} label={t("projectForm.impact")} err={err}>
                    {({ id, describedBy, invalid }) => <Input id={id} inputMode="decimal" aria-describedby={describedBy} invalid={invalid} value={r.impact} maxLength={16} onChange={(e) => patchRow("risks", i, { impact: e.target.value })} />}
                  </F>
                  <F k={`risks.${i}.response`} label={t("projectForm.response")} err={err}>
                    {({ id }) => <Select id={id} value={r.response} onChange={(e) => patchRow("risks", i, { response: e.target.value as typeof r.response })} options={[{ value: "", label: t("projectForm.undecided") }, ...responses.map((x) => ({ value: x, label: t(`pm.response.${x}`) }))]} />}
                  </F>
                  <F k={`risks.${i}.ownerId`} label={t("projectForm.owner")} err={err}>
                    {({ id }) => <Select id={id} value={r.ownerId} onChange={(e) => patchRow("risks", i, { ownerId: e.target.value })} options={personOptions(t("projectForm.noOwner"))} />}
                  </F>
                  <p className="text-[length:var(--ws-text-caption)]" data-testid={`risk-band-${i}`}>
                    {sev ? t("projectForm.severity", { score: sev.score, band: t(`pm.riskBand.${sev.band}`) }) : "—"}
                  </p>
                  <div><Button size="sm" variant="ghost" onClick={() => removeRow("risks", i)} aria-label={t("projectForm.remove", { item: t("projectForm.riskTitle", { n: i + 1 }) })}>{t("projectForm.removeRisk")}</Button></div>
                </div>
              );
            })}
            <div><Button size="sm" variant="ghost" onClick={() => set("risks", [...w.risks, { id: rowId("k"), title: "", kind: "AMEACA", probability: "", impact: "", impactLevel: 3, response: "", ownerId: "" }])} data-testid="wizard-add-risk">+ {t("projectForm.addRisk")}</Button></div>
          </fieldset>
        ) : null}

        {step === "governance" ? (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              {(["g", "u", "t"] as const).map((k) => (
                <F key={k} k={`gut.${k}`} label={t(`projectForm.gut.${k}`)} err={err}>
                  {({ id }) => <Select id={id} value={String(w.gut[k])} onChange={(e) => set("gut", { ...w.gut, [k]: Number(e.target.value) })} options={SCALE} />}
                </F>
              ))}
              <p className="md:col-span-3 text-[length:var(--ws-text-caption)]" aria-live="polite" data-testid="wizard-gut">
                {t("projectForm.gutScore", { score: gut(w.gut.g, w.gut.u, w.gut.t).score, band: t(`pm.gutBand.${gut(w.gut.g, w.gut.u, w.gut.t).band}`) })}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <F k="need" label={t("projectForm.need")} err={err}>
                {({ id }) => <Select id={id} value={w.need} onChange={(e) => set("need", e.target.value as ProjectWizardInput["need"])} options={[{ value: "", label: t("projectForm.undecided") }, ...NEEDS.map((n) => ({ value: n, label: t(`pm.need.${n}`) }))]} />}
              </F>
              <F k="spend" label={t("projectForm.spend")} err={err}>
                {({ id }) => <Select id={id} value={w.spend} onChange={(e) => set("spend", e.target.value as ProjectWizardInput["spend"])} options={SPENDS.map((s) => ({ value: s, label: t(`pm.spend.${s}`) }))} />}
              </F>
              <F k="orgStructure" label={t("projectForm.orgStructure")} err={err}>
                {({ id }) => <Select id={id} value={w.orgStructure} onChange={(e) => set("orgStructure", e.target.value as ProjectWizardInput["orgStructure"])} options={ORG_STRUCTURES.map((o) => ({ value: o, label: t(`pm.org.${o}`) }))} />}
              </F>
            </div>
            <fieldset className="grid gap-2">
              <legend className="text-[length:var(--ws-text-body)] font-semibold">{t("pm.gov.goals.title")}</legend>
              {w.goals.map((g, i) => (
                <div key={g.id} className="grid grid-cols-[1fr_3fr_1fr_auto] items-end gap-2">
                  <F k={`goals.${i}.code`} label={t("pm.gov.goals.code")} required err={err}>
                    {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} placeholder={t("pm.gov.goals.codePlaceholder")} value={g.code} maxLength={20} onChange={(e) => patchRow("goals", i, { code: e.target.value })} />}
                  </F>
                  <F k={`goals.${i}.text`} label={t("pm.gov.goals.text")} required err={err}>
                    {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} value={g.text} maxLength={200} onChange={(e) => patchRow("goals", i, { text: e.target.value })} />}
                  </F>
                  <F k={`goals.${i}.source`} label={t("pm.gov.goals.source")} err={err}>
                    {({ id }) => <Select id={id} value={g.source} onChange={(e) => patchRow("goals", i, { source: e.target.value as typeof g.source })} options={(["PEI", "PDTIC", "BSC"] as const).map((s) => ({ value: s, label: s }))} />}
                  </F>
                  <Button size="sm" variant="ghost" onClick={() => removeRow("goals", i)} aria-label={t("projectForm.remove", { item: g.code || t("pm.gov.goals.code") })}>×</Button>
                </div>
              ))}
              <div><Button size="sm" variant="ghost" onClick={() => set("goals", [...w.goals, { id: rowId("g"), code: "", text: "", source: "PEI" }])}>+ {t("pm.gov.goals.add")}</Button></div>
            </fieldset>
            {w.area === "SOFTWARE" ? (
              <fieldset className="grid gap-1 sm:grid-cols-3">
                <legend className="text-[length:var(--ws-text-body)] font-semibold">{t("projectForm.iso38500")}</legend>
                {ISO.map((k) => <Checkbox key={k} checked={!!w.iso38500[k]} onCheckedChange={(v) => set("iso38500", { ...w.iso38500, [k]: v })} label={t(`pm.iso.${k}`)} />)}
              </fieldset>
            ) : <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("projectForm.isoOnlyIt")}</p>}
            <div className="grid gap-3 md:grid-cols-2">
              <F k="accessClass" label={t("tasks.form.accessClass")} hint={t("projectForm.accessHint")} err={err}>
                {({ id, describedBy }) => <Select id={id} aria-describedby={describedBy} value={w.accessClass} onChange={(e) => set("accessClass", e.target.value as ProjectAccessClass)} options={PROJECT_ACCESS_CLASSES.map((v) => ({ value: v, label: t(`social.access.${v}`) }))} />}
              </F>
              <F k="visibility" label={t("tasks.form.visibility")} err={err}>
                {({ id, describedBy, invalid }) => <Select id={id} aria-describedby={describedBy} invalid={invalid} value={w.visibility} onChange={(e) => set("visibility", e.target.value as ProjectVisibility)} options={PROJECT_VISIBILITIES.map((v) => ({ value: v, label: t(`social.visibility.${v}`) }))} />}
              </F>
              {w.accessClass === "SIGILOSO" || w.accessClass === "RESTRITO" ? (
                <F k="accessReason" label={t("taskForm.accessReason")} required={w.accessClass === "SIGILOSO"} hint={t("taskForm.accessReasonHint")} err={err} className="md:col-span-2">
                  {({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} invalid={invalid} rows={2} maxLength={500} value={w.accessReason} onChange={(e) => set("accessReason", e.target.value)} />}
                </F>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === "review" ? <Review w={w} problems={allErrors} goTo={(s) => { go(s); }} totals={totals} personName={personName} /> : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-ws-border pt-3">
          {index > 0 ? <Button variant="ghost" onClick={() => go(WIZARD_STEPS[index - 1]!)} data-testid="wizard-back">{t("projectForm.back")}</Button> : null}
          {step !== "review" ? <Button variant="primary" onClick={next} data-testid="wizard-next">{t("projectForm.next")}</Button> : null}
          <Button variant={step === "review" ? "primary" : "ghost"} icon="criar-projeto" onClick={create} data-testid="wizard-create">{t("projectForm.create")}</Button>
        </div>
      </Card>
    </div>
  );
}

function Review({ w, problems, goTo, totals, personName }: {
  w: ProjectWizardInput; problems: Partial<Record<WizardStep, WizardErrors>>; goTo: (s: WizardStep) => void; totals: ReturnType<typeof budgetTotals>; personName: (id: string) => string;
}) {
  const { t, intl } = useI18n();
  const bad = WIZARD_STEPS.filter((s) => problems[s]);
  const row = (label: string, value: ReactNode) => (<><dt className="text-ws-text-muted">{label}</dt><dd className="[overflow-wrap:anywhere]">{value}</dd></>);
  return (
    <div className="grid gap-3" data-testid="wizard-review">
      {bad.length ? (
        <div role="status" className="grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-danger bg-ws-danger-soft p-3" data-testid="wizard-review-problems">
          <p className="font-semibold">{t("projectForm.review.problems")}</p>
          <ul className="grid gap-1">
            {bad.map((s) => (
              <li key={s} className="flex flex-wrap items-center gap-2">
                <span aria-hidden>!</span> {t(`projectForm.step.${s}`)} — {t("projectForm.review.count", { n: Object.keys(problems[s]!).length })}
                <Button size="sm" variant="ghost" onClick={() => goTo(s)}>{t("projectForm.review.fix", { step: t(`projectForm.step.${s}`) })}</Button>
              </li>
            ))}
          </ul>
        </div>
      ) : <p role="status" className="rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-success-soft p-3"><span aria-hidden>✓ </span>{t("projectForm.review.ready")}</p>}
      <dl className="grid gap-x-4 gap-y-1 text-[length:var(--ws-text-body-sm)] sm:grid-cols-[auto_1fr]">
        {row(t("projectForm.title"), w.title || "—")}
        {row(t("projectNew.field.area"), t(`tasks.area.${w.area}`))}
        {row(t("projectForm.objectives"), w.objectives.filter((o) => o.text.trim()).map((o) => `${o.text}${isSmart(o) ? " (SMART)" : ""}`).join(" · ") || "—")}
        {row(t("projectForm.deliverables"), w.deliverables.filter((d) => d.title.trim()).map((d) => d.title).join(" · ") || "—")}
        {row(t("projectForm.step.stakeholders"), String(w.stakeholders.filter((s) => s.name.trim()).length))}
        {row(t("pm.role.PATROCINADOR"), w.sponsorId ? personName(w.sponsorId) : "—")}
        {row(t("pm.role.GERENTE"), w.managerId ? personName(w.managerId) : "—")}
        {row(t("projectNew.field.approach"), t(`pm.approach.${w.approach}`))}
        {row(t("projectForm.startDate"), fmt.date(intl, w.startDate))}
        {row(t("projectForm.endDate"), w.endDate ? fmt.date(intl, w.endDate) : "—")}
        {row(t("projectForm.milestones"), String(w.milestones.length))}
        {row(t("projectForm.totalBudget"), fmt.money(intl, totals.total))}
        {row(t("projectForm.step.risks"), String(w.risks.filter((r) => r.title.trim()).length))}
        {row(t("tasks.form.accessClass"), t(`social.access.${w.accessClass}`))}
      </dl>
    </div>
  );
}
