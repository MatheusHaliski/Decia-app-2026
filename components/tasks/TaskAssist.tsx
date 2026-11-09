"use client";
/**
 * Assistente da área no criador de tarefas (RF4 + RF81 + RF43): não só lista as áreas — integra cada uma de verdade:
 *  1. CAMPO DE ESTUDO: a lente da profissão (pacote de domínio carregado sob demanda);
 *  2. MODELOS INICIAIS: da área (9 áreas) e do campo (tarefas-guia e próprias do pacote), aplicados com um clique;
 *  3. FEEDBACK DE QUALIDADE: checagem essencial + regras da área + rubrica do campo, que se atualiza a cada tecla e oferece a
 *     correção pronta ("adicionar este critério", "usar esta referência", "restringir o acesso").
 * Números e achados são do sistema (D-12): sem motor de IA conectado, a interface diz que a leitura foi montada a partir deles.
 */
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Field, Select, Tag, cn, type Tone } from "@/components/ui";
import type { OccupationPack } from "@/lib/career/occupationPack";
import { baseLocale } from "@/lib/i18n/state";
import { useI18n } from "@/lib/i18n/useI18n";
import { AREA_TEMPLATES } from "@/lib/tasks/areaTemplates";
import { fieldByCode } from "@/lib/tasks/areas";
import { WORK_AREAS, type WorkArea } from "@/lib/tasks/client";
import { FIELD_INDEX, PACK_LOADERS } from "@/lib/tasks/fieldIndex.gen";
import { assessTask, type CheckGroup, type CheckStatus, type QualityCheck, type QuickFix } from "@/lib/tasks/quality";
import { packTemplates, type TaskDraft, type TaskTemplate } from "@/lib/tasks/templates";

export interface TaskAssistProps {
  draft: TaskDraft;
  fieldCode: string | null;
  onFieldChange: (code: string | null) => void;
  onAreaChange: (area: WorkArea) => void;
  onApplyTemplate: (tpl: TaskTemplate) => void;
  onFix: (fix: QuickFix) => void;
  /** o formulário já tem conteúdo: aplicar um modelo pede confirmação */
  hasContent: boolean;
  /** modelo pedido pela URL (`/tasks/new?modelo=`), aplicado uma vez quando disponível */
  templateId?: string | null;
}

const STATUS_TONE: Record<CheckStatus, Tone> = { OK: "success", AVISO: "warning", FALTA: "danger" };
const STATUS_MARK: Record<CheckStatus, string> = { OK: "✓", AVISO: "!", FALTA: "✕" };
const READY_TONE = { PRONTA: "success", QUASE: "warning", INCOMPLETA: "danger" } as const;

