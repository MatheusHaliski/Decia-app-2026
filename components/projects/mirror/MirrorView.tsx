"use client";
/**
 * Espelho de Conformidade e checklists regulatórios (RF32): confronta a estrutura do projeto com checklists legais (federais),
 * diretrizes estaduais e municipais de EXEMPLO e o checklist do departamento; mostra, por item, ATENDIDO (com o que atende),
 * PARCIAL, FALTANDO ou NÃO SE APLICA (com o motivo), o placar por fonte e por fase, sugere a tarefa técnica faltante (uma ou em
 * lote, com prévia) pelo comando existente da Mesa e mostra o portão da Aprovação, que o chefe libera com justificativa.
 * Perfis: o chefe é revisor (lê, mantém o checklist do departamento, justifica a liberação; RF32.CA06); a equipe cria as tarefas.
 */
import { useMemo, useState, type ReactNode } from "react";
import { Button, Card, Field, Link, PercentBar, Select, Tag, Textarea, cn, useToast, type Tone } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import type { CommandResult, ProjectCommand } from "@/lib/projects/commands";
import { CATALOG_VERSION, defaultChecklists, DEPARTMENT_CHECKLIST_ID } from "@/lib/projects/compliance/catalog";
import { approvalGate, evaluateMirror, type GateStatus } from "@/lib/projects/compliance/evaluate";
import { demoComplianceRepository, nextDepartmentCode, useCompliance, type ComplianceRepository } from "@/lib/projects/compliance/store";
import { createSuggestedTasks, moveCommand, type SuggestionPlan } from "@/lib/projects/compliance/suggest";
import { CHECKLIST_SOURCES, ITEM_STATUSES, SIGNALS, type ChecklistSource, type ItemResult, type ItemStatus } from "@/lib/projects/compliance/types";
import { PROJECT_PHASES, type ProjectModel, type ProjectPhase } from "@/lib/projects/types";
import { fmt, nameOf, type PeopleDirectory } from "../shared";
import { Heading, SparkReading } from "../simulate/shared";
import { DepartmentItemForm, SuggestDialog, WaiveDialog } from "./MirrorDialogs";
import { appliesLabel, checklistName, evidenceText, itemBasis, itemTitle, itemWhy, reasonText } from "./labels";

const CAPTION = "text-[length:var(--ws-text-caption)] text-ws-text-muted";
const BODY_SM = "text-[length:var(--ws-text-body-sm)]";
const STATUS_TONE: Record<ItemStatus, Tone> = { ATENDIDO: "success", PARCIAL: "warning", FALTANDO: "danger", NAO_SE_APLICA: "neutral" };
const STATUS_MARK: Record<ItemStatus, string> = { ATENDIDO: "✓", PARCIAL: "◐", FALTANDO: "✕", NAO_SE_APLICA: "–" };
const GATE_TONE: Record<GateStatus, Tone> = { LIBERADO: "success", LIBERADO_COM_JUSTIFICATIVA: "warning", BLOQUEADO: "danger" };

export function StatusTag({ status }: { status: ItemStatus }) {
  const { t } = useI18n();
  return (
    <Tag tone={STATUS_TONE[status]}>
      <span aria-hidden>{STATUS_MARK[status]}</span>
      {t(`mirror.status.${status}`)}
    </Tag>
  );
}

export interface MirrorViewProps {
  model: ProjectModel;
  dispatch: (cmd: ProjectCommand) => CommandResult;
  people: PeopleDirectory;
  actorId: string;
  /** a equipe do projeto cria tarefas e marca "não se aplica"; o chefe revisor só lê (RF32.CA06) */
  canEditProject: boolean;
  /** o chefe (ou a empresa) cria e edita os itens do checklist do departamento (RF32.CA01) */
  canEditChecklist: boolean;
  /** o chefe libera a passagem para a Aprovação com justificativa (RF32.CA04) */
  canOverride: boolean;
  repo?: ComplianceRepository;
}

type Filter = { source: ChecklistSource | ""; status: ItemStatus | ""; phase: ProjectPhase | "" };

