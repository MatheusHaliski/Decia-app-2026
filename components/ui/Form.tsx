"use client";
import * as RC from "@radix-ui/react-checkbox";
import * as RR from "@radix-ui/react-radio-group";
import * as RS from "@radix-ui/react-switch";
import { useId, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "./cn";
import { Glyph, type GlyphName } from "./glyphs/Glyph";

/**
 * Controles de formulário do design system (DESIGN_SYSTEM.md §3 Input / Select / Textarea / Checkbox / Switch / RadioCard):
 * rótulo visível obrigatório, dica e erro por campo (422 `details`, RF20.CA14) ligados por aria-describedby, cor por token.
 * Único lugar (com Button) onde <input> e <select> nativos aparecem.
 */
export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
  className?: string;
}

export function Field({ label, hint, error, required, children, className }: FieldProps) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={id} className="text-[length:var(--ws-text-body-sm)] font-semibold text-ws-text">
        {label}
        {required ? <span className="ml-1 text-ws-danger-ink" aria-hidden>*</span> : null}
      </label>
      {children({ id, describedBy, invalid: !!error })}
      {hint ? <p id={`${id}-hint`} className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{hint}</p> : null}
      {error ? <p id={`${id}-err`} role="alert" className="text-[length:var(--ws-text-caption)] font-medium text-ws-danger-ink">{error}</p> : null}
    </div>
  );
}

const CONTROL =
  "w-full min-h-[var(--ws-control-md)] rounded-[var(--ws-radius-md)] border-[1.5px] border-ws-border bg-ws-surface-1 px-3 text-[length:var(--ws-text-body)] text-ws-text placeholder:text-ws-text-faint " +
  "focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)] disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-ws-danger";

// React 19: `ref` chega como prop comum (sem forwardRef)
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> { className?: string; invalid?: boolean; leading?: GlyphName; ref?: Ref<HTMLInputElement> }
export function Input({ className, invalid, leading, ...rest }: InputProps) {
  if (leading) {
    return (
      <span className="relative block">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ws-text-muted"><Glyph name={leading} size={18} decorative /></span>
        <input className={cn(CONTROL, "pl-10", className)} aria-invalid={invalid || undefined} {...rest} />
      </span>
    );
  }
  return <input className={cn(CONTROL, className)} aria-invalid={invalid || undefined} {...rest} />;
}

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> { className?: string; invalid?: boolean; ref?: Ref<HTMLTextAreaElement> }
export function Textarea({ className, invalid, ...rest }: TextareaProps) {
  return <textarea className={cn(CONTROL, "min-h-24 py-2", className)} aria-invalid={invalid || undefined} {...rest} />;
}

export interface SelectOption { value: string; label: string; disabled?: boolean }
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "children"> { className?: string; invalid?: boolean; options: readonly SelectOption[] }
export function Select({ className, invalid, options, ...rest }: SelectProps) {
  return (
    <span className="relative block">
      <select className={cn(CONTROL, "appearance-none pr-9", className)} aria-invalid={invalid || undefined} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ws-text-muted" aria-hidden>⌄</span>
    </span>
  );
}

export interface SwitchProps { checked: boolean; onCheckedChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode; disabled?: boolean; className?: string }
/** Interruptor (radix): role="switch", nome do estado em texto via rótulo. */
export function Switch({ checked, onCheckedChange, label, hint, disabled, className }: SwitchProps) {
  const id = useId();
  return (
    <div className={cn("flex items-start justify-between gap-4 py-2", className)}>
      <label htmlFor={id} className="grid gap-0.5">
        <span className="text-[length:var(--ws-text-body)] font-medium text-ws-text">{label}</span>
        {hint ? <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{hint}</span> : null}
      </label>
      <RS.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="relative h-6 w-11 shrink-0 cursor-pointer rounded-[var(--ws-radius-pill)] border-[1.5px] border-ws-border bg-ws-surface-3 transition-colors data-[state=checked]:border-ws-accent data-[state=checked]:bg-ws-accent focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)] disabled:cursor-not-allowed disabled:opacity-55"
      >
        <RS.Thumb className="block size-4 translate-x-0.5 rounded-full bg-ws-surface-1 shadow-ws-1 transition-transform data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-ws-on-accent" />
      </RS.Root>
    </div>
  );
}

