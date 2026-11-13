"use client";
/**
 * Textos e números da bancada de extração no idioma da pessoa: quantidade (un inteira; m, m², m³ com 2 casas), dinheiro em
 * reais, datas, alertas (`cad.alert.<código>` com a unidade traduzida), perdas, notas da IA e a versão do DWG. Dados do
 * arquivo (camadas, blocos, materiais) entram como estão.
 */
import { useMemo } from "react";
import type { AiNote } from "@/lib/cad/assistant";
import type { DwgInfo } from "@/lib/cad/dwg";
import type { CadAlert, CadLoss, QtyUnit, TakeoffRow } from "@/lib/cad/types";
import { useI18n } from "@/lib/i18n/useI18n";

export function useCadText() {
  const { t, intl, locale } = useI18n();
  return useMemo(() => {
    const n2 = new Intl.NumberFormat(intl, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const n0 = new Intl.NumberFormat(intl, { maximumFractionDigits: 0 });
    const brl = new Intl.NumberFormat(intl, { style: "currency", currency: "BRL" });
    const dateFmt = new Intl.DateTimeFormat(intl, { dateStyle: "short", timeZone: "UTC" });
    const qty = (value: number, unit: QtyUnit) => (unit === "un" ? n0.format(value) : n2.format(value));
    const unit = (u: QtyUnit) => t(`cad.qty.${u}`);
    const money = (cents: number) => brl.format(cents / 100);
    const date = (iso: string | null) => (iso ? dateFmt.format(new Date(`${iso}T00:00:00Z`)) : "—");
    const measure = new Intl.NumberFormat(intl, { minimumFractionDigits: 2, maximumFractionDigits: 3 });
    /** contagens ficam inteiras; medidas (m, m², m³) com 2 a 3 casas; `unit` é traduzida */
    const COUNTS = new Set(["n", "total", "code", "extent", "pct"]);
    const vars = (v: Record<string, string | number> | undefined) => {
      if (!v) return undefined;
      const out: Record<string, string | number> = { ...v };
      if (typeof v.unit === "string") out.unit = t(`cad.unit.${v.unit}`);
      for (const [k, val] of Object.entries(v)) if (typeof val === "number" && !COUNTS.has(k)) out[k] = measure.format(val);
      return out;
    };
    const alert = (a: CadAlert) => t(`cad.alert.${a.code}`, vars(a.vars));
    const loss = (l: CadLoss) => t(`cad.loss.${l.code}`, { n: l.n }) + (l.detail ? ` (${l.detail})` : "");
    const kind = (r: Pick<TakeoffRow, "kind">) => t(`cad.kind.${r.kind}`);
    const note = (n: AiNote) => {
      const v: Record<string, string | number> = { ...(n.vars ?? {}) };
      for (const k of n.money ?? []) if (typeof v[k] === "number") v[k] = money(v[k] as number);
      for (const k of n.dates ?? []) if (typeof v[k] === "string") v[k] = date(v[k] as string);
      for (const [k, ref] of Object.entries(n.refs ?? {})) {
        v[k] = ref.ns === "format" ? ref.id : t(`cad.${ref.ns === "kind" ? "kind" : ref.ns === "service" ? "service" : ref.ns === "stage" ? "stage" : "unit"}.${ref.id}`);
      }
      return t(`cad.ai.${n.code}`, v);
    };
    const dwg = (d: DwgInfo) =>
      !d.first ? t("cad.dwg.unknownVersion", { code: d.code })
        : !d.last ? t("cad.dwg.releaseFrom", { code: d.code, first: d.first })
          : d.first === d.last ? t("cad.dwg.releaseOne", { code: d.code, first: d.first })
            : t("cad.dwg.releaseRange", { code: d.code, first: d.first, last: d.last });
    const bytes = (n: number) => (n >= 1024 * 1024 ? t("cad.wb.sizeMb", { n: n2.format(n / 1024 / 1024) }) : t("cad.wb.sizeKb", { n: n0.format(Math.max(1, n / 1024)) }));
    return { t, intl, locale, n2, n0, qty, unit, money, date, alert, loss, kind, note, dwg, bytes };
  }, [t, intl, locale]);
}

export type CadText = ReturnType<typeof useCadText>;
