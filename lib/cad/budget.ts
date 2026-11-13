/**
 * Planilha orçamentária a partir do quantitativo (RF34.CA03): cada linha incluída vira um serviço com o preço unitário da
 * TABELA DE EXEMPLO abaixo (valores fictícios, editáveis — a tela diz para usar a tabela de referência vigente do órgão,
 * como SINAPI/SICRO), agrupado pela etapa da obra, com subtotais, BDI (%) e total. Mais duas linhas fixas: instalação do
 * canteiro (verba) e limpeza final (sobre a área construída). Dinheiro em centavos inteiros (sem erro de arredondamento):
 * total da linha = quantidade (2 casas) × preço unitário.
 */
import { KIND_STAGE } from "./classify";
import type { ItemKind, QtyUnit, StageId, TakeoffRow } from "./types";
import { STAGES } from "./types";
import { round } from "./units";

export const SERVICES = [
  "CANTEIRO", "FUNDACAO_CONCRETO", "ESTRUTURA_CONCRETO", "LAJE_FORMA", "ESCADA", "ALVENARIA", "COBERTURA", "LUMINARIA", "TOMADA", "INTERRUPTOR",
  "LOUCA", "TUBULACAO", "ELETRODUTO", "PORTA", "JANELA", "PISO", "FORRO", "REVESTIMENTO", "GUARDA_CORPO", "LIMPEZA",
] as const;
export type ServiceId = (typeof SERVICES)[number];

export interface PriceItem {
  code: string;
  service: ServiceId;
  unit: QtyUnit;
  /** preço unitário de EXEMPLO, centavos de real */
  priceCents: number;
  stage: StageId;
  /** classes de item que este serviço precifica (vazio = linha fixa) */
  kinds: readonly ItemKind[];
}

/** Tabela de EXEMPLO (valores fictícios para demonstrar o cálculo; não são de nenhuma tabela oficial). */
export const EXAMPLE_PRICES: readonly PriceItem[] = [
  { code: "EX-01", service: "CANTEIRO", unit: "un", priceCents: 1_500_000, stage: "CANTEIRO", kinds: [] },
  { code: "EX-02", service: "FUNDACAO_CONCRETO", unit: "m3", priceCents: 95_000, stage: "FUNDACAO", kinds: ["FUNDACAO"] },
  { code: "EX-03", service: "ESTRUTURA_CONCRETO", unit: "m3", priceCents: 250_000, stage: "ESTRUTURA", kinds: ["PILAR", "VIGA", "LAJE"] },
  { code: "EX-04", service: "LAJE_FORMA", unit: "m2", priceCents: 18_000, stage: "ESTRUTURA", kinds: ["LAJE"] },
  { code: "EX-05", service: "ESCADA", unit: "un", priceCents: 650_000, stage: "ESTRUTURA", kinds: ["ESCADA"] },
  { code: "EX-06", service: "ALVENARIA", unit: "m2", priceCents: 9_500, stage: "ALVENARIA", kinds: ["PAREDE"] },
  { code: "EX-07", service: "COBERTURA", unit: "m2", priceCents: 21_000, stage: "COBERTURA", kinds: ["COBERTURA"] },
  { code: "EX-08", service: "LUMINARIA", unit: "un", priceCents: 18_000, stage: "INSTALACOES", kinds: ["LUMINARIA"] },
  { code: "EX-09", service: "TOMADA", unit: "un", priceCents: 7_500, stage: "INSTALACOES", kinds: ["TOMADA"] },
  { code: "EX-10", service: "INTERRUPTOR", unit: "un", priceCents: 6_000, stage: "INSTALACOES", kinds: ["INTERRUPTOR"] },
  { code: "EX-11", service: "LOUCA", unit: "un", priceCents: 65_000, stage: "INSTALACOES", kinds: ["LOUCA"] },
  { code: "EX-12", service: "TUBULACAO", unit: "m", priceCents: 4_500, stage: "INSTALACOES", kinds: ["TUBULACAO"] },
  { code: "EX-13", service: "ELETRODUTO", unit: "m", priceCents: 1_800, stage: "INSTALACOES", kinds: ["ELETRODUTO"] },
  { code: "EX-14", service: "PORTA", unit: "un", priceCents: 95_000, stage: "REVESTIMENTOS", kinds: ["PORTA"] },
  { code: "EX-15", service: "JANELA", unit: "un", priceCents: 130_000, stage: "REVESTIMENTOS", kinds: ["JANELA"] },
  { code: "EX-16", service: "PISO", unit: "m2", priceCents: 12_000, stage: "REVESTIMENTOS", kinds: ["PISO", "AMBIENTE"] },
  { code: "EX-17", service: "FORRO", unit: "m2", priceCents: 7_500, stage: "REVESTIMENTOS", kinds: ["FORRO"] },
  { code: "EX-18", service: "REVESTIMENTO", unit: "m2", priceCents: 6_500, stage: "REVESTIMENTOS", kinds: ["REVESTIMENTO"] },
  { code: "EX-19", service: "GUARDA_CORPO", unit: "m", priceCents: 38_000, stage: "REVESTIMENTOS", kinds: ["GUARDA_CORPO"] },
  { code: "EX-20", service: "LIMPEZA", unit: "m2", priceCents: 800, stage: "LIMPEZA", kinds: [] },
];

