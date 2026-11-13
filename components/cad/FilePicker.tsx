"use client";
/**
 * Escolha do arquivo da bancada: botão (teclado) ou arrastar e soltar, anexos da tarefa quando houver, formatos aceitos com o
 * que cada um entrega, teto de tamanho e o aviso de privacidade (o arquivo é lido neste navegador).
 */
import { useRef, useState, type DragEvent } from "react";
import { Button, Card, Input, cn } from "@/components/ui";
import { ACCEPTED_EXTENSIONS, SIZE_LIMITS } from "@/lib/cad/read";
import type { TaskFile } from "@/lib/cad/taskFiles";
import { useI18n } from "@/lib/i18n/useI18n";

const MB = 1024 * 1024;

export interface FilePickerProps {
  onFile: (file: File) => void;
  busy: boolean;
  /** já há um arquivo lido: o cartão fica compacto */
  compact: boolean;
  attachments?: readonly TaskFile[];
  onAttachment?: (f: TaskFile) => void;
}

export function FilePicker({ onFile, busy, compact, attachments, onAttachment }: FilePickerProps) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const accept = ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(",");

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && !busy) onFile(file);
  };

  return (
    <Card padding="sm" data-testid="cad-picker">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!dragging) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        data-dragging={dragging || undefined}
        className={cn(
          "grid gap-3 rounded-[var(--ws-radius-md)] border-2 border-dashed p-[var(--ws-space-4)] transition-colors",
          dragging ? "border-ws-accent bg-ws-accent-soft" : "border-ws-border bg-ws-surface-1",
        )}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button variant={compact ? "default" : "primary"} icon="acervo" busy={busy} disabled={busy} onClick={() => input.current?.click()} data-testid="cad-pick">
            {t(compact ? "cad.wb.pickAnother" : "cad.wb.pick")}
          </Button>
          <span className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("cad.wb.drop")}</span>
        </div>
        <Input
          ref={input}
          type="file"
          accept={accept}
          className="sr-only"
          tabIndex={-1}
          aria-label={t("cad.wb.inputLabel")}
          disabled={busy}
          data-testid="cad-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onFile(file);
          }}
        />
        {attachments?.length ? (
          <div className="grid gap-1.5" data-testid="cad-attachments">
            <p className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("cad.wb.fromTask")}</p>
            <div className="flex flex-wrap gap-2">
              {attachments.map((a) => (
                <Button key={a.id} size="sm" variant="secondary" disabled={busy} onClick={() => onAttachment?.(a)} aria-label={t("cad.wb.readAttachment", { name: a.name })}>
                  {a.name}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("cad.wb.privacy")}</p>
        {!compact ? (
          <div className="grid gap-1.5 text-[length:var(--ws-text-body-sm)]">
            <p className="font-semibold">{t("cad.wb.formatsTitle")}</p>
            <ul className="grid gap-1 pl-1" data-testid="cad-formats">
              {(["DXF", "IFC", "GLB", "DWG"] as const).map((f) => (
                <li key={f} className="flex flex-wrap gap-2">
                  <span className="min-w-12 font-[family-name:var(--ws-font-mono)] font-semibold">.{f.toLowerCase()}</span>
                  <span className="min-w-0 flex-1 text-ws-text-muted">{t(`cad.wb.format.${f}`)}</span>
                </li>
              ))}
            </ul>
            <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
              {t("cad.wb.limits", { dxf: SIZE_LIMITS.DXF / MB, ifc: SIZE_LIMITS.IFC / MB, glb: SIZE_LIMITS.GLB / MB })}
            </p>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
