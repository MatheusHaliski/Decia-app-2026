"use client";
/**
 * Campo "profissão que você quer desenvolver" (RF81.CA01/CA10, D-148): combobox acessível (padrão ARIA 1.2 — `role="combobox"`,
 * `aria-expanded`, `aria-controls`, `aria-activedescendant`, lista com `role="listbox"`), por teclado (↓ ↑ Enter Esc) e por leitor de
 * tela. Sem texto, lista os 79 ramos agrupados pelas categorias do criador (TI, Engenharia, Design, Pesquisa, Administração e as
 * demais áreas — `lib/career/categories.ts`); a partir de 2 letras, autocompleta por rótulo e aliases sem caixa nem acento (até 8
 * sugestões, "advogada" acha Direito). "Ainda não sei" limpa a escolha (vale o genérico, RF81.CA07).
 */
import { useEffect, useId, useMemo, useState, type KeyboardEvent } from "react";
import { Button, Input, cn } from "@/components/ui";
import { fieldKey, searchOccupations } from "@/lib/career/academicFields";
import { groupFieldsByArea, occupationArea } from "@/lib/career/categories";
import { baseLocale } from "@/lib/i18n/state";
import { useI18n } from "@/lib/i18n/useI18n";
import type { WorkArea } from "@/lib/tasks/client";
import { FIELD_INDEX } from "@/lib/tasks/fieldIndex.gen";

interface Option {
  id: string;
  code: string | null;
  label: string;
  area: WorkArea | null;
}

export interface OccupationComboboxProps {
  value: string | null;
  onChange: (code: string | null) => void;
  label: string;
  hint?: string;
  className?: string;
}

const optionId = (base: string, code: string | null) => `${base}-opt-${code ?? "nenhuma"}`;

export function OccupationCombobox({ value, onChange, label, hint, className }: OccupationComboboxProps) {
  const { t, locale } = useI18n();
  const lang = baseLocale(locale);
  const base = useId().replace(/:/g, "");
  const inputId = `${base}-input`;
  const listId = `${base}-list`;
  const hintId = `${base}-hint`;
  const statusId = `${base}-status`;
  const selectedLabel = (value ? FIELD_INDEX.find((f) => f.code === value)?.label[lang] : undefined) ?? "";
  const [text, setText] = useState(selectedLabel);
  const [typing, setTyping] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  // fora da digitação, o campo mostra o rótulo do ramo escolhido (inclusive ao trocar de idioma)
  useEffect(() => {
    if (!typing) setText(selectedLabel);
  }, [selectedLabel, typing]);

  const query = typing ? text : "";
  const searching = fieldKey(query).length >= 2;
  const groups = useMemo(() => groupFieldsByArea(lang), [lang]);
  const options = useMemo<Option[]>(() => {
    if (searching) return searchOccupations(query, lang).map((f) => ({ id: optionId(base, f.code), code: f.code, label: f.label[lang], area: occupationArea(f.code) }));
    return [
      { id: optionId(base, null), code: null, label: t("career.combo.unknown"), area: null },
      ...groups.flatMap((g) => g.fields.map((f) => ({ id: optionId(base, f.code), code: f.code, label: f.label[lang], area: g.area }))),
    ];
  }, [searching, query, lang, groups, base, t]);

  const activeId = open && active >= 0 && active < options.length ? options[active]!.id : undefined;
  useEffect(() => {
    if (!activeId) return;
    const el = typeof document !== "undefined" ? document.getElementById(activeId) : null;
    el?.scrollIntoView?.({ block: "nearest" });
  }, [activeId]);

  const openList = () => {
    setOpen(true);
    const i = options.findIndex((o) => o.code === value);
    setActive(i >= 0 ? i : 0);
  };
  const close = () => {
    setOpen(false);
    setActive(-1);
    setTyping(false);
    setText(selectedLabel);
  };
  const choose = (o: Option) => {
    onChange(o.code);
    setTyping(false);
    setText(o.code ? o.label : "");
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) openList();
      else setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) openList();
      else setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && active >= 0 && options[active]) {
        e.preventDefault();
        choose(options[active]!);
      }
    } else if (e.key === "Escape") {
      if (open || typing) {
        e.preventDefault();
        close();
      }
    } else if (e.key === "Tab") {
      if (open) close();
    }
  };

  const status = !open ? "" : searching ? (options.length ? t("career.combo.count", { n: options.length }) : t("career.combo.none")) : t("career.combo.browse");
  const groupOf = (o: Option) => (searching ? null : o.area);
  let lastGroup: WorkArea | null | undefined;

  return (
    <div className={cn("grid gap-1.5", className)} data-testid="occupation-combobox">
      <label htmlFor={inputId} className="text-[length:var(--ws-text-body-sm)] font-semibold text-ws-text">{label}</label>
      <div className="relative flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Input
            id={inputId}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeId}
            aria-describedby={[hint ? hintId : null, statusId].filter(Boolean).join(" ")}
            autoComplete="off"
            leading="buscar"
            value={text}
            placeholder={t("career.combo.placeholder")}
            onChange={(e) => {
              setText(e.target.value);
              setTyping(true);
              setOpen(true);
              setActive(fieldKey(e.target.value).length >= 2 ? 0 : -1);
            }}
            onClick={() => (open ? undefined : openList())}
            onKeyDown={onKeyDown}
            onBlur={() => close()}
          />
          {open ? (
            <div
              id={listId}
              role="listbox"
              aria-label={label}
              className="absolute left-0 right-0 top-full z-[var(--ws-z-popover)] mt-1 max-h-72 overflow-auto rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-1 shadow-ws-2"
            >
              {options.length === 0 ? <p className="px-3 py-2 text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("career.combo.none")}</p> : null}
              {options.map((o, i) => {
                const g = groupOf(o);
                const header = !searching && o.code && g !== lastGroup ? g : null;
                lastGroup = g;
                const selected = o.code === value;
                return (
                  <div key={o.id} role="presentation">
                    {header ? (
                      <p role="presentation" className="px-3 pb-1 pt-2 font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-label)] uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">
                        {t(`tasks.area.${header}`)}
                      </p>
                    ) : null}
                    <div
                      id={o.id}
                      role="option"
                      aria-selected={selected}
                      data-code={o.code ?? ""}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(o)}
                      className={cn(
                        "flex cursor-pointer items-center justify-between gap-3 rounded-[var(--ws-radius-sm)] px-3 py-1.5 text-[length:var(--ws-text-body-sm)] text-ws-text",
                        i === active && "bg-ws-accent-soft",
                        selected && "font-semibold",
                      )}
                    >
                      <span className="min-w-0 truncate">{o.label}</span>
                      <span className="shrink-0 text-[length:var(--ws-text-caption)] text-ws-text-muted">
                        {selected ? <span aria-hidden>✓ </span> : null}
                        {searching && o.area ? t(`tasks.area.${o.area}`) : null}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
        {value ? <Button size="sm" variant="ghost" onClick={() => choose({ id: optionId(base, null), code: null, label: "", area: null })}>{t("career.combo.clear")}</Button> : null}
      </div>
      {hint ? <p id={hintId} className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{hint}</p> : null}
      <p id={statusId} className="sr-only" aria-live="polite">{status}</p>
    </div>
  );
}
