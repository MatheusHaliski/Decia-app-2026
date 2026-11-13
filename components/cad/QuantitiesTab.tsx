"use client";
/**
 * Aba Quantitativos (RF34.CA01 + CA04): uma linha por item normalizado — na planilha?, item, origem (camada, bloco, tipo IFC
 * ou malha), unidade, quantidade (corrigível; o valor original fica guardado), confiança com o motivo e alertas. As premissas
 * da área de parede derivada (pé-direito, linha dupla) ficam à vista e editáveis.
 */
import { Badge, Button, Checkbox, Field, Input } from "@/components/ui";
import type { RowEdit } from "@/lib/cad/takeoff";
import type { CadFormat, Confidence, TakeoffRow } from "@/lib/cad/types";
import { round } from "@/lib/cad/units";
import type { CadText } from "./useCadText";

export interface QuantitiesTabProps {
  format: CadFormat;
  fileName: string;
  rows: readonly TakeoffRow[];
  onEdit: (rowId: string, edit: RowEdit) => void;
  onUndo: (rowId: string) => void;
  wallHeightM: number;
  wallDoubleLine: boolean;
  onWallHeight: (m: number) => void;
  onWallDoubleLine: (v: boolean) => void;
  onCsv: () => void;
  text: CadText;
}

const CONF_TONE: Record<Confidence, "success" | "warning" | "danger"> = { ALTA: "success", MEDIA: "warning", BAIXA: "danger" };
const TH = "px-2 py-2 font-semibold";
const TD = "px-2 py-2 align-top";

