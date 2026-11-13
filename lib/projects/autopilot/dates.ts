/**
 * Datas e prazos em pt-BR para o Autopiloto (RF30.CA01: "extrai … prazo"). Funções puras, sem fuso: tudo em datas ISO
 * (AAAA-MM-DD) do calendário civil.
 *  • datas absolutas: "30/11/2026", "30.11.26", "30 de novembro de 2026", "1º de dezembro de 2026", "dezembro de 2026" (fim do mês);
 *  • prazos relativos: "em 45 dias", "no prazo de 60 (sessenta) dias corridos/úteis", "em 3 meses", "dentro de duas semanas";
 *  • só vira PRAZO a data com deixa de prazo antes dela ("até", "prazo", "data limite", "concluído até", "entrega em"…);
 *  • dias úteis: pula sábado, domingo e os feriados nacionais (fixos + Sexta-feira Santa); a contagem exclui o dia de início e
 *    inclui o do vencimento (regra usual dos prazos administrativos).
 */
import { fold, type Span } from "./text";

export type IsoDate = string;

const MONTHS: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};
const MONTH_RE = "janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro";

const pad = (n: number) => String(n).padStart(2, "0");

/** Data válida do calendário → ISO; inválida → null. Ano com 2 dígitos vira 20AA. */
export function isoOf(y: number, m: number, d: number): IsoDate | null {
  const year = y < 100 ? 2000 + y : y;
  if (year < 1900 || year > 2200 || m < 1 || m > 12 || d < 1) return null;
  const dt = new Date(Date.UTC(year, m - 1, d));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${year}-${pad(m)}-${pad(d)}`;
}

export const todayIso = (now: Date): IsoDate => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

const toUtc = (iso: IsoDate) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
const fromUtc = (ms: number): IsoDate => new Date(ms).toISOString().slice(0, 10);

export const addDays = (iso: IsoDate, n: number): IsoDate => fromUtc(toUtc(iso) + n * 86_400_000);
/** Dias corridos de `a` até `b` (b − a). */
export const diffDays = (a: IsoDate, b: IsoDate): number => Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
export const lastDayOfMonth = (y: number, m: number): IsoDate => fromUtc(Date.UTC(y, m, 0));

export function addMonths(iso: IsoDate, n: number): IsoDate {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return fromUtc(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(d, last)));
}

/** Domingo de Páscoa (algoritmo anônimo gregoriano, Meeus/Jones/Butcher). */
export function easter(year: number): IsoDate {
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

/** Feriados nacionais (Lei 662/1949 e alterações; Consciência Negra pela Lei 14.759/2023) + Sexta-feira Santa. */
export function nationalHolidays(year: number): Set<IsoDate> {
  const fixed = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"].map((md) => `${year}-${md}`);
  return new Set([...fixed, addDays(easter(year), -2)]);
}

export function isBusinessDay(iso: IsoDate): boolean {
  const dow = new Date(toUtc(iso)).getUTCDay();
  return dow !== 0 && dow !== 6 && !nationalHolidays(Number(iso.slice(0, 4))).has(iso.slice(0, 10));
}

/** `n` dias úteis depois de `iso` (exclui o dia de início, inclui o do vencimento). */
export function addBusinessDays(iso: IsoDate, n: number): IsoDate {
  let d = iso;
  let left = Math.max(0, Math.round(n));
  while (left > 0) {
    d = addDays(d, 1);
    if (isBusinessDay(d)) left -= 1;
  }
  return d;
}

const UNITS: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9 };
const TEENS: Record<string, number> = { dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19 };
const TENS: Record<string, number> = { vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90 };
const HUNDREDS: Record<string, number> = { cem: 100, cento: 100, duzentos: 200, trezentos: 300, quatrocentos: 400, quinhentos: 500 };

/** Número por extenso até 599 ("sessenta", "quarenta e cinco", "cento e vinte") → número; o resto → null. */
export function parseNumberWords(s: string): number | null {
  const words = fold(s).trim().split(/\s+/).filter((w) => w && w !== "e");
  if (!words.length) return null;
  let total = 0;
  let last = Infinity;
  for (const w of words) {
    const v = HUNDREDS[w] ?? TENS[w] ?? TEENS[w] ?? UNITS[w];
    if (v === undefined || v >= last) return null;
    total += v;
    last = v >= 100 ? 100 : v >= 20 ? 10 : 0.5;
  }
  return total;
}

export interface DateMention extends Span { date: IsoDate; precision: "DIA" | "MES" }

/** Datas absolutas no trecho [from, to) do texto. */
export function findDates(text: string, reference?: IsoDate): DateMention[] {
  const f = fold(text);
  const out: DateMention[] = [];
  const taken = (s: number, e: number) => out.some((o) => s < o.end && o.start < e);
  for (const m of f.matchAll(/(?<![\d/.-])(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?![\d/.-]*\d)/g)) {
    const date = isoOf(Number(m[3]), Number(m[2]), Number(m[1]));
    if (date) out.push({ start: m.index, end: m.index + m[0].length, date, precision: "DIA" });
  }
  for (const m of f.matchAll(new RegExp(`\\b(\\d{1,2})(?:º|°|o)?\\s+de\\s+(${MONTH_RE})(?:\\s+de\\s+(\\d{4}))?\\b`, "g"))) {
    const year = m[3] ? Number(m[3]) : reference ? Number(reference.slice(0, 4)) : NaN;
    const date = Number.isFinite(year) ? isoOf(year, MONTHS[m[2]!]!, Number(m[1])) : null;
    if (date && !taken(m.index, m.index + m[0].length)) out.push({ start: m.index, end: m.index + m[0].length, date: m[3] || !reference || date >= reference ? date : (isoOf(year + 1, MONTHS[m[2]!]!, Number(m[1])) ?? date), precision: "DIA" });
  }
  for (const m of f.matchAll(new RegExp(`\\b(${MONTH_RE})(?:\\s+(?:de\\s+)?(\\d{4}))?\\b`, "g"))) {
    if (taken(m.index, m.index + m[0].length)) continue;
    const month = MONTHS[m[1]!]!;
    let year = m[2] ? Number(m[2]) : NaN;
    if (!m[2]) {
      // "até dezembro" sem ano: o próximo dezembro a partir da data de referência
      if (!reference) continue;
      year = Number(reference.slice(0, 4));
      if (lastDayOfMonth(year, month) < reference) year += 1;
    }
    out.push({ start: m.index, end: m.index + m[0].length, date: lastDayOfMonth(year, month), precision: "MES" });
  }
  return out.sort((a, b) => a.start - b.start);
}

export type DeadlineKind = "DATA" | "MES" | "DIAS_CORRIDOS" | "DIAS_UTEIS" | "SEMANAS" | "MESES";
export interface DeadlineMention extends Span { date: IsoDate; kind: DeadlineKind; amount?: number; from?: IsoDate }

/** Deixa de prazo logo antes da data (na mesma oração). */
const DEADLINE_CUE = /(?:\bate\b|\bprazo\b|\blimite\b|\bvencimento\b|\bentreg(?:a|ue|ues|uem|ar)\b|\bconclu[ií]d[oa]s?\b|\bconcluir\b|\bfinalizad[oa]s?\b|\btermino\b|\bdata final\b|\bimpreterivelmente\b|\bdeadline\b|\bvence\b)[^.;\n]{0,48}$/;
const NOT_DEADLINE = /(?:\ba partir de\b|\bdesde\b|\bem vigor\b|\binicio\b[^.;\n]{0,20}$)/;

const RELATIVE = new RegExp(
  // "no prazo de", "prazo de execução de", "o prazo é de", "em até", "dentro de", "no máximo em", "até", "em"
  "(?:\\bprazo\\b[^.;\\n\\d()]{0,40}?\\b(?:de|em)|\\bem ate|\\bdentro de|\\bno maximo em|\\bno maximo|\\bate|\\bem)\\s+" +
    "(\\d{1,4}|(?:[a-z]+(?:\\s+e\\s+[a-z]+){0,2}))\\s*(?:\\([^)]{1,40}\\)\\s*)?" +
    "(dias?|semanas?|mes(?:es)?)(?:\\s+(corridos|uteis))?\\b",
  "g",
);

/** Data de um prazo relativo ("60 dias úteis", "3 meses") contado de `from` — refeita quando a pessoa corrige a data do documento. */
export function relativeDeadline(kind: Exclude<DeadlineKind, "DATA" | "MES">, amount: number, from: IsoDate): IsoDate {
  if (kind === "DIAS_UTEIS") return addBusinessDays(from, amount);
  if (kind === "DIAS_CORRIDOS") return addDays(from, amount);
  if (kind === "SEMANAS") return addDays(from, amount * 7);
  return addMonths(from, amount);
}

/** Prazos (com deixa) do texto: datas absolutas e prazos relativos contados de `reference` (data do documento ou hoje). */
export function findDeadlines(text: string, reference: IsoDate): DeadlineMention[] {
  const f = fold(text);
  const out: DeadlineMention[] = [];
  for (const d of findDates(text, reference)) {
    const lineStart = f.lastIndexOf("\n", d.start - 1) + 1;
    const before = f.slice(Math.max(lineStart, d.start - 64), d.start);
    if (!DEADLINE_CUE.test(before) || NOT_DEADLINE.test(before.slice(-24))) continue;
    out.push({ start: d.start, end: d.end, date: d.date, kind: d.precision === "MES" ? "MES" : "DATA" });
  }
  for (const m of f.matchAll(RELATIVE)) {
    const amount = /^\d+$/.test(m[1]!) ? Number(m[1]) : parseNumberWords(m[1]!);
    if (!amount || amount > 3650) continue;
    const unit = m[2]!;
    const kind = unit.startsWith("dia") ? (m[3] === "uteis" ? "DIAS_UTEIS" : "DIAS_CORRIDOS") : unit.startsWith("semana") ? "SEMANAS" : "MESES";
    const date = relativeDeadline(kind, amount, reference);
    const start = m.index + m[0].search(/\S/);
    if (out.some((o) => start < o.end && o.start < m.index + m[0].length)) continue;
    out.push({ start, end: m.index + m[0].length, date, kind, amount, from: reference });
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Data do documento: "Curitiba, 10 de novembro de 2026", "Data: 10/11/2026" ou "Date: Tue, 10 Nov 2026 …". */
export function findReferenceDate(text: string): ({ date: IsoDate } & Span) | null {
  const f = fold(text);
  const labeled = /^[ \t]*(?:data|date|enviado em|sent)\s*:\s*(.+)$/m.exec(f);
  if (labeled) {
    const valueStart = labeled.index + labeled[0].indexOf(labeled[1]!);
    const inLine = findDates(text.slice(valueStart, valueStart + labeled[1]!.length));
    if (inLine[0]) return { date: inLine[0].date, start: valueStart + inLine[0].start, end: valueStart + inLine[0].end };
    const rfc = parseRfc2822Date(text.slice(valueStart, valueStart + labeled[1]!.length));
    if (rfc) return { date: rfc, start: valueStart, end: valueStart + labeled[1]!.length };
  }
  // "Curitiba, 10 de novembro de 2026" no começo da linha ou à direita do cabeçalho (depois de 2+ espaços)
  const city = new RegExp(`(?:^|[ \\t]{2,})[ \\t]*[a-z][a-z' -]{2,40},\\s*(?:em\\s+)?(\\d{1,2})(?:º|°|o)?\\s+de\\s+(${MONTH_RE})\\s+de\\s+(\\d{4})`, "m").exec(f);
  if (city) {
    const date = isoOf(Number(city[3]), MONTHS[city[2]!]!, Number(city[1]));
    const start = city.index + city[0].search(/\d/);
    if (date) return { date, start, end: city.index + city[0].length };
  }
  return null;
}

const EN_MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
/** "Tue, 10 Nov 2026 14:00:00 -0300" → "2026-11-10" (a data como escrita pelo remetente, sem converter fuso). */
export function parseRfc2822Date(s: string): IsoDate | null {
  const m = /(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?\s+(\d{4})/.exec(s);
  if (!m) return null;
  const month = EN_MONTHS[m[2]!.toLowerCase()] ?? MONTHS[fold(m[2]!)];
  return month ? isoOf(Number(m[3]), month, Number(m[1])) : null;
}
