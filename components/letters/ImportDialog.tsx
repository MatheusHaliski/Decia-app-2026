"use client";
/**
 * Importar documento (RF52.CA04, CA07; RF70.CA05, CA06): escolher o arquivo, ver o relatório (o que entra, prévia e o
 * que será descartado, aproximado ou achatado) e só então confirmar. Recusa mostra o motivo e não muda a peça.
 * O arquivo é lido neste navegador; o conteúdo aparece como texto, nunca como HTML.
 */
import { useRef, useState } from "react";
import { Badge, Button, Dialog, Input, RadioCards } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import type { ImportMode } from "@/lib/letters/io/apply";
import { IMPORT_ACCEPT, importFile } from "@/lib/letters/io/import";
import { IMPORT_LIMITS, type FidelityLoss, type ImportedDocument, type ImportRejection, type LossKind } from "@/lib/letters/io/model";
import { BLOCK_KINDS } from "@/lib/letters/types";
import { fileBytes } from "./transfer";

type Phase = { kind: "idle" } | { kind: "reading"; name: string } | { kind: "rejected"; name: string; reason: ImportRejection } | { kind: "ready"; doc: ImportedDocument };

const LOSS_ORDER: readonly LossKind[] = ["DESCARTADO", "APROXIMADO", "ACHATADO"];
const LOSS_TONE = { DESCARTADO: "danger", APROXIMADO: "warning", ACHATADO: "info" } as const;
const PREVIEW = 6;

export interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "piece": aplicar à peça aberta (substituir/acrescentar); "new": criar peça nova */
  target: "piece" | "new";
  onConfirm: (doc: ImportedDocument, mode: ImportMode) => void;
}

