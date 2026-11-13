/**
 * Extrato, série mensal e regras em linguagem simples do DECIA Points (RF42.CA03) — funções puras sobre os lançamentos do razão
 * (`lib/points/ledger.ts`). O razão guarda na ordem de inserção; aqui tudo é ordenado pela data do lançamento. Meses e dias em
 * UTC, como os tetos do razão.
 */
import { EARN_EVENTS, SPEND_EVENTS, type EarnEvent, type PointsEntry, type PointsEvent, type PointsRule } from "./ledger";

export const ALL_EVENTS: readonly PointsEvent[] = [...EARN_EVENTS, ...SPEND_EVENTS];

/** Participação de qualidade no DECIA — a única origem de pontos novos pela regra do RF42. */
export const PARTICIPATION_EVENTS: readonly EarnEvent[] = [
  "ARGUMENTO_EVIDENCIA", "CONSENSO", "DIVERGENCIA_RESOLVIDA", "PERGUNTA_RESPONDIDA", "ARTEFATO_USADO", "DECISAO_VALIDADA",
  "PRESENCA_ENCERRADA", "REACAO_QUALIDADE", "ATA_RATIFICADA", "ENCAMINHAMENTO_CUMPRIDO",
];
/** Créditos que não nascem da conversa: bônus de benefício (RF39), meta (RF35), crédito ao autor do Balcão e doação recebida. */
export const OTHER_EARN_EVENTS: readonly EarnEvent[] = EARN_EVENTS.filter((e) => !PARTICIPATION_EVENTS.includes(e));

export const PERIODS = ["30d", "90d", "180d", "365d", "tudo"] as const;
export type Period = (typeof PERIODS)[number];
const PERIOD_DAYS: Record<Exclude<Period, "tudo">, number> = { "30d": 30, "90d": 90, "180d": 180, "365d": 365 };
const DAY_MS = 86_400_000;

export interface StatementFilter {
  event: PointsEvent | "TODOS";
  period: Period;
}

export const isPeriod = (v: unknown): v is Period => typeof v === "string" && (PERIODS as readonly string[]).includes(v);
export const isPointsEvent = (v: unknown): v is PointsEvent => typeof v === "string" && (ALL_EVENTS as readonly string[]).includes(v);

/** Do mais novo ao mais antigo, pela data (empate: o inserido depois primeiro). */
export function byNewest(entries: readonly PointsEntry[]): PointsEntry[] {
  return entries
    .map((e, i) => ({ e, i }))
    .sort((a, b) => (a.e.at === b.e.at ? a.i - b.i : a.e.at < b.e.at ? 1 : -1))
    .map((x) => x.e);
}

export function filterStatement(entries: readonly PointsEntry[], filter: StatementFilter, now: Date): PointsEntry[] {
  const from = filter.period === "tudo" ? null : now.getTime() - PERIOD_DAYS[filter.period] * DAY_MS;
  return byNewest(entries).filter((e) => (filter.event === "TODOS" || e.event === filter.event) && (from === null || Date.parse(e.at) >= from));
}

const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

export interface MonthPoint {
  /** AAAA-MM (UTC) */
  month: string;
  /** soma dos créditos do mês */
  earned: number;
  /** soma dos débitos do mês (positivo) */
  spent: number;
}

/** Últimos `months` meses até o mês de `now`, do mais antigo ao atual (meses sem lançamento ficam com zero). */
export function monthlySeries(entries: readonly PointsEntry[], now: Date, months = 6): MonthPoint[] {
  const out: MonthPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push({ month: monthKey(d), earned: 0, spent: 0 });
  }
  const index = new Map(out.map((m, i) => [m.month, i]));
  for (const e of entries) {
    const i = index.get(e.at.slice(0, 7));
    if (i === undefined) continue;
    if (e.delta > 0) out[i]!.earned += e.delta;
    else out[i]!.spent += -e.delta;
  }
  return out;
}

export interface PointsSummary {
  balance: number;
  earned: number;
  spent: number;
  earnedThisMonth: number;
  /** pontos de participação no DECIA (os demais créditos ficam de fora) */
  participation: number;
}

export function summarize(entries: readonly PointsEntry[], now: Date): PointsSummary {
  const month = monthKey(now);
  let earned = 0;
  let spent = 0;
  let earnedThisMonth = 0;
  let participation = 0;
  for (const e of entries) {
    if (e.delta > 0) {
      earned += e.delta;
      if (e.at.slice(0, 7) === month) earnedThisMonth += e.delta;
      if ((PARTICIPATION_EVENTS as readonly PointsEvent[]).includes(e.event)) participation += e.delta;
    } else spent += -e.delta;
  }
  return { balance: earned - spent, earned, spent, earnedThisMonth, participation };
}

export interface RuleView {
  event: EarnEvent;
  /** pontos por ocorrência; null = valor definido pelo fato (crédito ao autor, doação recebida) */
  points: number | null;
  dailyCap: number;
  perSessionCap: number;
  multiplier: boolean;
  active: boolean;
  participation: boolean;
}

/** Regras vigentes em ordem de leitura: participação primeiro, depois os demais créditos. */
export function ruleViews(rules: Readonly<Record<EarnEvent, PointsRule>>): RuleView[] {
  return [...PARTICIPATION_EVENTS, ...OTHER_EARN_EVENTS].map((event) => {
    const r = rules[event];
    return {
      event,
      points: r.points > 0 ? r.points : null,
      dailyCap: r.dailyCap,
      perSessionCap: r.perSessionCap,
      multiplier: r.multiplier,
      active: r.active,
      participation: PARTICIPATION_EVENTS.includes(event),
    };
  });
}

/** Faixa do multiplicador do perfil deliberativo (o razão limita a 0,5–2,0). */
export const MULTIPLIER_RANGE = { min: 0.5, max: 2 } as const;
