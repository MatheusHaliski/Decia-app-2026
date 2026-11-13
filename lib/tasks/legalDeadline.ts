/**
 * Prazo legal (RF20.CA11, RF41.CA04) — espelho EXATO de `LegalDeadlineCalendar.java` (ws-domain): os dois são conferidos pelos mesmos
 * casos (`ws-domain/src/test/resources/acervo/prazos-legais-casos.csv` e `feriados-nacionais.csv`). O servidor calcula e grava o
 * vencimento; aqui a conta serve para a prévia no formulário e para o estado do alerta (vence em X dias · vence hoje · vencida há X dias).
 *
 * Contagem (Lei nº 9.784/1999, art. 66): exclui o dia do começo e inclui o do vencimento; dias corridos contam de modo contínuo e, se o
 * vencimento cair em dia sem expediente, prorrogam até o primeiro dia útil seguinte; dias úteis contam só os úteis depois do início.
 * Dia útil = segunda a sexta fora dos feriados nacionais: 1º/1, Sexta-feira da Paixão (Páscoa − 2), 21/4, 1º/5, 7/9, 12/10, 2/11, 15/11,
 * 20/11 (a partir de 2024) e 25/12. Carnaval e Corpus Christi são ponto facultativo; feriado local fica para a regra da empresa. A data é
 * calculada pela regra cadastrada e deve ser conferida: o sistema não substitui a contagem oficial.
 *
 * Datas são texto ISO `AAAA-MM-DD` (dia civil, sem fuso), como a API devolve `LocalDate`.
 */
export const MAX_LEGAL_DAYS = 3650;
/** Janela de "vencendo" (a mesma de `AcervoQueries.DUE_SOON_DAYS`). */
export const DUE_SOON_DAYS = 7;

const DAY_MS = 86_400_000;
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

function toUtc(iso: string): number {
  const m = ISO.exec(iso);
  if (!m) throw new RangeError(`data inválida: ${iso}`);
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (fromUtc(t) !== iso) throw new RangeError(`data inválida: ${iso}`);
  return t;
}

function fromUtc(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

export const isIsoDate = (iso: string | null | undefined): iso is string => {
  if (!iso) return false;
  try {
    toUtc(iso);
    return true;
  } catch {
    return false;
  }
};

export const addDays = (iso: string, n: number) => fromUtc(toUtc(iso) + n * DAY_MS);

/** Dias de `from` até `to` (negativo quando `to` é anterior). */
export const daysBetween = (from: string, to: string) => Math.round((toUtc(to) - toUtc(from)) / DAY_MS);

const pad = (n: number) => String(n).padStart(2, "0");

/** Domingo de Páscoa no calendário gregoriano (algoritmo anônimo de Meeus/Jones/Butcher), igual ao Java. */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${pad(month)}-${pad(day)}`;
}

const holidayCache = new Map<number, Set<string>>();

function holidays(year: number): Set<string> {
  let set = holidayCache.get(year);
  if (!set) {
    const y = String(year).padStart(4, "0");
    set = new Set([`${y}-01-01`, addDays(easterSunday(year), -2), `${y}-04-21`, `${y}-05-01`, `${y}-09-07`, `${y}-10-12`, `${y}-11-02`, `${y}-11-15`, `${y}-12-25`]);
    if (year >= 2024) set.add(`${y}-11-20`);
    holidayCache.set(year, set);
  }
  return set;
}

/** Feriados nacionais do ano, em ordem de data. */
export const nationalHolidays = (year: number) => [...holidays(year)].sort();

export const isNationalHoliday = (iso: string) => holidays(Number(iso.slice(0, 4))).has(iso);

/** Segunda a sexta fora dos feriados nacionais. */
export function isBusinessDay(iso: string): boolean {
  const weekday = new Date(toUtc(iso)).getUTCDay();
  return weekday !== 0 && weekday !== 6 && !isNationalHoliday(iso);
}

/** Vencimento a partir da data de início (excluída da contagem), como `LegalDeadlineCalendar.dueDate`. */
export function legalDueDate(start: string, days: number, businessDays: boolean): string {
  toUtc(start);
  if (!Number.isInteger(days) || days < 1 || days > MAX_LEGAL_DAYS) throw new RangeError(`dias entre 1 e ${MAX_LEGAL_DAYS}`);
  if (businessDays) {
    let d = start;
    let counted = 0;
    while (counted < days) {
      d = addDays(d, 1);
      if (isBusinessDay(d)) counted += 1;
    }
    return d;
  }
  let d = addDays(start, days);
  while (!isBusinessDay(d)) d = addDays(d, 1);
  return d;
}

/** Dia civil LOCAL de quem olha (não o UTC): às 22 h de Brasília ainda é "hoje". */
export function localTodayIso(now: Date = new Date()): string {
  return `${String(now.getFullYear()).padStart(4, "0")}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export type DeadlineKind = "VENCIDA" | "HOJE" | "PROXIMA" | "EM_DIA";
export type DeadlineTone = "danger" | "warning" | "info" | "neutral";

/** Situação de um prazo em relação a hoje: `days` é sempre o número de dias até o vencimento (negativo = vencido). */
export interface DeadlineStatus { kind: DeadlineKind; days: number; tone: DeadlineTone }

/** Vencido → perigo; hoje e até 3 dias → âmbar (RF41: "card âmbar a 3 dias"); 4 a 7 → informação; depois → neutro. */
export function deadlineStatus(due: string, today: string): DeadlineStatus {
  const days = daysBetween(today, due);
  if (days < 0) return { kind: "VENCIDA", days, tone: "danger" };
  if (days === 0) return { kind: "HOJE", days, tone: "warning" };
  if (days <= DUE_SOON_DAYS) return { kind: "PROXIMA", days, tone: days <= 3 ? "warning" : "info" };
  return { kind: "EM_DIA", days, tone: "neutral" };
}

/** Marca textual do estado (sempre acompanha o texto; nunca só cor). */
export const DEADLINE_MARK: Record<DeadlineKind, string> = { VENCIDA: "⊘", HOJE: "◉", PROXIMA: "◷", EM_DIA: "✓" };

/** Data curta no idioma da tela (dia civil, sem deslocar pelo fuso); texto que não é data ISO volta como veio. */
export const formatIsoDate = (iso: string, intl: string) => {
  const day = iso.slice(0, 10);
  return isIsoDate(day)
    ? new Intl.DateTimeFormat(intl, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`))
    : iso;
};
