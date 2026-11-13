"use client";
/**
 * Editor das alavancas de um cenário (RF31.CA01, `ScenarioForm`): corte de orçamento, atraso de fornecedor, mudança de escopo
 * (retirar entregas, incluir entrega, mudar o esforço), indisponibilidade de pessoa e reajuste de preço. Cada mudança recalcula o
 * cenário na hora; a alavanca inválida mostra o motivo e fica de fora da conta (nunca some calada).
 */
import { useId, type ReactNode } from "react";
import { Button, Field, Input, Select, SelectList, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { parseKeywords } from "@/lib/projects/compliance/text";
import { flattenWbs, wbsTree } from "@/lib/projects/derive";
import { resolveTargets, validateLever } from "@/lib/projects/simulation/levers";
import { CUT_SOURCES, LEVER_KINDS, type Lever, type LeverKind, type TaskSelector } from "@/lib/projects/simulation/types";
import { MOSCOW, PROJECT_PHASES, type ProjectModel } from "@/lib/projects/types";
import { fmt, nameOf, type PeopleDirectory } from "../shared";
import { NumberField } from "./shared";

const CAPTION = "text-[length:var(--ws-text-caption)] text-ws-text-muted";

/** Alavanca nova com valores de partida razoáveis para o projeto. */
export function newLever(kind: LeverKind, model: ProjectModel): Lever {
  switch (kind) {
    case "CORTE_ORCAMENTO": return { kind, mode: "PERCENTUAL", value: 10, source: "RESERVA" };
    case "ATRASO_FORNECEDOR": return { kind, days: 10, mode: "ENTREGA", supplier: "", target: { taskIds: [] } };
    case "ESCOPO_RETIRAR": return { kind, wbsIds: [], taskIds: [] };
    case "ESCOPO_INCLUIR": return { kind, title: "", phase: model.currentPhase, durationDays: 5, budget: 0 };
    case "ESCOPO_ESFORCO": return { kind, pct: 20, target: {} };
    case "INDISPONIBILIDADE": {
      const busy = model.team.find((m) => model.tasks.some((t) => t.responsibleId === m.userId && t.status !== "CONCLUIDA"));
      return { kind, userId: busy?.userId ?? model.team[0]?.userId ?? "", mode: "AUSENCIA", days: 5, fromDate: model.statusDate, capacityPct: 50 };
    }
    case "REAJUSTE_PRECO": return { kind, pct: 10, budgetLineIds: [], target: {} };
  }
}

export function AddLeverMenu({ onAdd, disabled }: { onAdd: (kind: LeverKind) => void; disabled?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-2" role="group" aria-label={t("sim.lever.addLabel")}>
      <p className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("sim.lever.add")}</p>
      <div className="flex flex-wrap gap-2">
        {LEVER_KINDS.map((k) => (
          <Button key={k} size="sm" variant="default" disabled={disabled} onClick={() => onAdd(k)} data-add-lever={k}>
            + {t(`sim.lever.${k}`)}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** Escolha das atividades atingidas: lista, mais palavra no título e atividades ligadas a riscos. */
function TaskSelectorField({ label, value, onChange, model, emptyMeansAll }: { label: string; value: TaskSelector; onChange: (v: TaskSelector) => void; model: ProjectModel; emptyMeansAll?: boolean }) {
  const { t } = useI18n();
  const resolved = resolveTargets(model, value);
  const linkedRisks = model.risks.filter((r) => r.taskIds.length);
  const empty = !value.taskIds?.length && !value.keywords?.length && !value.riskIds?.length;
  return (
    <div className="grid gap-2">
      <SelectList
        label={label}
        multiple
        value={value.taskIds ?? []}
        onChange={(ids) => onChange({ ...value, taskIds: ids })}
        options={model.tasks.map((x) => ({
          id: x.id, title: `${x.code} · ${x.title}`, subtitle: `${t(`pm.phase.${x.phase}`)} · ${t(`pm.status.${x.status}`)}`,
          disabledReason: x.status === "CONCLUIDA" ? t("sim.lever.doneReason") : undefined,
        }))}
        className="max-h-56 overflow-auto"
      />
      <details className="rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-2">
        <summary className="cursor-pointer text-[length:var(--ws-text-body-sm)] font-semibold">{t("sim.lever.moreWays")}</summary>
        <div className="mt-2 grid gap-2">
          <Field label={t("sim.lever.keywords")} hint={t("sim.lever.keywordsHint")}>
            {({ id, describedBy }) => (
              <Input id={id} aria-describedby={describedBy} value={(value.keywords ?? []).join(", ")} onChange={(e) => onChange({ ...value, keywords: parseKeywords(e.target.value) })} />
            )}
          </Field>
          {linkedRisks.length ? (
            <SelectList
              label={t("sim.lever.byRisk")}
              multiple
              value={value.riskIds ?? []}
              onChange={(ids) => onChange({ ...value, riskIds: ids })}
              options={linkedRisks.map((r) => ({ id: r.id, title: r.title, subtitle: r.taskIds.map((id) => model.tasks.find((x) => x.id === id)?.code ?? id).join(", ") }))}
            />
          ) : null}
        </div>
      </details>
      <p className={CAPTION} aria-live="polite">
        {empty && emptyMeansAll ? t("sim.lever.allOpen") : resolved.length ? t("sim.lever.hits", { n: resolved.length, codes: resolved.map((id) => model.tasks.find((x) => x.id === id)?.code ?? id).join(", ") }) : t("sim.lever.noHits")}
      </p>
    </div>
  );
}

export function LeverCard({ lever, index, model, people, onChange, onRemove }: {
  lever: Lever;
  index: number;
  model: ProjectModel;
  people: PeopleDirectory;
  onChange: (lever: Lever) => void;
  onRemove: () => void;
}) {
  const { t, intl } = useI18n();
  const headId = useId();
  const error = validateLever(lever, model);
  const set = <K extends Lever>(patch: Partial<K>) => onChange({ ...lever, ...patch } as Lever);
  const base = model.tasks.reduce((s, x) => s + x.budget, 0) + model.reserves.contingency + model.reserves.management;

  let body: ReactNode = null;
  switch (lever.kind) {
    case "CORTE_ORCAMENTO":
      body = (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t("sim.lever.cut.mode")}>
            {({ id }) => (
              <Select id={id} value={lever.mode} onChange={(e) => set({ mode: e.target.value as "PERCENTUAL" | "VALOR" })}
                options={[{ value: "PERCENTUAL", label: t("sim.lever.cut.PERCENTUAL") }, { value: "VALOR", label: t("sim.lever.cut.VALOR") }]} />
            )}
          </Field>
          <NumberField label={t(lever.mode === "PERCENTUAL" ? "sim.lever.cut.pct" : "sim.lever.cut.amount")} value={lever.value} onChange={(v) => set({ value: v })} suffix={lever.mode === "PERCENTUAL" ? "%" : "R$"}
            hint={lever.mode === "PERCENTUAL" ? t("sim.lever.cut.base", { base: fmt.money(intl, base) }) : undefined} />
          <Field label={t("sim.lever.cut.source")} hint={t(`sim.lever.cut.sourceHint.${lever.source}`)}>
            {({ id, describedBy }) => (
              <Select id={id} aria-describedby={describedBy} value={lever.source} onChange={(e) => set({ source: e.target.value as typeof lever.source })}
                options={CUT_SOURCES.map((s) => ({ value: s, label: t(`sim.lever.cut.source.${s}`) }))} />
            )}
          </Field>
        </div>
      );
      break;
    case "ATRASO_FORNECEDOR":
      body = (
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t("sim.lever.delay.supplier")}>
              {({ id }) => <Input id={id} value={lever.supplier ?? ""} placeholder={t("sim.lever.delay.supplierPlaceholder")} onChange={(e) => set({ supplier: e.target.value })} />}
            </Field>
            <NumberField label={t("sim.lever.delay.days")} value={lever.days} onChange={(v) => set({ days: v })} suffix={t("sim.unit.days")} />
            <Field label={t("sim.lever.delay.mode")} hint={t(`sim.lever.delay.modeHint.${lever.mode}`)}>
              {({ id, describedBy }) => (
                <Select id={id} aria-describedby={describedBy} value={lever.mode} onChange={(e) => set({ mode: e.target.value as "ENTREGA" | "DURACAO" })}
                  options={[{ value: "ENTREGA", label: t("sim.lever.delay.ENTREGA") }, { value: "DURACAO", label: t("sim.lever.delay.DURACAO") }]} />
              )}
            </Field>
          </div>
          <TaskSelectorField label={t("sim.lever.delay.tasks")} value={lever.target} onChange={(target) => set({ target })} model={model} />
        </div>
      );
      break;
    case "ESCOPO_RETIRAR": {
      const nodes = flattenWbs(wbsTree(model.wbs)).filter((n) => n.depth > 0);
      body = (
        <div className="grid gap-3 md:grid-cols-2">
          <SelectList label={t("sim.lever.remove.wbs")} multiple value={lever.wbsIds} onChange={(ids) => set({ wbsIds: ids })}
            options={nodes.map((n) => ({ id: n.node.id, title: `${n.code} · ${n.node.title}`, subtitle: t("sim.lever.remove.wbsSub", { n: model.tasks.filter((x) => x.wbsId === n.node.id).length }) }))}
            className="max-h-56 overflow-auto" />
          <SelectList label={t("sim.lever.remove.tasks")} multiple value={lever.taskIds} onChange={(ids) => set({ taskIds: ids })}
            options={model.tasks.map((x) => ({
              id: x.id, title: `${x.code} · ${x.title}`, subtitle: `${fmt.money(intl, x.budget)}${x.moscow ? ` · ${t(`pm.moscow.${x.moscow}`)}` : ""}`,
              disabledReason: x.status !== "A_FAZER" || x.percentComplete > 0 ? t("sim.lever.startedReason") : undefined,
            }))}
            className="max-h-56 overflow-auto" />
          <p className={cn(CAPTION, "md:col-span-2")}>{t("sim.lever.remove.hint")}</p>
        </div>
      );
      break;
    }
    case "ESCOPO_INCLUIR": {
      const taskOptions = [{ value: "", label: t("sim.lever.add.none") }, ...model.tasks.map((x) => ({ value: x.id, label: `${x.code} · ${x.title}` }))];
      body = (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t("sim.lever.add.title")} className="sm:col-span-2 lg:col-span-3">
            {({ id }) => <Input id={id} value={lever.title} placeholder={t("sim.lever.add.titlePlaceholder")} onChange={(e) => set({ title: e.target.value })} />}
          </Field>
          <Field label={t("sim.lever.add.phase")}>
            {({ id }) => <Select id={id} value={lever.phase} onChange={(e) => set({ phase: e.target.value as typeof lever.phase })} options={PROJECT_PHASES.map((p) => ({ value: p, label: t(`pm.phase.${p}`) }))} />}
          </Field>
          <NumberField label={t("sim.lever.add.duration")} value={lever.durationDays} onChange={(v) => set({ durationDays: v })} suffix={t("sim.unit.days")} />
          <NumberField label={t("sim.lever.add.budget")} value={lever.budget} onChange={(v) => set({ budget: v })} suffix="R$" />
          <Field label={t("sim.lever.add.moscow")}>
            {({ id }) => (
              <Select id={id} value={lever.moscow ?? ""} onChange={(e) => set({ moscow: (e.target.value || undefined) as typeof lever.moscow })}
                options={[{ value: "", label: t("sim.lever.add.none") }, ...MOSCOW.map((m) => ({ value: m, label: t(`pm.moscow.${m}`) }))]} />
            )}
          </Field>
          <Field label={t("sim.lever.add.after")}>
            {({ id }) => <Select id={id} value={lever.afterTaskId ?? ""} onChange={(e) => set({ afterTaskId: e.target.value || undefined })} options={taskOptions} />}
          </Field>
          <Field label={t("sim.lever.add.before")}>
            {({ id }) => <Select id={id} value={lever.beforeTaskId ?? ""} onChange={(e) => set({ beforeTaskId: e.target.value || undefined })} options={taskOptions} />}
          </Field>
          {!lever.afterTaskId && !lever.beforeTaskId ? <p className={cn(CAPTION, "sm:col-span-2 lg:col-span-3")}>{t("sim.lever.add.parallelHint")}</p> : null}
        </div>
      );
      break;
    }
    case "ESCOPO_ESFORCO":
      body = (
        <div className="grid gap-3">
          <NumberField label={t("sim.lever.effort.pct")} value={lever.pct} onChange={(v) => set({ pct: v })} suffix="%" hint={t("sim.lever.effort.hint")} className="max-w-xs" />
          <TaskSelectorField label={t("sim.lever.effort.tasks")} value={lever.target} onChange={(target) => set({ target })} model={model} emptyMeansAll />
        </div>
      );
      break;
    case "INDISPONIBILIDADE":
      body = (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t("sim.lever.resource.person")}>
            {({ id }) => (
              <Select id={id} value={lever.userId} onChange={(e) => set({ userId: e.target.value })}
                options={model.team.map((m) => ({ value: m.userId, label: `${nameOf(people, m.userId)} · ${t(`pm.role.${m.role}`)}` }))} />
            )}
          </Field>
          <Field label={t("sim.lever.resource.mode")}>
            {({ id }) => (
              <Select id={id} value={lever.mode} onChange={(e) => set({ mode: e.target.value as "AUSENCIA" | "CAPACIDADE" })}
                options={[{ value: "AUSENCIA", label: t("sim.lever.resource.AUSENCIA") }, { value: "CAPACIDADE", label: t("sim.lever.resource.CAPACIDADE") }]} />
            )}
          </Field>
          {lever.mode === "AUSENCIA" ? (
            <>
              <Field label={t("sim.lever.resource.from")}>
                {({ id }) => <Input id={id} type="date" value={lever.fromDate ?? model.statusDate} onChange={(e) => set({ fromDate: e.target.value || undefined })} />}
              </Field>
              <NumberField label={t("sim.lever.resource.days")} value={lever.days} onChange={(v) => set({ days: v })} suffix={t("sim.unit.days")} />
            </>
          ) : (
            <NumberField label={t("sim.lever.resource.capacity")} value={lever.capacityPct} onChange={(v) => set({ capacityPct: v })} suffix="%" />
          )}
          <p className={cn(CAPTION, "sm:col-span-2 lg:col-span-4")}>{t(`sim.lever.resource.hint.${lever.mode}`)}</p>
        </div>
      );
      break;
    case "REAJUSTE_PRECO":
      body = (
        <div className="grid gap-3">
          <NumberField label={t("sim.lever.price.pct")} value={lever.pct} onChange={(v) => set({ pct: v })} suffix="%" className="max-w-xs" />
          <div className="grid gap-3 md:grid-cols-2">
            <SelectList label={t("sim.lever.price.lines")} multiple value={lever.budgetLineIds} onChange={(ids) => set({ budgetLineIds: ids })}
              options={model.budgetLines.map((b) => ({ id: b.id, title: b.title, subtitle: fmt.money(intl, b.amount) }))} />
            <TaskSelectorField label={t("sim.lever.price.tasks")} value={lever.target} onChange={(target) => set({ target })} model={model} />
          </div>
          <p className={CAPTION}>{t("sim.lever.price.hint")}</p>
        </div>
      );
      break;
  }

  return (
    <li>
      <article aria-labelledby={headId} data-lever={lever.kind} data-invalid={error ?? undefined} className={cn("grid gap-3 rounded-[var(--ws-radius-lg)] border bg-ws-surface-1 p-[var(--ws-space-3)]", error ? "border-ws-danger" : "border-ws-border")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 id={headId} className="font-semibold">
            <span className="font-[family-name:var(--ws-font-mono)] text-ws-text-muted">{index + 1}.</span> {t(`sim.lever.${lever.kind}`)}
          </h4>
          <Button size="sm" variant="ghost" onClick={onRemove} aria-label={t("sim.lever.remove", { n: index + 1, kind: t(`sim.lever.${lever.kind}`) })}>
            {t("pm.ui.remove")}
          </Button>
        </div>
        {body}
        {error ? <p role="alert" className="text-[length:var(--ws-text-caption)] font-medium text-ws-danger-ink"><span aria-hidden>✕ </span>{t(`sim.error.${error}`)}</p> : null}
      </article>
    </li>
  );
}
