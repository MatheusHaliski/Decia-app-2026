"use client";
/**
 * Peças comuns do Simulador (RF31) e do Espelho (RF32): formatação das variáveis dos efeitos e motivos (sufixo Brl = reais, Days =
 * dias, Pct = 0–100, Idx = índice, Date = data), campo numérico que aceita vírgula, etiqueta de variação "melhor/pior" (nunca só
 * cor) e o bloco de leitura ✦ da IA simulada, que respeita a autonomia pessoal (D-136: padrão "sob solicitação").
 */
import { useId, useState, type ReactNode } from "react";
import { Button, Field, Input, Tag, cn } from "@/components/ui";
import { evaluateAiAction, personalPolicy } from "@/lib/ai/autonomy";
import { useI18n } from "@/lib/i18n/useI18n";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { fmt, nameOf, type PeopleDirectory } from "../shared";

type T = (key: string, vars?: Record<string, string | number>) => string;

export const fmtDays = (intl: string, v: number | null | undefined) => fmt.number(intl, v, 1);

/** Variáveis prontas para o texto: dinheiro, dias, percentuais, índices, datas, fases e pessoas. */
export function formatVars(t: T, intl: string, vars: Record<string, string | number>, people: PeopleDirectory = {}): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(vars)) {
    if (typeof v === "number") {
      if (k.endsWith("Brl")) out[k] = fmt.money(intl, v);
      else if (k.endsWith("Pct") || k === "pct") out[k] = fmt.percent(intl, v / 100, 1);
      else if (k.endsWith("Idx")) out[k] = new Intl.NumberFormat(intl, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
      else if (k.endsWith("Days") || k === "days") out[k] = fmtDays(intl, v);
      else out[k] = fmt.number(intl, v, 1);
    } else if (k.endsWith("Date")) out[k] = fmt.date(intl, v);
    else if (k === "phase") out[k] = v ? t(`pm.phase.${v}`) : "—";
    else if (k === "phases") out[k] = v.split(",").filter(Boolean).map((p) => t(`pm.phase.${p}`)).join(" / ");
    else if (k === "moscow") out[k] = t(`pm.moscow.${v}`);
    else if (k === "person" || k === "by") out[k] = nameOf(people, v);
    else if (k === "error") out[k] = t(`sim.error.${v}`);
    else if (k === "signal") out[k] = t(`mirror.signal.${v}`);
    else if (k === "area") out[k] = t(`tasks.area.${v}`);
    else out[k] = v;
  }
  return out;
}

/** Número digitado com vírgula ou ponto; vazio ou inválido → NaN (a alavanca acusa o erro). */
export const parseDecimal = (s: string) => (s.trim() === "" ? Number.NaN : Number(s.trim().replace(/\s/g, "").replace(",", ".")));

export function NumberField({ label, value, onChange, suffix, hint, error, className }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  hint?: ReactNode;
  error?: string;
  className?: string;
}) {
  const { intl } = useI18n();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (Number.isFinite(value) ? new Intl.NumberFormat(intl, { useGrouping: false, maximumFractionDigits: 2 }).format(value) : "");
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {({ id, describedBy, invalid }) => (
        <span className="flex items-center gap-1">
          <Input
            id={id}
            aria-describedby={describedBy}
            inputMode="decimal"
            value={shown}
            invalid={invalid || (draft !== null && !Number.isFinite(parseDecimal(draft)))}
            onChange={(e) => {
              setDraft(e.target.value);
              onChange(parseDecimal(e.target.value));
            }}
            onBlur={() => setDraft(null)}
            className="tabular-nums"
          />
          {suffix ? <span className="shrink-0 text-[length:var(--ws-text-caption)] text-ws-text-muted">{suffix}</span> : null}
        </span>
      )}
    </Field>
  );
}

/** Variação frente à linha de base, com seta e palavra (melhor/pior), nunca só a cor. `goodWhen` diz para que lado é melhor. */
export function DeltaTag({ value, goodWhen, text }: { value: number | null; goodWhen: "lower" | "higher"; text: string }) {
  const { t } = useI18n();
  if (value === null || Math.abs(value) < 0.005) return <Tag>{t("sim.delta.same")}</Tag>;
  const good = goodWhen === "lower" ? value < 0 : value > 0;
  return (
    <Tag tone={good ? "success" : "danger"}>
      <span aria-hidden>{value > 0 ? "▲" : "▼"}</span>
      {text} · {t(good ? "sim.delta.better" : "sim.delta.worse")}
    </Tag>
  );
}

/** Sinal explícito para variações ("+3", "−2"). */
export const signed = (s: string, v: number) => (v > 0 ? `+${s}` : v < 0 ? `−${s.replace(/^[-−]/, "")}` : s);

/**
 * Leitura ✦ da IA simulada: frases montadas só com números do sistema (D-12). Respeita a autonomia pessoal (lib/ai/autonomy):
 * nos modos que permitem sugestão espontânea aparece direto; em "sob solicitação" só depois do pedido; em "manual" não aparece.
 */
export function SparkReading({ title, lines, className, testId }: { title: string; lines: readonly string[]; className?: string; testId?: string }) {
  const { t } = useI18n();
  const { prefs } = usePreferences();
  const id = useId();
  const policy = personalPolicy(prefs.aiAutonomyDefault);
  const spontaneous = evaluateAiAction(policy, "SUGESTAO_ESPONTANEA", { requestedByUser: false }).ok;
  const onRequest = evaluateAiAction(policy, "RESPONDER", { requestedByUser: true }).ok;
  const [asked, setAsked] = useState(false);
  const show = spontaneous || (onRequest && asked);
  return (
    <section aria-labelledby={`${id}-h`} className={cn("grid gap-2 rounded-[var(--ws-radius-lg)] border border-ws-ai-spark bg-ws-ai-spark-soft p-[var(--ws-space-3)]", className)} data-ai-reading={testId ?? ""} data-mode={policy.mode}>
      <h3 id={`${id}-h`} className="flex items-center gap-1.5 text-[length:var(--ws-text-body)] font-semibold">
        <span aria-hidden className="text-ws-ai-spark-ink">✦</span>
        {title}
      </h3>
      {show ? (
        <div className="grid gap-1.5" aria-live="polite">
          {lines.map((line, i) => (
            <p key={i} className="text-[length:var(--ws-text-body-sm)] text-ws-ai-spark-ink">
              <span aria-hidden>✦ </span>
              {line}
            </p>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-[length:var(--ws-text-body-sm)] text-ws-text-muted">
          <span>{t(onRequest ? "sim.ai.gatedOnRequest" : "sim.ai.gatedManual", { mode: t(`aiAutonomy.${policy.mode}`) })}</span>
          {onRequest ? <Button size="sm" variant="spark" onClick={() => setAsked(true)}>{t("sim.ai.request")}</Button> : null}
        </div>
      )}
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("sim.ai.engineNote")}</p>
    </section>
  );
}

/** Título curto de seção. */
export function Heading({ id, children, actions }: { id?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id={id} className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold leading-[var(--ws-text-h3--lh)]">{children}</h2>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
