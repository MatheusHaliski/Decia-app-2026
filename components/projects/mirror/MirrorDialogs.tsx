"use client";
/**
 * Diálogos do Espelho (RF32): prévia das tarefas sugeridas antes de criar (uma ou em lote, RF32.CA03), justificativa para marcar
 * "não se aplica" e o editor dos itens do checklist do departamento (o chefe cria e edita, RF32.CA01).
 */
import { useId, useState } from "react";
import { Button, Checkbox, Dialog, Field, Input, Select, Textarea, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { parseKeywords } from "@/lib/projects/compliance/text";
import { planSuggestion, type SuggestionPlan } from "@/lib/projects/compliance/suggest";
import { RULE_KINDS, type ComplianceItem, type ItemResult, type Requirement, type Rule, type RuleKind } from "@/lib/projects/compliance/types";
import { PROJECT_PHASES, type ProjectModel, type ProjectPhase } from "@/lib/projects/types";
import { nameOf, type PeopleDirectory } from "../shared";
import { NumberField } from "../simulate/shared";
import { itemTitle, suggestionTitle } from "./labels";

const CAPTION = "text-[length:var(--ws-text-caption)] text-ws-text-muted";
const BODY_SM = "text-[length:var(--ws-text-body-sm)]";

interface Row { itemId: string; on: boolean; title: string; responsibleId: string }

/** Prévia: o que será criado, em que fase, com que duração e responsável; nada é criado sem confirmar. */
export function SuggestDialog({ open, onOpenChange, results, model, people, onConfirm }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: readonly ItemResult[];
  model: ProjectModel;
  people: PeopleDirectory;
  onConfirm: (plans: SuggestionPlan[]) => void;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[]>(() => results.map((r) => ({ itemId: r.item.id, on: true, title: suggestionTitle(t, r.item), responsibleId: model.charter.managerId ?? "" })));
  const set = (itemId: string, patch: Partial<Row>) => setRows((all) => all.map((x) => (x.itemId === itemId ? { ...x, ...patch } : x)));
  const plans = rows
    .filter((x) => x.on)
    .map((x) => planSuggestion(results.find((r) => r.item.id === x.itemId)!, x.title, x.responsibleId || undefined))
    .filter((p): p is SuggestionPlan => p !== null);
  const peopleOptions = [{ value: "", label: t("pm.ui.unassigned") }, ...model.team.map((m) => ({ value: m.userId, label: nameOf(people, m.userId) }))];
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("mirror.suggest.title", { n: results.length })} description={t("mirror.suggest.desc")} className="w-[min(94vw,46rem)]">
      <div className="grid gap-[var(--ws-space-3)]" data-suggest-dialog>
        {model.baseline ? <p role="note" className="rounded-[var(--ws-radius-md)] border border-ws-warning bg-ws-warning-soft p-2.5 text-[length:var(--ws-text-body-sm)]">{t("mirror.suggest.baseline")}</p> : null}
        <ul className="grid gap-2">
          {results.map((r) => {
            const row = rows.find((x) => x.itemId === r.item.id)!;
            return (
              <li key={r.item.id} className={cn("grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-border p-2.5", row.on ? "bg-ws-surface-1" : "bg-ws-surface-2")} data-suggest-item={r.item.code}>
                <Checkbox checked={row.on} onCheckedChange={(on) => set(r.item.id, { on })} label={<span><span className="font-[family-name:var(--ws-font-mono)]">{r.item.code}</span> · {itemTitle(t, r.item)}</span>}
                  hint={t("mirror.suggest.where", { phase: t(`pm.phase.${r.item.phase}`), days: r.item.suggestion?.durationDays ?? 0 })} />
                {row.on ? (
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    <Field label={t("mirror.suggest.taskTitle")} hint={t("mirror.suggest.ref", { code: r.item.code })}>
                      {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} value={row.title} onChange={(e) => set(r.item.id, { title: e.target.value })} />}
                    </Field>
                    <Field label={t("mirror.suggest.responsible")}>
                      {({ id }) => <Select id={id} value={row.responsibleId} onChange={(e) => set(r.item.id, { responsibleId: e.target.value })} options={peopleOptions} />}
                    </Field>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        <p className={CAPTION}>{t("mirror.suggest.commands")}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("pm.ui.cancel")}</Button>
          <Button variant="primary" icon="criar-tarefa" disabled={!plans.length} onClick={() => onConfirm(plans)}>{t("mirror.suggest.confirm", { n: plans.length })}</Button>
        </div>
      </div>
    </Dialog>
  );
}

/** Marcar "não se aplica" exige justificativa (fica registrada para o chefe revisor). */
export function WaiveDialog({ open, onOpenChange, result, onConfirm }: { open: boolean; onOpenChange: (open: boolean) => void; result: ItemResult; onConfirm: (reason: string) => void }) {
  const { t } = useI18n();
  const [reason, setReason] = useState("");
  const short = reason.trim().length < 10;
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("mirror.waive.title", { code: result.item.code })} description={itemTitle(t, result.item)}>
      <form className="grid gap-[var(--ws-space-3)]" onSubmit={(e) => {
        e.preventDefault();
        if (!short) onConfirm(reason.trim());
      }}>
        {result.item.requirement === "OBRIGATORIO" ? <p role="note" className="rounded-[var(--ws-radius-md)] border border-ws-warning bg-ws-warning-soft p-2.5 text-[length:var(--ws-text-body-sm)]">{t("mirror.waive.required")}</p> : null}
        <Field label={t("mirror.waive.reason")} hint={t("mirror.waive.hint")} error={reason && short ? t("mirror.waive.tooShort") : undefined}>
          {({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} invalid={invalid} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("pm.ui.cancel")}</Button>
          <Button type="submit" variant="primary" disabled={short}>{t("mirror.waive.confirm")}</Button>
        </div>
      </form>
    </Dialog>
  );
}

const KEYWORD_RULES = new Set<RuleKind>(["ARTEFATO", "MARCO", "RISCO", "ORCAMENTO"]);
const TASK_SUGGESTION = new Set<RuleKind>(["ARTEFATO", "MARCO", "RISCO"]);

interface ItemDraft { title: string; why: string; basis: string; phase: ProjectPhase; requirement: Requirement; kind: RuleKind; keywords: string; needsResponsible: boolean; minPhases: number; taskTitle: string; durationDays: number }

const draftOf = (item?: ComplianceItem): ItemDraft => {
  const rule = item?.rule;
  return {
    title: item?.title ?? "", why: item?.why ?? "", basis: item?.basis ?? "", phase: item?.phase ?? "ELABORACAO", requirement: item?.requirement ?? "OBRIGATORIO",
    kind: rule?.kind ?? "ARTEFATO",
    keywords: rule && "keywords" in rule ? rule.keywords.join(", ") : "",
    needsResponsible: rule?.kind === "ARTEFATO" ? rule.needsResponsible !== false : true,
    minPhases: rule?.kind === "LICOES" ? rule.minPhases : 2,
    taskTitle: item?.suggestion?.title ?? "", durationDays: item?.suggestion?.durationDays ?? 1,
  };
};

function ruleOf(d: ItemDraft): Rule | null {
  const keywords = parseKeywords(d.keywords);
  if (KEYWORD_RULES.has(d.kind) && !keywords.length) return null;
  switch (d.kind) {
    case "ARTEFATO": return { kind: "ARTEFATO", keywords, phases: [d.phase], needsResponsible: d.needsResponsible };
    case "MARCO": return { kind: "MARCO", keywords, phases: [d.phase] };
    case "RISCO": return { kind: "RISCO", keywords, phases: [d.phase] };
    case "ORCAMENTO": return { kind: "ORCAMENTO", keywords };
    case "PORTOES_NO_DECIA": return { kind: "PORTOES_NO_DECIA" };
    case "LICOES": return { kind: "LICOES", minPhases: Math.max(1, Math.round(d.minPhases) || 1) };
    case "REVISAO": return { kind: "REVISAO" };
    case "OBJETIVO_ALINHADO": return { kind: "OBJETIVO_ALINHADO", source: "PDTIC" };
  }
}

/** Editor de um item do checklist do departamento (só o chefe; a tela confere o perfil). */
export function DepartmentItemForm({ item, code, checklistId, onSave, onCancel }: {
  item?: ComplianceItem;
  code: string;
  checklistId: string;
  onSave: (item: ComplianceItem) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const formId = useId();
  const [d, setD] = useState<ItemDraft>(() => draftOf(item));
  const set = (patch: Partial<ItemDraft>) => setD((x) => ({ ...x, ...patch }));
  const rule = ruleOf(d);
  const needsKeywords = KEYWORD_RULES.has(d.kind);
  const valid = Boolean(d.title.trim() && rule && (!TASK_SUGGESTION.has(d.kind) || d.taskTitle.trim()));
  const fixTab = d.kind === "PORTOES_NO_DECIA" || d.kind === "OBJETIVO_ALINHADO" || d.kind === "ORCAMENTO" ? "governanca" : d.kind === "LICOES" ? "controle" : d.kind === "REVISAO" ? "quadro" : undefined;
  const submit = () => {
    if (!valid || !rule) return;
    onSave({
      id: item?.id ?? `dep-${Date.now().toString(36)}`, code: item?.code ?? code, checklistId, title: d.title.trim(), why: d.why.trim() || undefined, basis: d.basis.trim() || t("mirror.dept.defaultBasis"),
      phase: d.phase, requirement: d.requirement, appliesTo: { kind: "SEMPRE" }, rule,
      suggestion: TASK_SUGGESTION.has(d.kind) ? { title: d.taskTitle.trim(), durationDays: Math.max(0, Number.isFinite(d.durationDays) ? d.durationDays : 1), milestone: d.kind === "MARCO" || undefined } : undefined,
      fixTab,
    });
  };
  return (
    <form aria-labelledby={`${formId}-h`} className="grid gap-3 rounded-[var(--ws-radius-md)] border border-ws-accent bg-ws-surface-1 p-[var(--ws-space-3)]" onSubmit={(e) => {
      e.preventDefault();
      submit();
    }} data-dept-form>
      <p id={`${formId}-h`} className={cn(BODY_SM, "font-semibold")}>{item ? t("mirror.dept.editTitle", { code: item.code }) : t("mirror.dept.newTitle", { code })}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("mirror.dept.title")} className="sm:col-span-2">
          {({ id }) => <Input id={id} value={d.title} onChange={(e) => set({ title: e.target.value })} />}
        </Field>
        <Field label={t("mirror.dept.why")} className="sm:col-span-2">
          {({ id }) => <Input id={id} value={d.why} onChange={(e) => set({ why: e.target.value })} />}
        </Field>
        <Field label={t("mirror.dept.basis")} hint={t("mirror.dept.basisHint")}>
          {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} value={d.basis} onChange={(e) => set({ basis: e.target.value })} />}
        </Field>
        <Field label={t("mirror.dept.phase")}>
          {({ id }) => <Select id={id} value={d.phase} onChange={(e) => set({ phase: e.target.value as ProjectPhase })} options={PROJECT_PHASES.map((p) => ({ value: p, label: t(`pm.phase.${p}`) }))} />}
        </Field>
        <Field label={t("mirror.dept.requirement")}>
          {({ id }) => (
            <Select id={id} value={d.requirement} onChange={(e) => set({ requirement: e.target.value as Requirement })}
              options={[{ value: "OBRIGATORIO", label: t("mirror.req.OBRIGATORIO") }, { value: "RECOMENDADO", label: t("mirror.req.RECOMENDADO") }]} />
          )}
        </Field>
        <Field label={t("mirror.dept.rule")} hint={t(`mirror.rule.${d.kind}.hint`)}>
          {({ id, describedBy }) => (
            <Select id={id} aria-describedby={describedBy} value={d.kind} onChange={(e) => set({ kind: e.target.value as RuleKind })}
              options={RULE_KINDS.filter((k) => k !== "OBJETIVO_ALINHADO").map((k) => ({ value: k, label: t(`mirror.rule.${k}`) }))} />
          )}
        </Field>
        {needsKeywords ? (
          <Field label={t("mirror.dept.keywords")} hint={t("mirror.dept.keywordsHint")} error={!parseKeywords(d.keywords).length ? t("mirror.dept.keywordsRequired") : undefined} className="sm:col-span-2">
            {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} value={d.keywords} onChange={(e) => set({ keywords: e.target.value })} />}
          </Field>
        ) : null}
        {d.kind === "ARTEFATO" ? <Checkbox checked={d.needsResponsible} onCheckedChange={(v) => set({ needsResponsible: v })} label={t("mirror.dept.needsResponsible")} className="sm:col-span-2" /> : null}
        {d.kind === "LICOES" ? <NumberField label={t("mirror.dept.minPhases")} value={d.minPhases} onChange={(v) => set({ minPhases: v })} /> : null}
        {TASK_SUGGESTION.has(d.kind) ? (
          <>
            <Field label={t("mirror.dept.taskTitle")} error={!d.taskTitle.trim() ? t("mirror.dept.taskRequired") : undefined}>
              {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} value={d.taskTitle} onChange={(e) => set({ taskTitle: e.target.value })} />}
            </Field>
            <NumberField label={t("mirror.dept.duration")} value={d.durationDays} onChange={(v) => set({ durationDays: v })} suffix={t("sim.unit.days")} />
          </>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>{t("pm.ui.cancel")}</Button>
        <Button type="submit" variant="primary" disabled={!valid}>{t("pm.ui.save")}</Button>
      </div>
    </form>
  );
}
