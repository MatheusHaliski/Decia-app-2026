"use client";
/**
 * Escolha de arquivos do criador e da seção de anexos: área de arrastar e soltar, input com vários arquivos e `accept` dos tipos que o
 * servidor aceita (`lib/tasks/accepted.ts`) e, no celular, um segundo input só de imagem com `capture` (abre a câmera traseira). O
 * teclado usa os inputs (arrastar é só um atalho); a lista dos tipos aceitos fica visível.
 */
import { useState, type DragEvent } from "react";
import { Field, Input, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { acceptAttribute, acceptedLabels } from "@/lib/tasks/accepted";

export interface FileDropProps {
  label: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  multiple?: boolean;
  /** oferece "tirar foto" (input de imagem com `capture`) */
  camera?: boolean;
  onFiles: (files: File[]) => void;
  testId?: string;
}

export function FileDrop({ label, hint, error, disabled, multiple = true, camera = true, onFiles, testId = "file-drop" }: FileDropProps) {
  const { t } = useI18n();
  const [over, setOver] = useState(false);
  const take = (list: FileList | null | undefined) => {
    const files = list ? [...list] : [];
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };
  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    if (!over) setOver(true);
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    if (!disabled) take(e.dataTransfer?.files);
  };
  return (
    <div
      className={cn(
        "grid gap-2 rounded-[var(--ws-radius-md)] border-2 border-dashed p-3 transition-colors",
        over ? "border-ws-accent bg-ws-accent-soft" : "border-ws-border bg-ws-surface-2",
        disabled && "opacity-60",
      )}
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      data-testid={testId}
      data-dragging={over || undefined}
    >
      <p className="text-[length:var(--ws-text-body-sm)] font-semibold"><span aria-hidden>⇣ </span>{t(over ? "criador2.drop.release" : "criador2.drop.zone")}</p>
      <Field label={label} hint={hint} error={error}>
        {({ id, describedBy, invalid }) => (
          <Input id={id} type="file" multiple={multiple} accept={acceptAttribute()} aria-describedby={describedBy} invalid={invalid} disabled={disabled}
            data-testid={`${testId}-input`} onChange={(e) => { take(e.target.files); e.target.value = ""; }} />
        )}
      </Field>
      {camera ? (
        <Field label={t("criador2.drop.camera")} hint={t("criador2.drop.cameraHint")}>
          {({ id, describedBy }) => (
            <Input id={id} type="file" accept={acceptAttribute(true)} capture="environment" aria-describedby={describedBy} disabled={disabled}
              data-testid={`${testId}-camera`} onChange={(e) => { take(e.target.files); e.target.value = ""; }} />
          )}
        </Field>
      ) : null}
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted" data-testid={`${testId}-accepted`}>{t("criador2.drop.accepted", { types: acceptedLabels().join(", ") })}</p>
    </div>
  );
}
