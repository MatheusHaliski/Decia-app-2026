/**
 * Cronograma pré-preenchido (RF34.CA03): a sequência de serviços canteiro → fundação → estrutura → alvenaria → cobertura →
 * instalações → revestimentos/acabamentos → limpeza, cada etapa dependendo da anterior (fim-início). Duração em dias úteis =
 * Σ (quantidade ÷ produtividade de EXEMPLO por equipe) ÷ equipes, arredondada para cima. Sem quantidade específica no desenho,
 * a etapa usa a área construída como base (marcada como ESTIMADA); sem nenhuma base, fica A_DEFINIR (0 dia) — nunca inventada.
 * Calendário: segunda a sexta, sem feriados (a tela avisa).
 */
import type { ItemKind, QtyUnit, StageId, TakeoffRow } from "./types";
import { STAGES } from "./types";
import { round } from "./units";

export interface ProductivityPart {
  kinds: readonly ItemKind[];
  unit: QtyUnit;
  /** quantidade por dia útil por equipe (EXEMPLO) */
  perDay: number;
}

export interface StageRule {
  stage: StageId;
  /** alternativas em ordem: vale a primeira com quantidade; dentro dela as partes se somam */
  bases: readonly (readonly ProductivityPart[])[];
  /** m² de área construída por dia por equipe quando o desenho não traz quantidade da etapa */
  fallbackM2PerDay?: number;
  /** duração fixa (canteiro) */
  fixedDays?: number;
}

/** Produtividades de EXEMPLO — ajuste à equipe, ao método e à tabela de composições do órgão. */
export const EXAMPLE_PRODUCTIVITY: readonly StageRule[] = [
  { stage: "CANTEIRO", bases: [], fixedDays: 5 },
  { stage: "FUNDACAO", bases: [[{ kinds: ["FUNDACAO"], unit: "m3", perDay: 4 }]], fallbackM2PerDay: 40 },
  { stage: "ESTRUTURA", bases: [[{ kinds: ["PILAR", "VIGA", "LAJE"], unit: "m3", perDay: 3 }, { kinds: ["ESCADA"], unit: "un", perDay: 0.2 }], [{ kinds: ["LAJE"], unit: "m2", perDay: 20 }]], fallbackM2PerDay: 15 },
  { stage: "ALVENARIA", bases: [[{ kinds: ["PAREDE"], unit: "m2", perDay: 12 }]], fallbackM2PerDay: 10 },
  { stage: "COBERTURA", bases: [[{ kinds: ["COBERTURA"], unit: "m2", perDay: 20 }]], fallbackM2PerDay: 25 },
  {
    stage: "INSTALACOES",
    bases: [[{ kinds: ["LUMINARIA", "TOMADA", "INTERRUPTOR", "LOUCA"], unit: "un", perDay: 8 }, { kinds: ["TUBULACAO", "ELETRODUTO"], unit: "m", perDay: 30 }]],
    fallbackM2PerDay: 20,
  },
  {
    stage: "REVESTIMENTOS",
    bases: [[
      { kinds: ["AMBIENTE", "PISO"], unit: "m2", perDay: 15 },
      { kinds: ["FORRO"], unit: "m2", perDay: 20 },
      { kinds: ["REVESTIMENTO"], unit: "m2", perDay: 12 },
      { kinds: ["PORTA", "JANELA"], unit: "un", perDay: 4 },
      { kinds: ["GUARDA_CORPO"], unit: "m", perDay: 10 },
    ]],
    fallbackM2PerDay: 12,
  },
  { stage: "LIMPEZA", bases: [], fallbackM2PerDay: 150 },
];

export type ScheduleBasis =
  | { type: "QUANTIDADE"; parts: { kinds: readonly ItemKind[]; unit: QtyUnit; quantity: number; perDay: number }[] }
  | { type: "AREA"; areaM2: number; perDay: number }
  | { type: "FIXA"; days: number }
  | { type: "NENHUMA" };

export interface ScheduleItem {
  stage: StageId;
  dependsOn: StageId[];
  basis: ScheduleBasis;
  teams: number;
  days: number;
  /** dias úteis a partir do início (intervalo [startDay, endDay)) */
  startDay: number;
  endDay: number;
  /** datas ISO (inclusive); null quando a duração é zero */
  start: string | null;
  end: string | null;
  status: "CALCULADA" | "ESTIMADA" | "FIXA" | "A_DEFINIR";
}

export interface Schedule {
  start: string;
  items: ScheduleItem[];
  totalDays: number;
  end: string | null;
  undefinedStages: StageId[];
}

/* ───────────────────────────── calendário ───────────────────────────── */

