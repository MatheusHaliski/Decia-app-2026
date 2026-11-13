"use client";
/**
 * Aba Planilha orçamentária (RF34.CA03): serviços agrupados por etapa, preço unitário da tabela de EXEMPLO editável (vale para
 * todas as linhas do mesmo código), subtotais, BDI (%) e total, exportação em CSV. O aviso de que os valores são de exemplo
 * fica no topo, sempre visível.
 */
import { Button, Field } from "@/components/ui";
import type { Budget, BudgetLine } from "@/lib/cad/budget";
import { NumberCell } from "./QuantitiesTab";
import type { CadText } from "./useCadText";

export interface BudgetTabProps {
  budget: Budget;
  fileName: string;
  /** código da tabela (ou `row:<id>` para item sem preço de exemplo) → centavos */
  onPrice: (key: string, cents: number | null) => void;
  onBdi: (percent: number) => void;
  onReset: () => void;
  onCsv: () => void;
  text: CadText;
}

const TH = "px-2 py-2 font-semibold";
const TD = "px-2 py-2 align-top";

export const priceKey = (l: BudgetLine) => l.code ?? `row:${l.rowId}`;

export function BudgetTab({ budget, fileName, onPrice, onBdi, onReset, onCsv, text }: BudgetTabProps) {
  const { t } = text;
  const service = (l: BudgetLine) => (l.service ? t(`cad.service.${l.service}`) : t("cad.budget.noService", { kind: l.kind ? t(`cad.kind.${l.kind}`) : "" }));

  return (
    <div className="grid gap-[var(--ws-space-3)]">
      <p role="note" className="flex gap-2 rounded-[var(--ws-radius-md)] bg-ws-warning-soft px-3 py-2 text-[length:var(--ws-text-body-sm)] font-semibold text-ws-warning-ink" data-testid="cad-example-note">
        <span aria-hidden>⚠</span>
        <span>{t("cad.budget.exampleNote")}</span>
      </p>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field label={t("cad.budget.bdi")} hint={t("cad.budget.bdiHint")} className="w-56">
          {({ id, describedBy }) => (
            <NumberCell id={id} describedBy={describedBy} value={budget.bdiPercent} label={t("cad.budget.bdi")} min={0} max={100} testId="cad-bdi" className="w-28"
              onCommit={(v) => onBdi(v ?? 0)} />
          )}
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={onReset} data-testid="cad-prices-reset">{t("cad.budget.reset")}</Button>
          <Button size="sm" onClick={onCsv} data-testid="cad-budget-csv">{t("cad.budget.csv")}</Button>
        </div>
      </div>

      {budget.unpriced ? (
        <p className="text-[length:var(--ws-text-body-sm)] font-medium text-ws-warning-ink" role="status">
          <span aria-hidden>⚠ </span>
          {t("cad.budget.unpriced", { n: budget.unpriced })}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1">
        <table className="w-full min-w-[56rem] border-collapse text-[length:var(--ws-text-body-sm)]" data-testid="cad-budget">
          <caption className="sr-only">{t("cad.budget.caption", { file: fileName })}</caption>
          <thead className="bg-ws-surface-2 text-left text-[length:var(--ws-text-caption)] text-ws-text-muted">
            <tr>
              <th scope="col" className={TH}>{t("cad.budget.col.code")}</th>
              <th scope="col" className={TH}>{t("cad.budget.col.service")}</th>
              <th scope="col" className={TH}>{t("cad.budget.col.origin")}</th>
              <th scope="col" className={TH}>{t("cad.budget.col.unit")}</th>
              <th scope="col" className={`${TH} text-right`}>{t("cad.budget.col.quantity")}</th>
              <th scope="col" className={`${TH} text-right`}>{t("cad.budget.col.unitPrice")}</th>
              <th scope="col" className={`${TH} text-right`}>{t("cad.budget.col.total")}</th>
            </tr>
          </thead>
          {budget.groups.map((g) => (
            <tbody key={g.group} data-group={g.group}>
              <tr className="border-t border-ws-border bg-ws-surface-2">
                <th scope="colgroup" colSpan={7} className={`${TH} text-left`}>{t(`cad.group.${g.group}`)}</th>
              </tr>
              {g.lines.map((l) => (
                <tr key={l.id} data-line={l.id} className="border-t border-ws-border">
                  <td className={`${TD} font-[family-name:var(--ws-font-mono)]`}>{l.code ?? "—"}</td>
                  <th scope="row" className={`${TD} text-left font-normal`}>{service(l)}</th>
                  <td className={`${TD} font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] [overflow-wrap:anywhere]`}>{l.label || "—"}</td>
                  <td className={TD}>{text.unit(l.unit)}</td>
                  <td className={`${TD} text-right tabular-nums`}>{text.qty(l.quantity, l.unit)}</td>
                  <td className={`${TD} text-right`}>
                    <NumberCell value={l.unitPriceCents / 100} label={t("cad.budget.priceOf", { service: service(l) })} testId={`cad-price-${l.id}`}
                      onCommit={(v) => onPrice(priceKey(l), v === null ? null : Math.round(v * 100))} />
                  </td>
                  <td className={`${TD} text-right tabular-nums`} data-total={l.id}>{text.money(l.totalCents)}</td>
                </tr>
              ))}
              <tr className="border-t border-ws-border font-semibold">
                <th scope="row" colSpan={6} className={`${TD} text-right`}>{t("cad.budget.subtotal", { group: t(`cad.group.${g.group}`) })}</th>
                <td className={`${TD} text-right tabular-nums`}>{text.money(g.subtotalCents)}</td>
              </tr>
            </tbody>
          ))}
        </table>
      </div>

      <dl className="ml-auto grid w-full max-w-sm grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-[length:var(--ws-text-body-sm)]" aria-live="polite" data-testid="cad-budget-totals">
        <dt>{t("cad.budget.direct")}</dt>
        <dd className="text-right tabular-nums" data-testid="cad-direct">{text.money(budget.directCents)}</dd>
        <dt>{t("cad.budget.bdiLine", { bdi: text.n2.format(budget.bdiPercent) })}</dt>
        <dd className="text-right tabular-nums" data-testid="cad-bdi-value">{text.money(budget.bdiCents)}</dd>
        <dt className="font-semibold">{t("cad.budget.total")}</dt>
        <dd className="text-right font-semibold tabular-nums" data-testid="cad-total">{text.money(budget.totalCents)}</dd>
      </dl>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("cad.budget.priceHint")}</p>
    </div>
  );
}
