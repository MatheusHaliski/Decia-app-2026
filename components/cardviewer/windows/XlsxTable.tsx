"use client";
/** "Fotografia" do topo de uma planilha: tabela com cabeçalhos A, B, C…, números de linha, mesclagens simples e valores em cache. */
import { columnLetters, formatCell, type XlsxSnapshot } from "@/lib/cardviewer/xlsx";
import { useI18n } from "@/lib/i18n/useI18n";

export function XlsxTable({ snap }: { snap: XlsxSnapshot }) {
  const { t, intl } = useI18n();
  return (
    <div className="grid gap-1.5" data-testid="xlsx-snapshot">
      <p className="flex flex-wrap items-center gap-x-2 text-[length:var(--ws-text-body-sm)]">
        <span className="font-semibold">{t("cardviewer.xlsx.sheet", { name: snap.sheetName })}</span>
        <span className="text-ws-text-muted" data-testid="xlsx-rows">{t("cardviewer.xlsx.showing", { rows: snap.rows, total: snap.totalRows, cols: snap.cols, totalCols: snap.totalCols })}</span>
        {snap.sheetCount > 1 ? <span className="text-ws-text-muted">{t("cardviewer.xlsx.sheets", { n: snap.sheetCount })}</span> : null}
      </p>
      <div className="max-h-[56dvh] overflow-auto rounded-[var(--ws-radius-sm)] border border-ws-border">
        <table className="border-collapse text-[length:var(--ws-text-caption)]">
          <caption className="sr-only">{t("cardviewer.xlsx.caption", { name: snap.sheetName, rows: snap.rows, total: snap.totalRows })}</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky top-0 bg-ws-surface-3 px-1.5 py-0.5"><span className="sr-only">{t("cardviewer.xlsx.rowHeader")}</span></th>
              {Array.from({ length: snap.cols }, (_, c) => <th key={c} scope="col" className="sticky top-0 min-w-16 border-l border-ws-border bg-ws-surface-3 px-1.5 py-0.5 font-[family-name:var(--ws-font-mono)] font-semibold">{columnLetters(c)}</th>)}
            </tr>
          </thead>
          <tbody>
            {snap.grid.map((row, r) => (
              <tr key={r}>
                <th scope="row" className="bg-ws-surface-2 px-1.5 py-0.5 text-right font-[family-name:var(--ws-font-mono)] font-normal text-ws-text-muted">{r + 1}</th>
                {row.map((cell) => cell.covered ? null : (
                  <td key={cell.ref} rowSpan={cell.rowSpan} colSpan={cell.colSpan} data-ref={cell.ref}
                    className={`max-w-[14rem] truncate border-l border-t border-ws-border px-1.5 py-0.5 ${cell.value.kind === "number" ? "text-right tabular-nums" : ""} ${cell.value.kind === "error" ? "text-ws-danger-ink" : ""}`}
                    title={cell.formula ? t("cardviewer.xlsx.cached") : undefined}>
                    {formatCell(cell.value, intl)}{cell.formula ? <span className="sr-only"> ({t("cardviewer.xlsx.cached")})</span> : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {snap.formulasWithoutCache ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("cardviewer.xlsx.noCache", { n: snap.formulasWithoutCache })}</p> : null}
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-faint">{t("cardviewer.xlsx.safe")}</p>
    </div>
  );
}