export function MirrorView({ model, dispatch, people, actorId, canEditProject, canEditChecklist, canOverride, repo: repoProp }: MirrorViewProps) {
  const { t, intl } = useI18n();
  const { toast } = useToast();
  const repo = repoProp ?? demoComplianceRepository();
  const { department, state, ctx } = useCompliance(model.id, repo);
  const result = useMemo(() => evaluateMirror(model, ctx), [model, ctx]);
  const checklists = useMemo(() => ctx.checklists ?? defaultChecklists(department), [ctx, department]);
  const gate = approvalGate(result, state.override);
  const [filter, setFilter] = useState<Filter>({ source: "", status: "", phase: "" });
  const [suggesting, setSuggesting] = useState<ItemResult[] | null>(null);
  const [waiving, setWaiving] = useState<ItemResult | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [overrideText, setOverrideText] = useState("");
  const [announce, setAnnounce] = useState("");

  const suggestable = result.items.filter((r) => r.canSuggest);
  const s = result.score;
  const shown = result.items.filter((r) => (!filter.source || r.source === filter.source) && (!filter.status || r.status === filter.status) && (!filter.phase || r.item.phase === filter.phase));

  const createTasks = (plans: SuggestionPlan[]) => {
    const out = createSuggestedTasks(dispatch, plans);
    if (out.created.length) repo.link(model.id, out.created.map((c) => ({ taskId: c.taskId, itemId: c.itemId, by: actorId, at: new Date().toISOString() })));
    setSuggesting(null);
    const codes = out.created.map((c) => c.code).join(", ");
    const msg = out.failed.length ? t("mirror.suggest.partial", { codes: codes || "—", n: out.failed.length }) : t("mirror.suggest.done", { codes });
    setAnnounce(msg);
    toast({ title: msg, tone: out.failed.length ? "erro" : "sucesso" });
  };
  const move = (r: ItemResult) => {
    const cmd = moveCommand(r);
    if (!cmd) return;
    const res = dispatch(cmd);
    if (!res.ok) toast({ title: t(`pm.err.${res.error}`), tone: "erro" });
    else setAnnounce(t("mirror.item.moved", { code: model.tasks.find((x) => x.id === cmd.id)?.code ?? "", phase: t(`pm.phase.${cmd.phase}`) }));
  };

  const ai = [
    t("mirror.ai.score", { pct: s.percent === null ? "—" : fmt.percent(intl, s.percent / 100), met: s.met, applicable: s.applicable }),
    result.blocking.length ? t("mirror.ai.blocking", { n: result.blocking.length, items: result.blocking.slice(0, 4).map((r) => r.item.code).join(", ") }) : t("mirror.ai.noBlocking"),
    ...(result.blocking[0] ? [t("mirror.ai.first", { code: result.blocking[0].item.code, title: itemTitle(t, result.blocking[0].item), phase: t(`pm.phase.${result.blocking[0].item.phase}`) })] : []),
    ...(suggestable.length ? [t("mirror.ai.suggest", { n: suggestable.length })] : []),
    t("mirror.ai.partial", { n: s.partial }),
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-[var(--ws-space-5)]" data-mirror={model.id}>
      <div className="grid gap-2">
        <p role="note" className="rounded-[var(--ws-radius-md)] border border-ws-info bg-ws-info-soft px-3 py-2 text-[length:var(--ws-text-body-sm)]">
          {t("mirror.catalog.note", { version: CATALOG_VERSION })}
        </p>
        {!canEditProject ? <p role="status" className="rounded-[var(--ws-radius-md)] border border-ws-warning bg-ws-warning-soft px-3 py-2 text-[length:var(--ws-text-body-sm)]">{t(model.closure.archived ? "pm.ui.readOnly" : "mirror.role.reviewer")}</p> : null}
        <p className="sr-only" aria-live="polite">{announce}</p>
      </div>

      {/* placar */}
      <Card as="section" aria-labelledby="mirror-score" className="grid gap-[var(--ws-space-3)]">
        <Heading id="mirror-score" actions={canEditProject && suggestable.length ? <Button variant="primary" icon="criar-tarefa" onClick={() => setSuggesting(suggestable)}>{t("mirror.suggest.batch", { n: suggestable.length })}</Button> : null}>
          {t("mirror.score.title")}
        </Heading>
        <PercentBar value={s.percent ?? 0} label={t("mirror.score.label", { met: s.met, applicable: s.applicable })} tone={s.percent !== null && s.percent >= 80 ? "success" : s.percent !== null && s.percent >= 50 ? "warning" : "danger"} />
        <ul className="flex flex-wrap gap-2" aria-label={t("mirror.score.counts")}>
          <li><Tag tone="success"><span aria-hidden>✓</span>{t("mirror.score.met", { n: s.met })}</Tag></li>
          <li><Tag tone="warning"><span aria-hidden>◐</span>{t("mirror.score.partial", { n: s.partial })}</Tag></li>
          <li><Tag tone="danger"><span aria-hidden>✕</span>{t("mirror.score.missing", { n: s.missing })}</Tag></li>
          <li><Tag><span aria-hidden>–</span>{t("mirror.score.na", { n: s.notApplicable })}</Tag></li>
          <li><Tag tone={result.blocking.length ? "danger" : "success"} filled={result.blocking.length > 0}><span aria-hidden>⛔</span>{t("mirror.score.blocking", { n: result.blocking.length })}</Tag></li>
        </ul>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" data-by-source>
          {CHECKLIST_SOURCES.map((src) => {
            const x = result.bySource[src];
            return (
              <div key={src} className="grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-2.5" data-source={src}>
                <p className="flex flex-wrap items-center gap-1.5 font-semibold">{t(`mirror.source.${src}`)}{src === "ESTADUAL" || src === "MUNICIPAL" ? <Tag tone="info">{t("mirror.example")}</Tag> : null}</p>
                <PercentBar value={x.percent ?? 0} size="sm" showValue={false} label={x.applicable ? t("mirror.score.sourceLine", { pct: fmt.percent(intl, (x.percent ?? 0) / 100), met: x.met, applicable: x.applicable }) : t("mirror.score.sourceNone")} />
                <p className={CAPTION}>{t("mirror.score.sourceDetail", { partial: x.partial, missing: x.missing, na: x.notApplicable })}</p>
              </div>
            );
          })}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-[length:var(--ws-text-body-sm)]" data-by-phase>
            <caption className="sr-only">{t("mirror.score.byPhase")}</caption>
            <thead>
              <tr className="border-b border-ws-border text-left">
                <th scope="col" className="p-1.5 font-semibold">{t("mirror.score.phase")}</th>
                <th scope="col" className="p-1.5 font-semibold">{t("mirror.status.ATENDIDO")}</th>
                <th scope="col" className="p-1.5 font-semibold">{t("mirror.status.PARCIAL")}</th>
                <th scope="col" className="p-1.5 font-semibold">{t("mirror.status.FALTANDO")}</th>
                <th scope="col" className="p-1.5 font-semibold">{t("mirror.status.NAO_SE_APLICA")}</th>
                <th scope="col" className="p-1.5 font-semibold">%</th>
              </tr>
            </thead>
            <tbody>
              {PROJECT_PHASES.map((p) => {
                const x = result.byPhase[p];
                return (
                  <tr key={p} className="border-b border-ws-border last:border-0" data-phase-row={p}>
                    <th scope="row" className="p-1.5 text-left font-semibold">{t(`pm.phase.${p}`)}{p === model.currentPhase ? <span className="font-normal text-ws-text-muted"> · {t("mirror.score.current")}</span> : null}</th>
                    <td className="p-1.5 tabular-nums">{x.met}</td>
                    <td className="p-1.5 tabular-nums">{x.partial}</td>
                    <td className="p-1.5 tabular-nums">{x.missing}</td>
                    <td className="p-1.5 tabular-nums">{x.notApplicable}</td>
                    <td className="p-1.5 tabular-nums">{x.percent === null ? "—" : fmt.percent(intl, x.percent / 100)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* portão da Aprovação (RF32.CA04) */}
      <Card as="section" aria-labelledby="mirror-gate" className="grid gap-[var(--ws-space-3)]" data-gate={gate.status}>
        <Heading id="mirror-gate">{t("mirror.gate.title")}</Heading>
        <p className="flex flex-wrap items-center gap-2">
          <Tag tone={GATE_TONE[gate.status]} filled><span aria-hidden>{gate.status === "BLOQUEADO" ? "⛔" : "✓"}</span>{t(`mirror.gate.${gate.status}`)}</Tag>
          {gate.blocking.length ? <span className={BODY_SM}>{t("mirror.gate.blocking", { codes: gate.blocking.join(", ") })}</span> : null}
        </p>
        <p className={CAPTION}>{t("mirror.gate.hint")}</p>
        {state.override ? (
          <div className="grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-warning bg-ws-warning-soft p-2.5 text-[length:var(--ws-text-body-sm)]" data-override>
            <p>{t("mirror.gate.overrideBy", { name: nameOf(people, state.override.by), date: fmt.date(intl, state.override.at), codes: state.override.blockingCodes.join(", ") })}</p>
            <p className="italic">“{state.override.reason}”</p>
            {gate.uncovered.length && gate.status === "BLOQUEADO" ? <p className="font-semibold text-ws-danger-ink"><span aria-hidden>✕ </span>{t("mirror.gate.uncovered", { codes: gate.uncovered.join(", ") })}</p> : null}
            {canOverride ? <Button size="sm" variant="ghost" className="justify-self-start" onClick={() => repo.setOverride(model.id, null)}>{t("mirror.gate.revoke")}</Button> : null}
          </div>
        ) : null}
        {canOverride && gate.status === "BLOQUEADO" ? (
          <form className="grid gap-2" onSubmit={(e) => {
            e.preventDefault();
            if (overrideText.trim().length < 20) return;
            repo.setOverride(model.id, { by: actorId, reason: overrideText.trim(), at: new Date().toISOString(), blockingCodes: gate.blocking });
            setOverrideText("");
          }}>
            <Field label={t("mirror.gate.reason")} hint={t("mirror.gate.reasonHint")}>
              {({ id, describedBy }) => <Textarea id={id} aria-describedby={describedBy} value={overrideText} onChange={(e) => setOverrideText(e.target.value)} />}
            </Field>
            <Button type="submit" size="sm" variant="danger" className="justify-self-start" disabled={overrideText.trim().length < 20}>{t("mirror.gate.override")}</Button>
          </form>
        ) : !canOverride && gate.status === "BLOQUEADO" ? <p className={CAPTION}>{t("mirror.gate.onlyChief")}</p> : null}
      </Card>

      {/* sinais: em que tipo de projeto o catálogo enquadrou este */}
      <section aria-labelledby="mirror-signals" className="grid gap-2">
        <Heading id="mirror-signals">{t("mirror.signals.title")}</Heading>
        <p className={CAPTION}>{t("mirror.signals.hint")}</p>
        <ul className="grid gap-1.5 md:grid-cols-2" data-signals>
          {SIGNALS.map((sig) => {
            const x = result.signals[sig];
            return (
              <li key={sig} className="flex flex-wrap items-start gap-2 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-2" data-signal={sig} data-on={x.on}>
                <Tag tone={x.on ? "accent" : "neutral"}><span aria-hidden>{x.on ? "●" : "○"}</span>{t(x.on ? "mirror.signals.on" : "mirror.signals.off")}</Tag>
                <span className="min-w-0 flex-1">
                  <span className={cn(BODY_SM, "block font-semibold")}>{t(`mirror.signal.${sig}`)}</span>
                  <span className={cn(CAPTION, "block [overflow-wrap:anywhere]")}>{x.on ? x.evidence.slice(0, 3).map((e) => evidenceText(t, e, people)).join("; ") : t("mirror.signals.none")}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <SparkReading title={t("mirror.ai.title")} lines={ai} testId="mirror" />

      {/* itens por checklist */}
      <section aria-labelledby="mirror-items" className="grid gap-[var(--ws-space-3)]">
        <Heading id="mirror-items">{t("mirror.items.title")}</Heading>
        <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label={t("mirror.filter.label")}>
          <Field label={t("mirror.filter.source")}>
            {({ id }) => <Select id={id} value={filter.source} onChange={(e) => setFilter((f) => ({ ...f, source: e.target.value as Filter["source"] }))} options={[{ value: "", label: t("mirror.filter.all") }, ...CHECKLIST_SOURCES.map((x) => ({ value: x, label: t(`mirror.source.${x}`) }))]} />}
          </Field>
          <Field label={t("mirror.filter.status")}>
            {({ id }) => <Select id={id} value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value as Filter["status"] }))} options={[{ value: "", label: t("mirror.filter.all") }, ...ITEM_STATUSES.map((x) => ({ value: x, label: t(`mirror.status.${x}`) }))]} />}
          </Field>
          <Field label={t("mirror.filter.phase")}>
            {({ id }) => <Select id={id} value={filter.phase} onChange={(e) => setFilter((f) => ({ ...f, phase: e.target.value as Filter["phase"] }))} options={[{ value: "", label: t("mirror.filter.all") }, ...PROJECT_PHASES.map((x) => ({ value: x, label: t(`pm.phase.${x}`) }))]} />}
          </Field>
        </div>
        <p className={CAPTION} aria-live="polite">{t("mirror.filter.count", { n: shown.length, total: result.items.length })}</p>
        {checklists.map((c) => {
          const rows = shown.filter((r) => r.item.checklistId === c.id);
          const isDept = c.id === DEPARTMENT_CHECKLIST_ID || c.source === "DEPARTAMENTO";
          if (!rows.length && !(isDept && canEditChecklist && editing)) return null;
          return (
            <Card key={c.id} as="section" aria-label={checklistName(t, c)} padding="sm" className="grid gap-2" data-checklist={c.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="flex flex-wrap items-center gap-1.5 font-semibold">
                    {checklistName(t, c)}
                    <Tag>{t(`mirror.source.${c.source}`)}</Tag>
                    {c.example ? <Tag tone="info">{t("mirror.example")}</Tag> : null}
                  </h3>
                  <p className={CAPTION}>{itemBasis(t, c)} · {t("mirror.version", { v: c.version })}</p>
                  {c.example ? <p className={CAPTION}>{t("mirror.exampleHint")}</p> : null}
                </div>
                {isDept && canEditChecklist ? <Button size="sm" variant="primary" onClick={() => setEditing("new")} disabled={editing !== null}>{t("mirror.dept.new")}</Button> : null}
              </div>
              {isDept && !canEditChecklist ? <p className={CAPTION}>{t("mirror.dept.onlyChief")}</p> : null}
              {isDept && editing === "new" ? (
                <DepartmentItemForm code={nextDepartmentCode(department.items)} checklistId={department.id} onCancel={() => setEditing(null)} onSave={(item) => {
                  repo.saveDepartmentItem(item);
                  setEditing(null);
                  setAnnounce(t("mirror.dept.saved", { code: item.code }));
                }} />
              ) : null}
              <ul className="grid gap-2">
                {rows.map((r) => (
                  <ItemRow
                    key={r.item.id}
                    r={r}
                    model={model}
                    people={people}
                    canEditProject={canEditProject}
                    editingThis={editing === r.item.id}
                    canEditItem={isDept && canEditChecklist}
                    onSuggest={() => setSuggesting([r])}
                    onMove={() => move(r)}
                    onWaive={() => setWaiving(r)}
                    onUnwaive={() => repo.unwaive(model.id, r.item.id)}
                    onEdit={() => setEditing(r.item.id)}
                    onRemove={() => repo.removeDepartmentItem(r.item.id)}
                    editor={editing === r.item.id ? (
                      <DepartmentItemForm item={r.item} code={r.item.code} checklistId={department.id} onCancel={() => setEditing(null)} onSave={(item) => {
                        repo.saveDepartmentItem(item);
                        setEditing(null);
                        setAnnounce(t("mirror.dept.saved", { code: item.code }));
                      }} />
                    ) : null}
                  />
                ))}
              </ul>
            </Card>
          );
        })}
      </section>

      {suggesting ? <SuggestDialog key={suggesting.map((r) => r.item.id).join()} open onOpenChange={(o) => !o && setSuggesting(null)} results={suggesting} model={model} people={people} onConfirm={createTasks} /> : null}
      {waiving ? (
        <WaiveDialog key={waiving.item.id} open onOpenChange={(o) => !o && setWaiving(null)} result={waiving} onConfirm={(reason) => {
          repo.waive(model.id, { itemId: waiving.item.id, reason, by: actorId, at: new Date().toISOString() });
          setAnnounce(t("mirror.waive.done", { code: waiving.item.code }));
          setWaiving(null);
        }} />
      ) : null}
    </div>
  );
}

function ItemRow({ r, model, people, canEditProject, canEditItem, editingThis, editor, onSuggest, onMove, onWaive, onUnwaive, onEdit, onRemove }: {
  r: ItemResult;
  model: ProjectModel;
  people: PeopleDirectory;
  canEditProject: boolean;
  canEditItem: boolean;
  editingThis: boolean;
  editor: ReactNode;
  onSuggest: () => void;
  onMove: () => void;
  onWaive: () => void;
  onUnwaive: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { t, intl } = useI18n();
  const why = itemWhy(t, r.item);
  const moveTask = r.moveTaskId ? model.tasks.find((x) => x.id === r.moveTaskId) : undefined;
  const fixTab = r.item.fixTab;
  const canWaive = canEditProject && r.status !== "NAO_SE_APLICA";
  return (
    <li className={cn("grid gap-1.5 rounded-[var(--ws-radius-md)] border border-l-4 bg-ws-surface-1 p-2.5", r.status === "ATENDIDO" ? "border-ws-border border-l-ws-success" : r.status === "PARCIAL" ? "border-ws-border border-l-ws-warning" : r.status === "FALTANDO" ? "border-ws-border border-l-ws-danger" : "border-ws-border border-l-ws-border")} data-item={r.item.code} data-status={r.status}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusTag status={r.status} />
        <Tag tone={r.item.requirement === "OBRIGATORIO" ? "accent" : "neutral"}>{r.item.requirement === "OBRIGATORIO" ? <span aria-hidden>⛔</span> : null}{t(`mirror.req.${r.item.requirement}`)}</Tag>
        <span className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] text-ws-text-muted">{r.item.code}</span>
        <span className="min-w-0 flex-1 font-semibold [overflow-wrap:anywhere]">{itemTitle(t, r.item)}</span>
      </div>
      <p className={CAPTION}>
        {t("mirror.item.meta", { basis: itemBasis(t, r.item), phase: t(`pm.phase.${r.item.phase}`), applies: appliesLabel(t, r.item.appliesTo) })}
      </p>
      {why ? <p className={cn(BODY_SM, "text-ws-text-muted")}>{why}</p> : null}
      <p className={BODY_SM} data-reason={r.reason.code}>{reasonText(t, intl, r, people)}</p>
      {r.evidence.length > 2 ? (
        <details className={BODY_SM}>
          <summary className="cursor-pointer text-ws-text-muted">{t("mirror.item.allEvidence", { n: r.evidence.length })}</summary>
          <ul className="mt-1 grid gap-0.5 pl-3">{r.evidence.map((e) => <li key={`${e.kind}:${e.id}`}>{evidenceText(t, e, people)}</li>)}</ul>
        </details>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {canEditProject && r.canSuggest ? <Button size="sm" variant="primary" icon="criar-tarefa" onClick={onSuggest}>{t("mirror.item.suggest")}</Button> : null}
        {canEditProject && moveTask ? <Button size="sm" onClick={onMove}>{t("mirror.item.move", { code: moveTask.code, phase: t(`pm.phase.${r.item.phase}`) })}</Button> : null}
        {fixTab && r.status !== "ATENDIDO" && r.status !== "NAO_SE_APLICA" ? <Link href={`/projects/${model.id}/edit?aba=${fixTab}`}>{t("mirror.item.fixIn", { tab: t(`pm.tab.${fixTab}`) })}</Link> : null}
        {r.reason.code === "SEM_RESPONSAVEL" ? <Link href={`/projects/${model.id}/edit`}>{t("mirror.item.assign")}</Link> : null}
        {canWaive ? <Button size="sm" variant="ghost" onClick={onWaive}>{t("mirror.item.waive")}</Button> : null}
        {r.waiver && canEditProject ? <Button size="sm" variant="ghost" onClick={onUnwaive}>{t("mirror.item.unwaive")}</Button> : null}
        {canEditItem && !editingThis ? (
          <>
            <Button size="sm" variant="ghost" onClick={onEdit}>{t("pm.ui.edit")}</Button>
            <Button size="sm" variant="ghost" onClick={onRemove} aria-label={t("mirror.dept.removeLabel", { code: r.item.code })}>{t("pm.ui.remove")}</Button>
          </>
        ) : null}
      </div>
      {editor}
    </li>
  );
}
