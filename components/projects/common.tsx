"use client";
/**
 * Peças comuns dos painéis da Mesa: nota acadêmica (o porquê da regra, com a aula de origem), etiqueta de status de indicador,
 * checklist do portão de fase e campos que só confirmam ao sair/Enter — cada confirmação é UM comando (e uma versão, RF22.CA02),
 * nunca um por tecla.
 */
import { useState, type ReactNode } from "react";
import { Button, Field, Input, Tag, Textarea, cn, type Tone } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { evaluateGate, type MetricStatus } from "@/lib/projects/metrics";
import { PROJECT_PHASES, type ProjectModel, type ProjectPhase, type ProjectVersion } from "@/lib/projects/types";

type T = (key: string, vars?: Record<string, string | number>) => string;

const MONEY_VARS = new Set(["cv", "sv", "eac", "bac", "reserve", "exposure", "threats"]);
const ENUM_VARS: Record<string, string> = { phase: "pm.phase", band: "pm.gutBand", structure: "pm.org", authority: "pm.authority", budgetOwner: "pm.budgetOwner" };

/** Variáveis de um indicador prontas para `pm.metric.<ID>.detail`: enums traduzidos, dinheiro e índices formatados. */
export function metricVars(t: T, intl: string, vars: Record<string, string | number>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(vars)) {
    if (typeof v === "string" && ENUM_VARS[k]) out[k] = t(`${ENUM_VARS[k]}.${v}`);
    else if (typeof v === "number" && MONEY_VARS.has(k)) out[k] = new Intl.NumberFormat(intl, { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
    else if (typeof v === "number" && (k === "cpi" || k === "spi")) out[k] = new Intl.NumberFormat(intl, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
    else if (typeof v === "number") out[k] = new Intl.NumberFormat(intl, { maximumFractionDigits: 1 }).format(v);
    else out[k] = v;
  }
  return out;
}

/** Título e detalhe de um indicador (mesmos textos do "Feedback da IA"). */
export function metricText(t: T, intl: string, m: { id: string; vars: Record<string, string | number> }): { title: string; detail: string; advice: string } {
  const detail = t(`pm.metric.${m.id}.detail`, metricVars(t, intl, m.vars));
  // indicador sem dados chega sem variáveis: em vez de "{score}" cru, diz que ainda não há dados
  return { title: t(`pm.metric.${m.id}.title`), detail: /\{\s*[A-Za-z0-9_]+\s*\}/.test(detail) ? t("pm.fb.noData") : detail, advice: t(`pm.metric.${m.id}.advice`) };
}

/** Resumo legível de uma versão (RF22.CA02): `pm.v.<key>` com os valores de enum traduzidos. */
export function versionSummary(t: T, v: Pick<ProjectVersion, "key" | "vars">): string {
  const vars: Record<string, string | number> = { ...(v.vars ?? {}) };
  const tr = (name: string, prefix: string) => {
    if (typeof vars[name] === "string") vars[name] = t(`${prefix}.${vars[name]}`);
  };
  tr("phase", "pm.phase");
  tr("status", "pm.changeStatus");
  tr("outcome", "pm.gateOutcome");
  tr("approach", "pm.approach");
  if (typeof vars.target === "string") vars.target = t(`${(PROJECT_PHASES as readonly string[]).includes(vars.target) ? "pm.phase" : "pm.pmcBlock"}.${vars.target}`);
  return t(`pm.v.${v.key}`, vars);
}

export const STATUS_TONE: Record<MetricStatus, Tone> = { OK: "success", ATENCAO: "warning", CRITICO: "danger", SEM_DADOS: "neutral" };
const STATUS_MARK: Record<MetricStatus, string> = { OK: "✓", ATENCAO: "!", CRITICO: "✕", SEM_DADOS: "–" };

/** Status de indicador sempre em texto + marca (nunca só cor). */
export function MetricStatusTag({ status, className }: { status: MetricStatus; className?: string }) {
  const { t } = useI18n();
  return (
    <Tag tone={STATUS_TONE[status]} className={className}>
      <span aria-hidden>{STATUS_MARK[status]}</span>
      {t(`pm.metricStatus.${status}`)}
    </Tag>
  );
}

/** Nota acadêmica: explica a regra e cita a aula (`pm.ref.<refKey>`). */
export function Theory({ refKey, children, className }: { refKey?: string; children: ReactNode; className?: string }) {
  const { t } = useI18n();
  return (
    <aside className={cn("grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-[var(--ws-space-3)] text-[length:var(--ws-text-body-sm)] text-ws-text", className)}>
      <div>{children}</div>
      {refKey ? <p className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] text-ws-text-muted">{t(`pm.ref.${refKey}`)}</p> : null}
    </aside>
  );
}

/** Critérios de saída do portão da fase (avaliados pelo sistema), com marca e texto. */
export function GateChecklist({ model, phase, className }: { model: ProjectModel; phase: ProjectPhase; className?: string }) {
  const { t } = useI18n();
  const checks = evaluateGate(model, phase);
  return (
    <ul className={cn("grid gap-1 text-[length:var(--ws-text-caption)]", className)}>
      {checks.map((c) => (
        <li key={c.id} className="flex items-start gap-1.5" data-ok={c.ok}>
          <span aria-hidden className={cn("mt-px font-bold", c.ok ? "text-ws-success-ink" : "text-ws-danger-ink")}>{c.ok ? "✓" : "✕"}</span>
          <span className="min-w-0 flex-1">{t(`pm.gate.${c.id}`)}</span>
          <span className="sr-only">{t(c.ok ? "pm.ui.ok" : "pm.ui.pending")}</span>
        </li>
      ))}
    </ul>
  );
}

interface CommitBase {
  label: string;
  /** só aria-label (células de tabela) */
  bare?: boolean;
  hint?: ReactNode;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/** Texto que confirma ao sair do campo ou com Enter; Esc desfaz. */
export function CommitText({ value, onCommit, multiline, ...base }: CommitBase & { value: string; onCommit: (v: string) => void; multiline?: boolean }) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value;
  const commit = () => {
    if (draft !== null && draft.trim() !== value.trim()) onCommit(draft);
    setDraft(null);
  };
  const common = {
    value: shown,
    disabled: base.disabled,
    placeholder: base.placeholder,
    onChange: (e: { target: { value: string } }) => setDraft(e.target.value),
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (!multiline || e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") setDraft(null);
    },
  };
  if (base.bare) return multiline ? <Textarea aria-label={base.label} className={base.className} {...common} /> : <Input aria-label={base.label} className={base.className} {...common} />;
  return (
    <Field label={base.label} hint={base.hint} className={base.className}>
      {({ id, describedBy }) => (multiline ? <Textarea id={id} aria-describedby={describedBy} {...common} /> : <Input id={id} aria-describedby={describedBy} {...common} />)}
    </Field>
  );
}

const parseNumber = (s: string) => {
  const n = Number(s.trim().replace(/\s/g, "").replace(",", "."));
  return s.trim() === "" ? null : Number.isFinite(n) ? n : null;
};

/** Número que confirma ao sair/Enter; aceita vírgula decimal; inválido não confirma e marca o campo. */
export function CommitNumber({ value, onCommit, min, max, step, suffix, ...base }: CommitBase & { value: number | undefined; onCommit: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === undefined || !Number.isFinite(value) ? "" : String(value));
  const parsed = draft === null ? (value ?? null) : parseNumber(draft);
  const invalid = draft !== null && draft.trim() !== "" && (parsed === null || (min !== undefined && parsed < min) || (max !== undefined && parsed > max));
  const commit = () => {
    if (draft !== null && !invalid && parsed !== null && parsed !== value) onCommit(parsed);
    if (!invalid) setDraft(null);
  };
  const input = (id?: string, describedBy?: string) => (
    <span className="flex items-center gap-1">
      <Input
        id={id}
        aria-describedby={describedBy}
        aria-label={base.bare ? base.label : undefined}
        inputMode="decimal"
        value={shown}
        invalid={invalid}
        disabled={base.disabled}
        placeholder={base.placeholder}
        step={step}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") setDraft(null);
        }}
        className={cn("tabular-nums", base.bare && base.className)}
      />
      {suffix ? <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{suffix}</span> : null}
    </span>
  );
  if (base.bare) return input();
  return (
    <Field label={base.label} hint={base.hint} error={invalid ? t("pm.ui.invalidNumber") : undefined} className={base.className}>
      {({ id, describedBy }) => input(id, describedBy)}
    </Field>
  );
}