const parseIso = (iso: string): number | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isFinite(t) ? t : null;
};
const toIso = (t: number) => new Date(t).toISOString().slice(0, 10);
const DAY = 86_400_000;
const isWeekend = (t: number) => {
  const d = new Date(t).getUTCDay();
  return d === 0 || d === 6;
};

/** Primeiro dia útil a partir da data (inclusive). */
export function firstWorkday(iso: string): string {
  let t = parseIso(iso);
  if (t === null) return iso;
  while (isWeekend(t)) t += DAY;
  return toIso(t);
}

/** Avança n dias úteis (segunda a sexta) a partir de uma data útil. */
export function addWorkdays(iso: string, n: number): string {
  let t = parseIso(firstWorkday(iso));
  if (t === null) return iso;
  let left = Math.max(0, Math.trunc(n));
  while (left > 0) {
    t += DAY;
    if (!isWeekend(t)) left--;
  }
  return toIso(t);
}

/** Próxima segunda-feira depois da data (local) — início padrão do cronograma. */
export function nextMonday(from: Date): string {
  let t = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate()) + DAY;
  while (new Date(t).getUTCDay() !== 1) t += DAY;
  return toIso(t);
}

export const isIsoDate = (s: string) => parseIso(s) !== null;

/* ───────────────────────────── cálculo ───────────────────────────── */

const sumOf = (rows: readonly TakeoffRow[], kinds: readonly ItemKind[], unit: QtyUnit) =>
  rows.filter((r) => r.included && r.unit === unit && kinds.includes(r.kind)).reduce((s, r) => s + r.quantity, 0);

export interface ScheduleOptions {
  start: string;
  /** equipes por etapa (padrão 1) */
  teams?: Partial<Record<StageId, number>>;
  builtAreaM2: number | null;
  rules?: readonly StageRule[];
}

export function buildSchedule(rows: readonly TakeoffRow[], opts: ScheduleOptions): Schedule {
  const rules = opts.rules ?? EXAMPLE_PRODUCTIVITY;
  const start = firstWorkday(opts.start);
  const items: ScheduleItem[] = [];
  let prevEnd = 0;
  for (const stage of STAGES) {
    const rule = rules.find((r) => r.stage === stage) ?? { stage, bases: [] };
    const teamsRaw = opts.teams?.[stage] ?? 1;
    const teams = Number.isFinite(teamsRaw) && teamsRaw >= 1 ? Math.min(50, Math.trunc(teamsRaw)) : 1;
    let basis: ScheduleBasis = { type: "NENHUMA" };
    let workDays = 0;
    let status: ScheduleItem["status"] = "A_DEFINIR";
    for (const alt of rule.bases) {
      const parts = alt.map((p) => ({ kinds: p.kinds, unit: p.unit, perDay: p.perDay, quantity: sumOf(rows, p.kinds, p.unit) }));
      if (parts.some((p) => p.quantity > 0)) {
        basis = { type: "QUANTIDADE", parts: parts.filter((p) => p.quantity > 0) };
        workDays = parts.reduce((s, p) => s + (p.quantity > 0 ? p.quantity / p.perDay : 0), 0);
        status = "CALCULADA";
        break;
      }
    }
    if (status === "A_DEFINIR" && rule.fixedDays) {
      basis = { type: "FIXA", days: rule.fixedDays };
      workDays = rule.fixedDays * teams;
      status = "FIXA";
    }
    if (status === "A_DEFINIR" && rule.fallbackM2PerDay && opts.builtAreaM2 && opts.builtAreaM2 > 0) {
      basis = { type: "AREA", areaM2: opts.builtAreaM2, perDay: rule.fallbackM2PerDay };
      workDays = opts.builtAreaM2 / rule.fallbackM2PerDay;
      status = "ESTIMADA";
    }
    const days = workDays > 0 ? Math.max(1, Math.ceil(round(workDays / teams, 6))) : 0;
    const startDay = prevEnd;
    const endDay = startDay + days;
    items.push({
      stage,
      dependsOn: items.length ? [items[items.length - 1]!.stage] : [],
      basis,
      teams,
      days,
      startDay,
      endDay,
      start: days ? addWorkdays(start, startDay) : null,
      end: days ? addWorkdays(start, endDay - 1) : null,
      status,
    });
    prevEnd = endDay;
  }
  const totalDays = prevEnd;
  return {
    start,
    items,
    totalDays,
    end: totalDays ? addWorkdays(start, totalDays - 1) : null,
    undefinedStages: items.filter((i) => i.status === "A_DEFINIR").map((i) => i.stage),
  };
}
