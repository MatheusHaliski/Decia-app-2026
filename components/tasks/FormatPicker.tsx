"use client";
/**
 * Formato da entrega no criador (FAMÍLIA → VARIANTE → campos próprios, `lib/tasks/formats.ts`): os dois seletores mostram o ícone do
 * tipo de arquivo nas opções e no valor escolhido; ao escolher a variante aparecem só os campos dela (os comuns da família ficam); trocar
 * de variante descarta os que deixam de valer e avisa quais. Os valores geram critérios de aceite sugeridos (um clique acrescenta).
 * Reutilizado no criador de projetos (formato de cada entrega).
 */
import { useState } from "react";
import { Button, Checkbox, Field, Input, Select } from "@/components/ui";
import { FileTypeSelect } from "@/components/fileicons/FileTypeSelect";
import { useI18n } from "@/lib/i18n/useI18n";
import {
  changeFormat, fieldsFor, FORMAT_FAMILIES, formatIconSource, invalidFormatFields, suggestedCriteria, variantOf, variantsOf,
  type FormatChoice, type FormatFamilyId, type FormatField,
} from "@/lib/tasks/formats";

export interface FormatPickerProps {
  value: FormatChoice;
  onChange: (next: FormatChoice) => void;
  /** acrescenta critérios sugeridos (textos já traduzidos); sem a prop, o botão não aparece */
  onAddCriteria?: (texts: string[]) => void;
  /** erro do campo (mensagem pronta) */
  error?: string;
  /** prefixo para os testId (uma tela pode ter vários seletores) */
  testId?: string;
  compact?: boolean;
}

export function FormatPicker({ value, onChange, onAddCriteria, error, testId = "format", compact }: FormatPickerProps) {
  const { t } = useI18n();
  const [dropped, setDropped] = useState<string[]>([]);
  const fields = fieldsFor(value.family, value.variant);
  const invalid = new Set(invalidFormatFields(value));
  const variants = variantsOf(value.family);
  const change = (family: FormatFamilyId | "", variant: string) => {
    const r = changeFormat(value, family, variant);
    setDropped(r.dropped);
    onChange(r.next);
  };
  const setDetail = (k: string, v: string) => onChange({ ...value, details: { ...value.details, [k]: v } });
  const suggestions = suggestedCriteria(value).map((s) => t(s.key, { ...s.vars, ...(s.optionKey ? { value: t(s.optionKey) } : {}) }));
  const variant = variantOf(value.family, value.variant);

  return (
    <div className="grid gap-3" data-testid={testId}>
      <div className={compact ? "grid gap-3" : "grid gap-3 md:grid-cols-2"}>
        <Field label={t("taskForm.fmt.family")} hint={compact ? undefined : t("taskForm.fmt.familyHint")} error={error}>
          {({ id, describedBy, invalid: inv }) => (
            <FileTypeSelect
              id={id} describedBy={describedBy} invalid={inv} value={value.family} onChange={(f) => change(f as FormatFamilyId | "", "")}
              placeholder={t("taskForm.fmt.noFamily")} fieldLabel={t("taskForm.fmt.family")} testId={`${testId}-family`}
              options={FORMAT_FAMILIES.map((f) => ({ value: f, label: t(`taskForm.fmt.familyName.${f}`) }))}
              iconOf={(f) => formatIconSource({ family: f as FormatFamilyId, variant: "" })}
            />
          )}
        </Field>
        {value.family && variants.length ? (
          <Field label={t("taskForm.fmt.variant")} hint={variant?.refused ? t("taskForm.fmt.refused") : variant && !variant.detected && variant.family !== "LINK" ? t("taskForm.fmt.notDetected") : undefined}>
            {({ id, describedBy }) => (
              <FileTypeSelect
                id={id} describedBy={describedBy} value={value.variant} onChange={(v) => change(value.family, v)}
                placeholder={t("taskForm.fmt.anyVariant")} fieldLabel={t("taskForm.fmt.variant")} testId={`${testId}-variant`}
                options={variants.map((v) => ({ value: v.code, label: t(`taskForm.fmt.variantName.${v.code}`) }))}
                iconOf={(v) => formatIconSource({ family: value.family, variant: v })}
              />
            )}
          </Field>
        ) : null}
      </div>
      {dropped.length ? (
        <p role="status" className="rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-warning-soft p-2 text-[length:var(--ws-text-caption)]" data-testid={`${testId}-dropped`}>
          {t("taskForm.fmt.dropped", { fields: dropped.map((k) => t(`taskForm.fmt.field.${k}`)).join(", ") })}
        </p>
      ) : null}
      {fields.length ? (
        <fieldset className="grid gap-3 md:grid-cols-2" data-testid={`${testId}-fields`}>
          <legend className="sr-only">{t("taskForm.fmt.detailsLegend")}</legend>
          {fields.map((f) => (
            <DetailField key={f.key} field={f} value={value.details[f.key] ?? ""} onChange={(v) => setDetail(f.key, v)} invalid={invalid.has(f.key)} />
          ))}
        </fieldset>
      ) : null}
      {onAddCriteria && suggestions.length ? (
        <div className="grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-2" data-testid={`${testId}-suggestions`}>
          <p className="text-[length:var(--ws-text-caption)] font-semibold">{t("taskForm.fmt.suggested")}</p>
          <ul className="list-disc pl-5 text-[length:var(--ws-text-caption)]">{suggestions.map((s) => <li key={s}>{s}</li>)}</ul>
          <div><Button size="sm" variant="ghost" onClick={() => onAddCriteria(suggestions)}>{t("taskForm.fmt.addSuggested")}</Button></div>
        </div>
      ) : null}
    </div>
  );
}

function DetailField({ field, value, onChange, invalid }: { field: FormatField; value: string; onChange: (v: string) => void; invalid: boolean }) {
  const { t } = useI18n();
  const label = t(`taskForm.fmt.field.${field.key}`);
  if (field.kind === "bool") return <Checkbox checked={value === "true"} onCheckedChange={(v) => onChange(v ? "true" : "")} label={label} />;
  const error = invalid ? t(field.kind === "number" ? "taskForm.fmt.errNumber" : "taskForm.fmt.errValue", { min: field.min ?? 0, max: field.max ?? 0 }) : undefined;
  return (
    <Field label={label} error={error}>
      {({ id, describedBy, invalid: inv }) => field.kind === "select" ? (
        <Select id={id} aria-describedby={describedBy} invalid={inv} value={value} onChange={(e) => onChange(e.target.value)}
          options={[{ value: "", label: t("taskForm.fmt.unspecified") }, ...(field.options ?? []).map((o) => ({ value: o, label: t(`taskForm.fmt.opt.${field.key}.${o}`) }))]} />
      ) : (
        <Input id={id} aria-describedby={describedBy} invalid={inv} value={value} maxLength={200} inputMode={field.kind === "number" ? "numeric" : undefined}
          onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}