/** Campo numérico que só confirma ao sair (ou Enter): deixa digitar "12," sem perder o cursor. */
export function NumberCell({ value, label, onCommit, step = "0.01", min = 0, max, testId, className, id, describedBy }: {
  value: number; label: string; onCommit: (v: number | null) => void; step?: string; min?: number; max?: number; testId?: string; className?: string;
  id?: string; describedBy?: string;
}) {
  const shown = String(round(value, 2));
  return (
    <Input
      key={shown}
      id={id}
      aria-describedby={describedBy}
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      defaultValue={shown}
      aria-label={label}
      data-testid={testId}
      className={className ?? "w-28 text-right"}
      onBlur={(e) => {
        const raw = e.currentTarget.value.trim().replace(",", ".");
        if (raw === "") return onCommit(null);
        const n = Number(raw);
        if (Number.isFinite(n) && n >= min && (max === undefined || n <= max)) onCommit(n);
        else e.currentTarget.value = shown;
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

export function QuantitiesTab(p: QuantitiesTabProps) {
  const { text } = p;
  const { t } = text;
  const included = p.rows.filter((r) => r.included).length;
  const corrected = p.rows.filter((r) => r.corrected).length;
  const hasDerived = p.rows.some((r) => r.formula);
  const item = (r: TakeoffRow) => (r.label ? `${text.kind(r)} — ${r.label}` : text.kind(r));
  const origin = (r: TakeoffRow) => {
    const base = t(`cad.source.${r.source.what}`, { ref: r.source.ref });
    if (!r.source.measure) return base;
    // códigos do leitor (LENGTH, COUNT…) são traduzidos; nomes de quantidade do IFC (NetSideArea) aparecem como estão
    return `${base} · ${/^[A-Z_]+$/.test(r.source.measure) ? t(`cad.measure.${r.source.measure}`) : r.source.measure}`;
  };

  if (!p.rows.length) {
    return <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted" data-testid="cad-quantities-empty">{t("cad.q.empty")}</p>;
  }

  return (
    <div className="grid gap-[var(--ws-space-3)]">
      {hasDerived ? (
        <fieldset className="grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-[var(--ws-space-3)]" data-testid="cad-premises">
          <legend className="px-1 text-[length:var(--ws-text-body-sm)] font-semibold">{t("cad.q.premises")}</legend>
          <div className="flex flex-wrap items-end gap-4">
            <Field label={t("cad.q.wallHeight")} hint={t("cad.q.wallHeightHint")} className="w-48">
              {({ id, describedBy }) => (
                <NumberCell id={id} describedBy={describedBy} value={p.wallHeightM} label={t("cad.q.wallHeight")} min={0.5} max={30} testId="cad-wall-height"
                  className="w-28" onCommit={(v) => p.onWallHeight(v ?? 2.8)} />
              )}
            </Field>
            <Checkbox checked={p.wallDoubleLine} onCheckedChange={p.onWallDoubleLine} label={t("cad.q.doubleLine")} hint={t("cad.q.doubleLineHint")} />
          </div>
        </fieldset>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted" aria-live="polite" data-testid="cad-q-summary">
          {t("cad.q.summary", { rows: p.rows.length, included, corrected })}
        </p>
        <Button size="sm" onClick={p.onCsv} data-testid="cad-q-csv">{t("cad.q.csv")}</Button>
      </div>

      <div className="overflow-x-auto rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1">
        <table className="w-full min-w-[60rem] border-collapse text-[length:var(--ws-text-body-sm)]" data-testid="cad-quantities">
          <caption className="sr-only">{t("cad.q.caption", { file: p.fileName })}</caption>
          <thead className="bg-ws-surface-2 text-left text-[length:var(--ws-text-caption)] text-ws-text-muted">
            <tr>
              <th scope="col" className={TH}>{t("cad.q.col.inBudget")}</th>
              <th scope="col" className={TH}>{t("cad.q.col.item")}</th>
              <th scope="col" className={TH}>{t("cad.q.col.origin")}</th>
              <th scope="col" className={TH}>{t("cad.q.col.unit")}</th>
              <th scope="col" className={`${TH} text-right`}>{t("cad.q.col.quantity")}</th>
              <th scope="col" className={TH}>{t("cad.q.col.confidence")}</th>
              <th scope="col" className={TH}>{t("cad.q.col.alerts")}</th>
            </tr>
          </thead>
          <tbody>
            {p.rows.map((r) => (
              <tr key={r.id} data-row={r.id} data-included={r.included || undefined} className={r.included ? "border-t border-ws-border" : "border-t border-ws-border text-ws-text-muted"}>
                <td className={TD}>
                  <Checkbox checked={r.included} onCheckedChange={(v) => p.onEdit(r.id, { included: v })} label={<span className="sr-only">{t("cad.q.includeRow", { item: item(r) })}</span>} />
                </td>
                <th scope="row" className={`${TD} text-left font-normal`}>
                  <span className="font-semibold text-ws-text">{text.kind(r)}</span>
                  {r.label ? <span className="block font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] [overflow-wrap:anywhere]">{r.label}</span> : null}
                  {r.detail ? <span className="block text-[length:var(--ws-text-caption)] text-ws-text-muted [overflow-wrap:anywhere]">{r.detail}</span> : null}
                  {r.formula ? (
                    <span className="block text-[length:var(--ws-text-caption)] text-ws-text-muted" data-formula>
                      {t(`cad.formula.${r.formula.code}`, {
                        lines: text.n2.format(Number(r.formula.vars.lines ?? 0)),
                        factor: Number(r.formula.vars.factor ?? 1),
                        mline: text.n2.format(Number(r.formula.vars.mline ?? 0)),
                        height: text.n2.format(Number(r.formula.vars.height ?? 0)),
                      })}
                    </span>
                  ) : null}
                  {r.sizes?.length ? (
                    <span className="block text-[length:var(--ws-text-caption)] text-ws-text-muted">
                      {r.sizes.map((s) => t("cad.q.size", { w: text.n2.format(s.w), h: text.n2.format(s.h), n: s.n })).join(" · ")}
                    </span>
                  ) : null}
                  {r.breakdown?.length ? (
                    <span className="block text-[length:var(--ws-text-caption)] text-ws-text-muted [overflow-wrap:anywhere]">
                      {r.breakdown.map((b) => `${b.label}: ${text.qty(b.quantity, r.unit)}`).join(" · ")}
                    </span>
                  ) : null}
                </th>
                <td className={`${TD} [overflow-wrap:anywhere]`}>{origin(r)}</td>
                <td className={TD}>{text.unit(r.unit)}</td>
                <td className={`${TD} text-right`}>
                  <NumberCell value={r.quantity} label={t("cad.q.quantityOf", { item: item(r) })} testId={`cad-qty-${r.id}`}
                    onCommit={(v) => (v === null ? p.onUndo(r.id) : p.onEdit(r.id, { quantity: v }))} />
                  {r.corrected ? (
                    <span className="mt-1 flex flex-wrap items-center justify-end gap-1">
                      <Badge tone="warning">{t("cad.q.corrected", { from: text.qty(r.corrected.from, r.unit) })}</Badge>
                      <Button size="sm" variant="ghost" onClick={() => p.onUndo(r.id)} aria-label={t("cad.q.undoOf", { item: item(r) })}>{t("cad.q.undo")}</Button>
                    </span>
                  ) : null}
                </td>
                <td className={TD}>
                  <Badge tone={CONF_TONE[r.confidence]}>{t(`cad.conf.${r.confidence}`)}</Badge>
                </td>
                <td className={TD}>
                  {r.alerts.length ? (
                    <ul className="grid gap-0.5 text-[length:var(--ws-text-caption)]">
                      {r.alerts.map((a, i) => <li key={`${a.code}-${i}`}>{text.alert(a)}</li>)}
                    </ul>
                  ) : (
                    <span className="text-ws-text-faint">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("cad.q.legend")}</p>
    </div>
  );
}
