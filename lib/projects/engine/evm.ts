/**
 * Gerenciamento do Valor Agregado (EVM / GVA) — aula "Execução, monitoramento e controle" §4.2; RF43.CA09 (`evmJson`).
 *   VP (PV) valor planejado · VA (EV) valor agregado · CR (AC) custo real · ONT (BAC) orçamento no término
 *   VC = VA − CR (positivo = abaixo do orçamento)      VPr = VA − VP (positivo = adiantado)
 *   IDC = VA / CR (> 1 = eficiente)                     IDP = VA / VP (> 1 = adiantado)
 *   ENT (EAC) = ONT / IDC (desempenho de custo continua) · EPT (ETC) = ENT − CR · VNT (VAC) = ONT − ENT
 *   ENT atípico = CR + (ONT − VA) · ENT composto = CR + (ONT − VA) / (IDC · IDP) · IDPT (TCPI) = (ONT − VA) / (ONT − CR)
 * Curva S: VP acumulado ao longo do tempo, com o orçamento de cada atividade distribuído linearmente na sua duração (§3.4).
 */
import type { SchedRow } from "./schedule";

export interface EvmInput { pv: number; ev: number; ac: number; bac: number }
export type CostVerdict = "ABAIXO_DO_ORCAMENTO" | "NO_ORCAMENTO" | "ACIMA_DO_ORCAMENTO";
export type ScheduleVerdict = "ADIANTADO" | "NO_PRAZO" | "ATRASADO";

export interface EvmResult extends EvmInput {
  cv: number;
  sv: number;
  cpi: number | null;
  spi: number | null;
  eac: number | null;
  etc: number | null;
  vac: number | null;
  eacAtypical: number;
  eacComposite: number | null;
  tcpi: number | null;
  cost: CostVerdict | null;
  schedule: ScheduleVerdict | null;
}

const r2 = (x: number) => Math.round(x * 100) / 100;
const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
/** Tolerância para chamar de "no orçamento/no prazo" (índice entre 0,995 e 1,005 — arredonda a 2 casas como a aula). */
const TOL = 0.005;

export function evm({ pv, ev, ac, bac }: EvmInput): EvmResult {
  const cpi = ac > 0 ? r4(ev / ac) : null;
  const spi = pv > 0 ? r4(ev / pv) : null;
  const eac = cpi && cpi > 0 ? r2(bac / cpi) : null;
  const etc = eac === null ? null : r2(eac - ac);
  const vac = eac === null ? null : r2(bac - eac);
  const eacComposite = cpi && spi ? r2(ac + (bac - ev) / (cpi * spi)) : null;
  const tcpi = bac - ac !== 0 ? r4((bac - ev) / (bac - ac)) : null;
  const cost: CostVerdict | null = cpi === null ? null : cpi > 1 + TOL ? "ABAIXO_DO_ORCAMENTO" : cpi < 1 - TOL ? "ACIMA_DO_ORCAMENTO" : "NO_ORCAMENTO";
  const schedule: ScheduleVerdict | null = spi === null ? null : spi > 1 + TOL ? "ADIANTADO" : spi < 1 - TOL ? "ATRASADO" : "NO_PRAZO";
  return {
    pv, ev, ac, bac, cv: r2(ev - ac), sv: r2(ev - pv), cpi, spi, eac, etc, vac,
    eacAtypical: r2(ac + (bac - ev)), eacComposite, tcpi, cost, schedule,
  };
}

/** Fração planejada de uma atividade concluída no instante `t` (linear na duração; marco de duração 0 = degrau em ES). */
export function plannedFraction(row: Pick<SchedRow, "es" | "ef" | "duration">, t: number): number {
  if (row.duration <= 0) return t >= row.es ? 1 : 0;
  return Math.max(0, Math.min(1, (t - row.es) / row.duration));
}

/** VP acumulado em `t` (dias desde o início) a partir do cronograma e do orçamento de cada atividade. */
export function plannedValueAt(rows: Readonly<Record<string, Pick<SchedRow, "es" | "ef" | "duration">>>, budgets: Readonly<Record<string, number>>, t: number): number {
  let pv = 0;
  for (const [id, row] of Object.entries(rows)) pv += (budgets[id] ?? 0) * plannedFraction(row, t);
  return r2(pv);
}

/** Pontos da curva S (VP acumulado por dia, de 0 até o término). */
export function sCurve(rows: Readonly<Record<string, Pick<SchedRow, "es" | "ef" | "duration">>>, budgets: Readonly<Record<string, number>>, finish: number, step = 1): { t: number; pv: number }[] {
  const pts: { t: number; pv: number }[] = [];
  const end = Math.ceil(finish);
  for (let t = 0; t <= end; t += step) pts.push({ t, pv: plannedValueAt(rows, budgets, t) });
  if (pts[pts.length - 1]?.t !== end) pts.push({ t: end, pv: plannedValueAt(rows, budgets, end) });
  return pts;
}

/** VA = Σ orçamento × % concluído; CR = Σ custo real. */
export function earnedAndActual(tasks: readonly { budget: number; percentComplete: number; actualCost: number }[]): { ev: number; ac: number; bac: number } {
  let ev = 0;
  let ac = 0;
  let bac = 0;
  for (const t of tasks) {
    ev += t.budget * Math.max(0, Math.min(100, t.percentComplete)) / 100;
    ac += t.actualCost;
    bac += t.budget;
  }
  return { ev: r2(ev), ac: r2(ac), bac: r2(bac) };
}