export function ImportDialog({ open, onOpenChange, target, onConfirm }: ImportDialogProps) {
  const { t, intl } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [mode, setMode] = useState<ImportMode>("SUBSTITUIR");
  const nf = new Intl.NumberFormat(intl);

  const read = async (file: File) => {
    setPhase({ kind: "reading", name: file.name });
    try {
      const r = await importFile({ name: file.name, bytes: await fileBytes(file) });
      setPhase(r.ok ? { kind: "ready", doc: r.doc } : { kind: "rejected", name: file.name, reason: r.reason });
    } catch {
      setPhase({ kind: "rejected", name: file.name, reason: "DOCX_INVALIDO" });
    }
  };

  const close = (next: boolean) => {
    if (!next) setPhase({ kind: "idle" });
    onOpenChange(next);
  };

  const confirm = () => {
    if (phase.kind !== "ready") return;
    onConfirm(phase.doc, mode);
    setPhase({ kind: "idle" });
    onOpenChange(false);
  };

  const losses = phase.kind === "ready" ? phase.doc.losses : [];
  const byKind = (k: LossKind) => losses.filter((l: FidelityLoss) => l.kind === k);

  return (
    <Dialog open={open} onOpenChange={close} title={t(target === "new" ? "letters.io.import.titleNew" : "letters.io.import.title")} description={t("letters.io.import.description")} className="w-[min(94vw,40rem)]">
      <div className="grid gap-[var(--ws-space-4)]" data-testid="letters-import">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant={phase.kind === "ready" ? "default" : "primary"} icon="acervo" busy={phase.kind === "reading"} disabled={phase.kind === "reading"} onClick={() => input.current?.click()}>
              {t(phase.kind === "idle" ? "letters.io.import.pick" : "letters.io.import.pickAnother")}
            </Button>
            <Input
              ref={input}
              type="file"
              accept={IMPORT_ACCEPT}
              className="sr-only"
              tabIndex={-1}
              aria-label={t("letters.io.import.inputLabel")}
              data-testid="letters-import-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void read(file);
              }}
            />
          </div>
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("letters.io.import.formats", { mb: IMPORT_LIMITS.maxBytes / (1024 * 1024) })}</p>
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("letters.io.import.privacy")}</p>
        </div>

        <div aria-live="polite" className="grid gap-[var(--ws-space-3)]">
          {phase.kind === "reading" ? <p className="text-[length:var(--ws-text-body-sm)]">{t("letters.io.import.reading", { file: phase.name })}</p> : null}

          {phase.kind === "rejected" ? (
            <div role="alert" className="grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-danger-soft p-[var(--ws-space-3)]" data-testid="letters-import-rejected" data-reason={phase.reason}>
              <p className="font-semibold text-ws-danger-ink">{t("letters.io.reject.title", { file: phase.name })}</p>
              <p className="text-[length:var(--ws-text-body-sm)]">{t(`letters.io.reject.${phase.reason}`, { mb: IMPORT_LIMITS.maxBytes / (1024 * 1024), blocks: nf.format(IMPORT_LIMITS.maxBlocks) })}</p>
              <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t(target === "new" ? "letters.io.reject.keepNew" : "letters.io.reject.keep")}</p>
            </div>
          ) : null}

          {phase.kind === "ready" ? (
            <section aria-labelledby="letters-import-report" className="grid gap-[var(--ws-space-3)]" data-testid="letters-import-report">
              <h3 id="letters-import-report" className="text-[length:var(--ws-text-body)] font-semibold">{t("letters.io.report.title")}</h3>
              <p className="text-[length:var(--ws-text-body-sm)]">
                {t("letters.io.report.summary", { file: phase.doc.fileName, format: phase.doc.format.toUpperCase(), blocks: nf.format(phase.doc.stats.blocks), chars: nf.format(phase.doc.stats.chars) })}
              </p>
              <ul className="flex flex-wrap gap-1.5" aria-label={t("letters.io.report.kinds")}>
                {BLOCK_KINDS.filter((k) => phase.doc.stats.byKind[k]).map((k) => (
                  <li key={k}>
                    <Badge tone="neutral" className="normal-case tracking-normal">{t("letters.io.report.kindCount", { kind: t(`letters.blockKind.${k}`), count: phase.doc.stats.byKind[k]! })}</Badge>
                  </li>
                ))}
              </ul>
              {phase.doc.meta.title ? <p className="text-[length:var(--ws-text-body-sm)]">{t("letters.io.report.docTitle", { title: phase.doc.meta.title })}</p> : null}
              {phase.doc.encoding === "windows-1252" ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("letters.io.report.encoding")}</p> : null}

              <div className="grid gap-2" data-testid="letters-import-losses">
                <h4 className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("letters.io.report.lossesTitle")}</h4>
                {losses.length === 0 ? (
                  <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("letters.io.report.noLosses")}</p>
                ) : (
                  LOSS_ORDER.filter((k) => byKind(k).length).map((k) => (
                    <div key={k} className="grid gap-1">
                      <p className="flex items-center gap-2 text-[length:var(--ws-text-body-sm)]">
                        <Badge tone={LOSS_TONE[k]}>{t(`letters.io.lossKind.${k}`)}</Badge>
                        <span className="text-ws-text-muted">{t(`letters.io.lossKindHint.${k}`)}</span>
                      </p>
                      <ul className="grid list-disc gap-0.5 pl-6 text-[length:var(--ws-text-body-sm)]" aria-label={t(`letters.io.lossKind.${k}`)}>
                        {byKind(k).map((l) => <li key={l.code} data-loss={l.code}>{t(`letters.io.loss.${l.code}`, { count: nf.format(l.count) })}</li>)}
                      </ul>
                    </div>
                  ))
                )}
              </div>

              <div className="grid gap-1">
                <h4 className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("letters.io.report.preview")}</h4>
                <ol className="grid max-h-48 gap-1 overflow-y-auto rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-[var(--ws-space-2)] text-[length:var(--ws-text-body-sm)]" aria-label={t("letters.io.report.preview")}>
                  {phase.doc.blocks.slice(0, PREVIEW).map((b, i) => (
                    <li key={i} className="grid gap-0.5">
                      <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t(`letters.blockKind.${b.kind}`)}</span>
                      <span className="line-clamp-3 whitespace-pre-line break-words">{b.text}</span>
                    </li>
                  ))}
                </ol>
                {phase.doc.blocks.length > PREVIEW ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("letters.io.report.previewMore", { count: nf.format(phase.doc.blocks.length - PREVIEW) })}</p> : null}
              </div>

              {target === "piece" ? (
                <RadioCards
                  label={t("letters.io.mode.label")}
                  value={mode}
                  onValueChange={(v) => setMode(v as ImportMode)}
                  columns={2}
                  options={(["SUBSTITUIR", "ACRESCENTAR"] as const).map((m) => ({ value: m, label: t(`letters.io.mode.${m}`), hint: t(`letters.io.mode.${m}Hint`) }))}
                />
              ) : null}
            </section>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => close(false)}>{t("common.cancel")}</Button>
          <Button variant="primary" disabled={phase.kind !== "ready"} onClick={confirm} data-testid="letters-import-confirm">
            {t(target === "new" ? "letters.io.import.confirmNew" : "letters.io.import.confirm")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