export function TaskAssist({ draft, fieldCode, onFieldChange, onAreaChange, onApplyTemplate, onFix, hasContent, templateId }: TaskAssistProps) {
  const { t, locale } = useI18n();
  const lang = baseLocale(locale) as "pt-BR" | "en" | "es";
  const field = fieldByCode(fieldCode);
  const [pack, setPack] = useState<OccupationPack | null>(null);
  const [loadingPack, setLoadingPack] = useState(false);
  const [pending, setPending] = useState<TaskTemplate | null>(null);
  const [usedUrlTemplate, setUsedUrlTemplate] = useState(false);

  // pacote do campo, sob demanda
  useEffect(() => {
    let alive = true;
    if (!field) {
      setPack(null);
      return;
    }
    setLoadingPack(true);
    PACK_LOADERS[field.pack]?.()
      .then((p) => { if (alive) setPack(p); })
      .catch(() => { if (alive) setPack(null); })
      .finally(() => { if (alive) setLoadingPack(false); });
    return () => { alive = false; };
  }, [field]);

  const area: WorkArea | null = draft.area || field?.area || null;
  const fieldTemplates = useMemo(() => (pack && field ? packTemplates(pack, field.area) : []), [pack, field]);
  const areaTemplates = useMemo(() => (area ? AREA_TEMPLATES.filter((x) => x.area === area) : []), [area]);
  const report = useMemo(() => assessTask(draft, pack), [draft, pack]);

  // modelo vindo da URL: aplica uma vez, quando o modelo (da área ou do campo) estiver disponível
  useEffect(() => {
    if (!templateId || usedUrlTemplate) return;
    const tpl = [...AREA_TEMPLATES, ...fieldTemplates].find((x) => x.id === templateId);
    if (tpl) {
      setUsedUrlTemplate(true);
      onApplyTemplate(tpl);
      return;
    }
    const m = /^campo\.([a-z0-9-]+)\./.exec(templateId);
    if (m && !field) {
      const f = FIELD_INDEX.find((x) => x.pack === m[1]);
      if (f) onFieldChange(f.code);
    }
  }, [templateId, usedUrlTemplate, fieldTemplates, field, onApplyTemplate, onFieldChange]);

  const use = (tpl: TaskTemplate) => {
    if (hasContent) setPending(tpl);
    else onApplyTemplate(tpl);
  };

  const fieldOptions = useMemo(
    () => [...FIELD_INDEX].sort((a, b) => a.label[lang].localeCompare(b.label[lang], lang)).map((f) => ({ value: f.code, label: `${f.label[lang]} · ${t(`tasks.area.${f.area}`)}` })),
    [lang, t],
  );

  return (
    <aside className="grid content-start gap-[var(--ws-space-4)]" aria-label={t("tasks.assist.label")} data-testid="task-assist">
      {/* 1. campo de estudo */}
      <section className="grid gap-2 rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)]">
        <Field label={t("tasks.assist.field")} hint={t("tasks.assist.fieldHint")}>
          {({ id, describedBy }) => (
            <Select id={id} aria-describedby={describedBy} value={fieldCode ?? ""} onChange={(e) => onFieldChange(e.target.value || null)}
              options={[{ value: "", label: t("tasks.assist.noField") }, ...fieldOptions]} />
          )}
        </Field>
        {field ? (
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted" aria-live="polite">
            {loadingPack ? t("tasks.assist.loadingPack") : pack ? t("tasks.assist.packInfo", { field: field.label[lang], status: pack.status, version: pack.version }) : t("tasks.assist.packError")}
          </p>
        ) : null}
        {!draft.area ? (
          <div className="grid gap-1.5">
            <p className="text-[length:var(--ws-text-caption)] font-semibold">{t("tasks.assist.pickArea")}</p>
            <div className="flex flex-wrap gap-1.5">
              {WORK_AREAS.map((a) => (
                <Button key={a} size="sm" variant={field?.area === a ? "primary" : "default"} onClick={() => onAreaChange(a)}>{t(`tasks.area.${a}`)}</Button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* 2. modelos */}
      <section className="grid gap-2 rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)]" aria-labelledby="assist-templates">
        <h2 id="assist-templates" className="text-[length:var(--ws-text-body)] font-semibold">{t("tasks.assist.templates")}</h2>
        {pending ? (
          <div role="alertdialog" aria-label={t("tasks.assist.replaceTitle")} className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-warning bg-ws-warning-soft p-2 text-[length:var(--ws-text-body-sm)]">
            <p>{t("tasks.assist.replaceConfirm", { title: pending.title })}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="primary" onClick={() => { onApplyTemplate(pending); setPending(null); }}>{t("tasks.assist.replace")}</Button>
              <Button size="sm" variant="ghost" onClick={() => setPending(null)}>{t("tasks.assist.keep")}</Button>
            </div>
          </div>
        ) : null}
        {fieldTemplates.length ? <TemplateList title={t("tasks.assist.fromField", { field: field!.label[lang] })} items={fieldTemplates} onUse={use} /> : null}
        {areaTemplates.length ? <TemplateList title={t("tasks.assist.fromArea", { area: t(`tasks.area.${area}`) })} items={areaTemplates} onUse={use} /> : null}
        {!fieldTemplates.length && !areaTemplates.length ? <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("tasks.assist.noTemplates")}</p> : null}
      </section>

      {/* 3. feedback de qualidade */}
      <Feedback report={report} onFix={onFix} pack={pack} areaLabel={area ? t(`tasks.area.${area}`) : null} fieldLabel={field ? field.label[lang] : null} />
    </aside>
  );
}

function TemplateList({ title, items, onUse }: { title: string; items: TaskTemplate[]; onUse: (tpl: TaskTemplate) => void }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-1.5">
      <p className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-label)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">{title}</p>
      <ul className="grid gap-1.5">
        {items.map((tpl) => (
          <li key={tpl.id} data-template={tpl.id}>
            <details className="rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 px-2.5 py-2">
              <summary className="flex cursor-pointer select-none flex-wrap items-center gap-1.5 text-[length:var(--ws-text-body-sm)]">
                <span className="min-w-0 flex-1 font-semibold">{tpl.title}</span>
                <Tag>{t(`social.taskType.${tpl.type}`)}</Tag>
                {tpl.effort ? <Tag tone="info">{tpl.effort}</Tag> : null}
                {tpl.level ? <Tag tone="neutral">{t(`tasks.assist.level.${tpl.level}`)}</Tag> : null}
              </summary>
              <div className="mt-2 grid gap-1.5 text-[length:var(--ws-text-caption)]">
                <p>{tpl.objective}</p>
                <p className="font-semibold">{t("tasks.assist.criteriaCount", { n: tpl.criteria.length })}</p>
                <ul className="grid list-disc gap-0.5 pl-4">{tpl.criteria.slice(0, 4).map((c, i) => <li key={i}>{c}</li>)}</ul>
              </div>
            </details>
            <Button size="sm" variant="secondary" className="mt-1" onClick={() => onUse(tpl)} aria-label={t("tasks.assist.useNamed", { title: tpl.title })}>{t("tasks.assist.use")}</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const GROUPS: readonly CheckGroup[] = ["ESSENCIAL", "AREA", "CAMPO"];

function Feedback({ report, onFix, pack, areaLabel, fieldLabel }: { report: ReturnType<typeof assessTask>; onFix: (f: QuickFix) => void; pack: OccupationPack | null; areaLabel: string | null; fieldLabel: string | null }) {
  const { t } = useI18n();
  const [showOk, setShowOk] = useState(false);
  const groupTitle = (g: CheckGroup) => (g === "ESSENCIAL" ? t("tasks.assist.group.ESSENCIAL") : g === "AREA" ? t("tasks.assist.group.AREA", { area: areaLabel ?? "" }) : t("tasks.assist.group.CAMPO", { field: fieldLabel ?? "" }));
  const next = report.checks.find((c) => c.status === "FALTA") ?? report.checks.find((c) => c.status === "AVISO");
  return (
    <section aria-labelledby="assist-feedback" className="grid gap-2 rounded-[var(--ws-radius-lg)] border border-ws-ai-spark bg-ws-ai-spark-soft p-[var(--ws-space-3)]" data-testid="task-quality" data-readiness={report.readiness}>
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden className="text-ws-ai-spark-ink">✦</span>
        <Badge tone="spark">{t("tasks.assist.ai")}</Badge>
        <h2 id="assist-feedback" className="min-w-0 flex-1 text-[length:var(--ws-text-body)] font-semibold">{t("tasks.assist.feedback")}</h2>
        <Tag tone={READY_TONE[report.readiness]} filled>{t(`tasks.assist.ready.${report.readiness}`)}</Tag>
      </div>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text" aria-live="polite">
        {t("tasks.assist.counts", { ok: report.counts.OK, warn: report.counts.AVISO, missing: report.counts.FALTA })}
        {next ? ` ${t("tasks.assist.next", { title: t(`tasks.q.${next.id}.title`) })}` : ` ${t("tasks.assist.allGood")}`}
      </p>
      {GROUPS.map((g) => {
        const items = report.checks.filter((c) => c.group === g);
        if (!items.length) return null;
        const visible = showOk ? items : items.filter((c) => c.status !== "OK");
        return (
          <div key={g} className="grid gap-1.5" data-group={g}>
            <p className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-label)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">
              {groupTitle(g)} · {items.filter((c) => c.status === "OK").length}/{items.length}
            </p>
            <ul className="grid gap-1.5">{visible.map((c) => <CheckRow key={c.id} check={c} onFix={onFix} />)}</ul>
          </div>
        );
      })}
      <Button size="sm" variant="ghost" onClick={() => setShowOk((v) => !v)} aria-pressed={showOk} className="justify-self-start">
        {t(showOk ? "tasks.assist.hideOk" : "tasks.assist.showOk", { n: report.counts.OK })}
      </Button>
      {pack?.rubric.subjective.length ? (
        <details className="rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 px-2.5 py-2 text-[length:var(--ws-text-caption)]">
          <summary className="cursor-pointer select-none font-semibold">{t("tasks.assist.selfRubric", { field: fieldLabel ?? "" })}</summary>
          <ul className="mt-1.5 grid gap-2">
            {pack.rubric.subjective.map((s) => (
              <li key={s.id} className="grid gap-0.5">
                <span className="font-semibold">{s.label}</span>
                <span><strong>{t("tasks.assist.levels.aproxima")}:</strong> {s.levels.aproxima}</span>
                <span><strong>{t("tasks.assist.levels.atende")}:</strong> {s.levels.atende}</span>
                <span><strong>{t("tasks.assist.levels.supera")}:</strong> {s.levels.supera}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("tasks.assist.engineNote")}</p>
    </section>
  );
}

function CheckRow({ check, onFix }: { check: QualityCheck; onFix: (f: QuickFix) => void }) {
  const { t } = useI18n();
  const vars = check.vars ?? {};
  const fixLabel = (f: QuickFix) =>
    f.kind === "ADD_CRITERION" ? t("tasks.assist.fix.criterion", { text: f.text })
    : f.kind === "ADD_DELIVERABLE" ? t("tasks.assist.fix.deliverable", { text: f.text })
    : f.kind === "ADD_REFERENCE" ? t("tasks.assist.fix.reference", { label: f.label })
    : f.kind === "SET_EXTENSION" ? t("tasks.assist.fix.extension", { field: t(`tasks.ext.${f.key}`), value: f.value })
    : t("tasks.assist.fix.access", { access: t(`social.access.${f.accessClass}`) });
  return (
    <li className={cn("grid gap-1 rounded-[var(--ws-radius-md)] border border-l-4 bg-ws-surface-1 px-2.5 py-2 text-[length:var(--ws-text-body-sm)]", check.status === "FALTA" ? "border-ws-border border-l-ws-danger" : check.status === "AVISO" ? "border-ws-border border-l-ws-warning" : "border-ws-border border-l-ws-success")} data-check={check.id} data-status={check.status}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Tag tone={STATUS_TONE[check.status]}><span aria-hidden>{STATUS_MARK[check.status]}</span>{t(`tasks.assist.status.${check.status}`)}</Tag>
        <span className="min-w-0 flex-1 font-semibold">{t(`tasks.q.${check.id}.title`)}</span>
      </div>
      <p>{t(`tasks.q.${check.id}.${check.status === "OK" ? "ok" : check.status === "AVISO" ? "warn" : "missing"}`, vars)}</p>
      {check.status !== "OK" && check.fixes?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {check.fixes.map((f, i) => <Button key={i} size="sm" variant="spark" className="h-auto min-h-0 whitespace-normal py-1 text-left" onClick={() => onFix(f)}>{fixLabel(f)}</Button>)}
        </div>
      ) : null}
      <details className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
        <summary className="cursor-pointer select-none">{t("tasks.assist.why")}</summary>
        <p className="mt-1">{t(`tasks.q.${check.id}.why`)}</p>
      </details>
    </li>
  );
}
