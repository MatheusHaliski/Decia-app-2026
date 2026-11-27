"use client";
/**
 * Seletor de tipo com ícone de arquivo: o `<select>` nativo do DS (teclado e leitor de tela de sempre) com o ícone do valor escolhido ao
 * lado, e um painel "Escolher pelo ícone" com a mesma lista em forma de opções com ícone (listbox do DS). Os dois mudam o mesmo valor.
 */
import { useState } from "react";
import { Button, Popover, Select, SelectList } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { FileTypeIcon } from "./FileTypeIcon";
import type { FileIconSource } from "./kinds";

export interface FileTypeSelectProps {
  id: string;
  describedBy?: string;
  invalid?: boolean;
  value: string;
  onChange: (value: string) => void;
  /** opções reais (sem a de "escolha…") */
  options: readonly { value: string; label: string }[];
  /** opção vazia no início (ex.: "Escolha…") */
  placeholder?: string;
  /** de onde sai o ícone de cada valor */
  iconOf: (value: string) => FileIconSource;
  /** nome do campo, para o painel ("Tipo") */
  fieldLabel: string;
  testId?: string;
}

export function FileTypeSelect({ id, describedBy, invalid, value, onChange, options, placeholder, iconOf, fieldLabel, testId }: FileTypeSelectProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const all = placeholder !== undefined ? [{ value: "", label: placeholder }, ...options] : options;
  return (
    <div className="flex items-center gap-2" data-testid={testId}>
      <span className="grid size-9 shrink-0 place-items-center" data-testid={testId ? `${testId}-icon` : undefined}>
        {value ? <FileTypeIcon {...iconOf(value)} size={30} /> : <FileTypeIcon size={30} />}
      </span>
      <div className="min-w-0 flex-1">
        <Select id={id} aria-describedby={describedBy} invalid={invalid} value={value} onChange={(e) => onChange(e.target.value)} options={all} />
      </div>
      <Popover
        open={open} onOpenChange={setOpen} align="end" label={t("fileIcon.pickerLabel", { field: fieldLabel })} width="w-[min(92vw,24rem)]"
        trigger={<Button size="sm" variant="ghost" data-testid={testId ? `${testId}-picker` : undefined}>{t("fileIcon.picker")}</Button>}
      >
        <div className="max-h-[min(60vh,26rem)] overflow-auto">
          <SelectList
            label={t("fileIcon.pickerLabel", { field: fieldLabel })}
            value={value ? [value] : []}
            onChange={(ids) => {
              if (ids[0]) onChange(ids[0]);
              setOpen(false);
            }}
            options={options.map((o) => ({
              id: o.value,
              title: (
                <span className="flex items-center gap-2" data-option={o.value}>
                  <FileTypeIcon {...iconOf(o.value)} size={26} />
                  <span>{o.label}</span>
                </span>
              ),
            }))}
          />
        </div>
      </Popover>
    </div>
  );
}
