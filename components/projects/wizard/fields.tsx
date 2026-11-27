"use client";
/**
 * Peças de formulário do assistente de projetos: lista de textos (premissas, restrições…) e a moldura de campo com erro traduzido e
 * `data-field` para o foco no primeiro erro. Sem estado próprio: tudo vem do assistente.
 */
import type { ReactNode } from "react";
import { Button, Field, Input } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";

export type Err = (key: string) => string | undefined;

/** Campo com `data-field` (alvo do foco) e erro já traduzido. */
export function F({ k, label, hint, required, err, className, children }: {
  k: string; label: string; hint?: string; required?: boolean; err: Err; className?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}) {
  return (
    <div data-field={k} className={className}>
      <Field label={label} hint={hint} required={required} error={err(k)}>{children}</Field>
    </div>
  );
}

/** Lista de linhas de texto com acrescentar/remover; rótulo de cada linha = "<título> <n>". */
export function StringList({ k, title, hint, items, onChange, err, addLabel, required, testId }: {
  k: string; title: string; hint?: string; items: string[]; onChange: (v: string[]) => void; err: Err; addLabel: string; required?: boolean; testId?: string;
}) {
  const { t } = useI18n();
  const error = err(k);
  return (
    <fieldset className="grid gap-2" data-field={k} data-testid={testId}>
      <legend className="text-[length:var(--ws-text-body-sm)] font-semibold">
        {title}{required ? <span className="ml-1 text-ws-danger-ink" aria-hidden>*</span> : null}
      </legend>
      {hint ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{hint}</p> : null}
      {error ? <p role="alert" className="text-[length:var(--ws-text-caption)] font-medium text-ws-danger-ink">{error}</p> : null}
      <ol className="grid gap-2">
        {items.map((v, i) => {
          const label = `${title} ${i + 1}`;
          return (
            <li key={i} className="grid grid-cols-[1fr_auto] items-center gap-2">
              <Input aria-label={label} value={v} maxLength={300} invalid={!!error && !v.trim()} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
              <Button size="sm" variant="ghost" aria-label={t("projectForm.remove", { item: label })} onClick={() => onChange(items.filter((_, j) => j !== i))}>×</Button>
            </li>
          );
        })}
      </ol>
      <div><Button size="sm" variant="ghost" onClick={() => onChange([...items, ""])}>+ {addLabel}</Button></div>
    </fieldset>
  );
}

/** Opções 1–5 para poder, interesse, impacto e GUT. */
export const SCALE = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }));
