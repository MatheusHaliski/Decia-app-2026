"use client";
/**
 * Barra "Documento" do editor: importar (diálogo com relatório de fidelidade) e exportar nos formatos HABILITADOS
 * (RF52.CA05) + versão para impressão (o navegador salva como PDF). Formatos pendentes não aparecem.
 */
import { useState } from "react";
import { Button, Popover, PopoverClose } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import type { ImportMode } from "@/lib/letters/io/apply";
import { exportPiece, fileNameFor, printHtml } from "@/lib/letters/io/export";
import { enabledExports } from "@/lib/letters/io/formats";
import type { ExportFormat, ImportedDocument } from "@/lib/letters/io/model";
import type { LetterPiece } from "@/lib/letters/pieces";
import { ImportDialog } from "./ImportDialog";
import { exportLabels, openPrintVersion, saveFile } from "./transfer";

export interface DocumentToolsProps {
  piece: LetterPiece;
  onImport: (doc: ImportedDocument, mode: ImportMode) => void;
  announce: (text: string, assertive?: boolean) => void;
}

export function DocumentTools({ piece, onImport, announce }: DocumentToolsProps) {
  const { t, intl } = useI18n();
  const [importOpen, setImportOpen] = useState(false);
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  const doExport = async (format: ExportFormat) => {
    setBusy(format);
    try {
      const file = await exportPiece(piece, format, exportLabels(piece, t, intl));
      saveFile(file);
      announce(t("letters.io.export.done", { file: file.fileName }));
    } catch {
      announce(t("letters.io.export.failed", { format: format.toUpperCase() }), true);
    } finally {
      setBusy(null);
    }
  };

  const doPrint = () => {
    const how = openPrintVersion(printHtml(piece, exportLabels(piece, t, intl)), fileNameFor(piece.title, "html"));
    announce(t(how === "aberta" ? "letters.io.print.opened" : "letters.io.print.downloaded"));
  };

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("letters.io.toolbar")} data-testid="letters-document-tools">
      <Button size="sm" variant="default" icon="acervo" onClick={() => setImportOpen(true)} data-testid="editor-cmd-import">{t("letters.io.import.open")}</Button>
      <Popover
        label={t("letters.io.export.menu")}
        align="end"
        width="w-[min(92vw,20rem)]"
        trigger={<Button size="sm" variant="default" busy={!!busy} data-testid="editor-cmd-export">{t("letters.io.export.open")}</Button>}
      >
        <div className="grid gap-1" data-testid="letters-export-menu">
          {enabledExports().map((f) => (
            <PopoverClose asChild key={f}>
              <Button size="sm" variant="ghost" className="justify-start" disabled={!!busy} onClick={() => void doExport(f)} data-format={f}>
                {t(`letters.io.format.${f}`)}
              </Button>
            </PopoverClose>
          ))}
          <PopoverClose asChild>
            <Button size="sm" variant="ghost" className="justify-start" onClick={doPrint} data-format="pdf">{t("letters.io.print.action")}</Button>
          </PopoverClose>
          <p className="px-2 pt-1 text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("letters.io.export.note")}</p>
        </div>
      </Popover>
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} target="piece" onConfirm={onImport} />
    </div>
  );
}