export const DEFAULT_BDI_PERCENT = 25;

/** Preços por código (centavos) — o que a pessoa edita. */
export type PriceTable = Record<string, number>;
export const examplePriceTable = (): PriceTable => Object.fromEntries(EXAMPLE_PRICES.map((p) => [p.code, p.priceCents]));

export type BudgetGroup = StageId | "OUTROS";

export interface BudgetLine {
  id: string;
  /** código da tabela; null = sem preço de exemplo para este item (preço a informar) */
  code: string | null;
  service: ServiceId | null;
  group: BudgetGroup;
  /** linha do quantitativo de origem (null = linha fixa) */
  rowId: string | null;
  kind: ItemKind | null;
  /** rótulo do arquivo (camada, bloco, ambiente, material) */
  label: string;
  unit: QtyUnit;
  /** 2 casas */
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

export interface Budget {
  lines: BudgetLine[];
  groups: { group: BudgetGroup; subtotalCents: number; lines: BudgetLine[] }[];
  directCents: number;
  bdiPercent: number;
  bdiCents: number;
  totalCents: number;
  /** linhas sem preço (a informar) */
  unpriced: number;
}

export function priceItemFor(kind: ItemKind, unit: QtyUnit): PriceItem | null {
  return EXAMPLE_PRICES.find((p) => p.unit === unit && p.kinds.includes(kind)) ?? null;
}

const clampBdi = (v: number) => (Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0);

export function buildBudget(rows: readonly TakeoffRow[], prices: PriceTable, bdiPercent: number, builtAreaM2: number | null): Budget {
  const lines: BudgetLine[] = [];
  const priceOf = (code: string) => {
    const p = prices[code];
    return Number.isFinite(p) && p! >= 0 ? Math.round(p!) : EXAMPLE_PRICES.find((x) => x.code === code)?.priceCents ?? 0;
  };
  const line = (l: Omit<BudgetLine, "totalCents" | "quantity"> & { quantity: number }): BudgetLine => {
    const quantity = round(l.quantity, 2);
    return { ...l, quantity, totalCents: Math.round(quantity * l.unitPriceCents) };
  };
  const canteiro = EXAMPLE_PRICES[0]!;
  lines.push(line({ id: "fixa:canteiro", code: canteiro.code, service: canteiro.service, group: "CANTEIRO", rowId: null, kind: null, label: "", unit: "un", quantity: 1, unitPriceCents: priceOf(canteiro.code) }));
  for (const r of rows) {
    if (!r.included || !(r.quantity > 0)) continue;
    const item = priceItemFor(r.kind, r.unit);
    const group: BudgetGroup = item?.stage ?? KIND_STAGE[r.kind] ?? "OUTROS";
    lines.push(line({
      id: `linha:${r.id}`, code: item?.code ?? null, service: item?.service ?? null, group, rowId: r.id, kind: r.kind, label: r.label,
      unit: r.unit, quantity: r.quantity, unitPriceCents: item ? priceOf(item.code) : Math.round(prices[`row:${r.id}`] ?? 0),
    }));
  }
  const limpeza = EXAMPLE_PRICES.find((p) => p.service === "LIMPEZA")!;
  if (builtAreaM2 && builtAreaM2 > 0) {
    lines.push(line({ id: "fixa:limpeza", code: limpeza.code, service: limpeza.service, group: "LIMPEZA", rowId: null, kind: null, label: "", unit: "m2", quantity: builtAreaM2, unitPriceCents: priceOf(limpeza.code) }));
  }
  const order: BudgetGroup[] = [...STAGES, "OUTROS"];
  const groups = order
    .map((group) => {
      const ls = lines.filter((l) => l.group === group);
      return { group, lines: ls, subtotalCents: ls.reduce((s, l) => s + l.totalCents, 0) };
    })
    .filter((g) => g.lines.length);
  const directCents = lines.reduce((s, l) => s + l.totalCents, 0);
  const bdi = clampBdi(bdiPercent);
  const bdiCents = Math.round((directCents * bdi) / 100);
  return {
    lines: groups.flatMap((g) => g.lines),
    groups,
    directCents,
    bdiPercent: bdi,
    bdiCents,
    totalCents: directCents + bdiCents,
    unpriced: lines.filter((l) => l.code === null && l.unitPriceCents === 0).length,
  };
}

/* ───────────────────────────── CSV ───────────────────────────── */

export interface CsvOptions {
  delimiter: ";" | ",";
  decimal: "," | ".";
}

/** Formato de CSV do idioma: pt-BR/es abrem no Excel com ";" e vírgula decimal; en com "," e ponto. */
export const csvOptionsFor = (locale: string): CsvOptions => (locale.startsWith("en") ? { delimiter: ",", decimal: "." } : { delimiter: ";", decimal: "," });

/** Texto vindo do arquivo pode começar com = + - @ e virar fórmula na planilha: prefixa apóstrofo (injeção de CSV). */
function safeText(s: string): string {
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

function cell(v: string | number | null, o: CsvOptions, digits = 2): string {
  if (v === null) return "";
  if (typeof v === "number") return (Number.isFinite(v) ? v.toFixed(digits) : "").replace(".", o.decimal);
  const s = safeText(v.replace(/\r?\n/g, " "));
  return /["\n\r]/.test(s) || s.includes(o.delimiter) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Tabela → CSV com BOM (o Excel reconhece UTF-8). Números com 2 casas e o separador decimal do idioma. */
export function toCsv(table: readonly (readonly (string | number | null)[])[], o: CsvOptions): string {
  return "﻿" + table.map((row) => row.map((v) => cell(v, o)).join(o.delimiter)).join("\r\n") + "\r\n";
}

export interface BudgetCsvLabels {
  header: readonly string[];
  group: (g: BudgetGroup) => string;
  service: (l: BudgetLine) => string;
  unit: (u: QtyUnit) => string;
  subtotal: (g: BudgetGroup) => string;
  direct: string;
  bdi: string;
  total: string;
  note: string;
}

/** Planilha em CSV: cabeçalho, linhas por etapa com subtotal, custo direto, BDI e total, e a nota de valores de exemplo. */
export function budgetCsv(b: Budget, labels: BudgetCsvLabels, o: CsvOptions): string {
  const money = (cents: number) => cents / 100;
  const rows: (string | number | null)[][] = [[...labels.header]];
  for (const g of b.groups) {
    for (const l of g.lines) rows.push([l.code ?? "", labels.group(g.group), labels.service(l), l.label, labels.unit(l.unit), l.quantity, money(l.unitPriceCents), money(l.totalCents)]);
    rows.push(["", labels.group(g.group), labels.subtotal(g.group), "", "", null, null, money(g.subtotalCents)]);
  }
  rows.push(["", "", labels.direct, "", "", null, null, money(b.directCents)]);
  rows.push(["", "", labels.bdi, "", "", b.bdiPercent, null, money(b.bdiCents)]);
  rows.push(["", "", labels.total, "", "", null, null, money(b.totalCents)]);
  rows.push([labels.note]);
  return toCsv(rows, o);
}