/** Lista de textos editável (itens do TAP, benefícios…): adiciona com Enter, remove por item. */
export function EditableList({ items, onAdd, onRemove, label, readOnly, className, render }: {
  items: readonly string[];
  onAdd: (text: string) => void;
  onRemove: (index: number) => void;
  label: string;
  readOnly?: boolean;
  className?: string;
  render?: (text: string, index: number) => ReactNode;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  return (
    <div className={cn("grid gap-2", className)}>
      {items.length ? (
        <ul className="grid gap-1">
          {items.map((it, i) => (
            <li key={`${i}-${it}`} className="flex items-start gap-2 rounded-[var(--ws-radius-sm)] bg-ws-surface-2 px-2 py-1 text-[length:var(--ws-text-body-sm)]">
              <span className="min-w-0 flex-1 break-words">{render ? render(it, i) : it}</span>
              {!readOnly ? (
                <Button size="sm" variant="ghost" aria-label={t("pm.ui.removeItem", { item: it })} onClick={() => onRemove(i)} className="min-h-0 px-2 py-0">
                  ×
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("pm.ui.noneYet")}</p>
      )}
      {!readOnly ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            onAdd(draft);
            setDraft("");
          }}
        >
          <Input aria-label={label} placeholder={t("pm.ui.newItemPlaceholder")} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <Button type="submit" size="sm" disabled={!draft.trim()}>
            {t("pm.ui.add")}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

/** Título de seção dos painéis (h3) com ação opcional à direita. */
export function SectionTitle({ children, actions, id }: { children: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 id={id} className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold leading-[var(--ws-text-h3--lh)] text-ws-text">
        {children}
      </h3>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