export interface CheckboxProps { checked: boolean; onCheckedChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode; disabled?: boolean; className?: string }
export function Checkbox({ checked, onCheckedChange, label, hint, disabled, className }: CheckboxProps) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-3 py-1", className)}>
      <RC.Root
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        disabled={disabled}
        className="mt-0.5 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-[var(--ws-radius-sm)] border-[1.5px] border-ws-border-strong bg-ws-surface-1 data-[state=checked]:border-ws-accent data-[state=checked]:bg-ws-accent data-[state=checked]:text-ws-on-accent focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)] disabled:cursor-not-allowed disabled:opacity-55"
      >
        <RC.Indicator className="text-[11px] font-bold leading-none" aria-hidden>✓</RC.Indicator>
      </RC.Root>
      <label htmlFor={id} className="grid gap-0.5">
        <span className="text-[length:var(--ws-text-body)] text-ws-text">{label}</span>
        {hint ? <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{hint}</span> : null}
      </label>
    </div>
  );
}

export interface RadioCardOption { value: string; label: ReactNode; hint?: ReactNode; glyph?: GlyphName; preview?: ReactNode; disabled?: boolean }
export interface RadioCardsProps { value: string; onValueChange: (v: string) => void; options: readonly RadioCardOption[]; label: string; columns?: 2 | 3 | 4; className?: string }
/** Cartões de opção única (tema, densidade, skin): radio-group do radix com teclado completo e estado em texto. */
export function RadioCards({ value, onValueChange, options, label, columns = 3, className }: RadioCardsProps) {
  return (
    <RR.Root value={value} onValueChange={onValueChange} aria-label={label} className={cn("grid gap-2", columns === 2 ? "grid-cols-2" : columns === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3", className)}>
      {options.map((o) => (
        <RR.Item
          key={o.value}
          value={o.value}
          disabled={o.disabled}
          className="group grid cursor-pointer gap-2 rounded-[var(--ws-radius-md)] border-[1.5px] border-ws-border bg-ws-surface-1 p-3 text-left text-ws-text transition-colors hover:bg-ws-surface-2 data-[state=checked]:border-ws-accent data-[state=checked]:bg-ws-accent-soft focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {o.preview ? <span className="block h-10 overflow-hidden rounded-[var(--ws-radius-sm)] border border-ws-border" aria-hidden>{o.preview}</span> : null}
          <span className="flex items-center gap-2">
            {o.glyph ? <Glyph name={o.glyph} size={18} decorative /> : null}
            <span className="text-[length:var(--ws-text-body-sm)] font-semibold">{o.label}</span>
            <span className="ml-auto size-2 rounded-full border border-ws-border-strong group-data-[state=checked]:border-ws-accent group-data-[state=checked]:bg-ws-accent" aria-hidden />
          </span>
          {o.hint ? <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{o.hint}</span> : null}
        </RR.Item>
      ))}
    </RR.Root>
  );
}

export interface SelectListOption { id: string; title: ReactNode; subtitle?: ReactNode; glyph?: GlyphName; disabledReason?: string }
export interface SelectListProps { options: readonly SelectListOption[]; value: string[]; onChange: (ids: string[]) => void; multiple?: boolean; label: string; className?: string }
/** SelectList mínimo (DESIGN_SYSTEM.md §3): listbox com opção desabilitada e motivo, seleção única/múltipla, teclado. */
export function SelectList({ options, value, onChange, multiple = false, label, className }: SelectListProps) {
  const toggle = (id: string) => {
    if (multiple) onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
    else onChange(value.includes(id) ? [] : [id]);
  };
  return (
    <div role="listbox" aria-label={label} aria-multiselectable={multiple || undefined} className={cn("grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-1", className)}>
      {options.map((o) => {
        const selected = value.includes(o.id);
        const disabled = !!o.disabledReason;
        return (
          <button
            key={o.id}
            type="button"
            role="option"
            aria-selected={selected}
            aria-disabled={disabled || undefined}
            disabled={disabled}
            title={o.disabledReason}
            onClick={() => toggle(o.id)}
            className={cn(
              "flex w-full cursor-pointer items-center gap-3 rounded-[var(--ws-radius-sm)] px-3 py-2 text-left text-ws-text hover:bg-ws-surface-2 focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)] disabled:cursor-not-allowed disabled:opacity-55",
              selected && "bg-ws-accent-soft",
            )}
          >
            {o.glyph ? <Glyph name={o.glyph} size={20} decorative /> : null}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[length:var(--ws-text-body-sm)] font-semibold">{o.title}</span>
              {o.subtitle || o.disabledReason ? <span className="block truncate text-[length:var(--ws-text-caption)] text-ws-text-muted">{o.disabledReason ?? o.subtitle}</span> : null}
            </span>
            <span className={cn("size-4 shrink-0 rounded-full border border-ws-border-strong text-center text-[10px] leading-4", selected && "border-ws-accent bg-ws-accent text-ws-on-accent")} aria-hidden>{selected ? "✓" : ""}</span>
          </button>
        );
      })}
    </div>
  );
}
