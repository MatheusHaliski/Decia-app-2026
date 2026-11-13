/**
 * Prazos em português (RF37: encaminhamento com PRAZO) — datas de calendário "AAAA-MM-DD", sem fuso, calculadas a partir da
 * DATA-BASE da reunião (nunca do relógio de quem lê). Entende:
 *  - absolutas: "até 20/11", "20/11/2026", "dia 20", "até o dia 5", "20 de novembro (de 2026)", "1º de dez.";
 *  - relativas: "hoje", "amanhã", "depois de amanhã", "até sexta(-feira)", "na próxima terça", "em 5 dias", "em 5 dias úteis",
 *    "dentro de duas semanas", "em 1 mês", "até o fim da semana/do mês/do ano", "até a semana que vem".
 * Regras (escritas para a pessoa revisar, a data é sempre editável): dia da semana = a primeira ocorrência DEPOIS da data-base
 * ("próxima"/"que vem" não pulam uma semana); dia/mês sem ano usa o ano da data-base e passa para o ano seguinte se ficar mais
 * de 31 dias no passado; "dias úteis" pulam sábados, domingos, feriados nacionais fixos e a Sexta-feira Santa (feriados
 * estaduais e municipais não entram); "semana que vem" = sexta-feira da semana seguinte; "fim da semana" = sexta-feira.
 */
import type { DateOnly, DueDate } from "./types";

export interface Ymd { y: number; m: number; d: number }

const DAY_MS = 86_400_000;
const pad = (n: number, w = 2) => String(n).padStart(w, "0");
export const toDateOnly = ({ y, m, d }: Ymd): DateOnly => `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
export const isValidYmd = ({ y, m, d }: Ymd) => Number.isInteger(y) && y >= 1900 && y <= 2999 && m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);

export function parseDateOnly(s: string | null | undefined): Ymd | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  if (!m) return null;
  const v = { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
  return isValidYmd(v) ? v : null;
}

const toUtc = (x: Ymd) => Date.UTC(x.y, x.m - 1, x.d);
const fromUtc = (t: number): Ymd => {
  const dt = new Date(t);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
};
export const addDays = (x: Ymd, n: number): Ymd => fromUtc(toUtc(x) + n * DAY_MS);
export const diffDays = (a: Ymd, b: Ymd) => Math.round((toUtc(a) - toUtc(b)) / DAY_MS);
/** 0 = domingo … 6 = sábado */
export const weekday = (x: Ymd) => new Date(toUtc(x)).getUTCDay();
export function addMonths(x: Ymd, n: number): Ymd {
  const total = x.y * 12 + (x.m - 1) + n;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return { y, m, d: Math.min(x.d, daysInMonth(y, m)) };
}

/** Domingo de Páscoa (algoritmo anônimo gregoriano / Meeus–Jones–Butcher). */
export function easter(y: number): Ymd {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { y, m: month, d: day };
}

/** Feriados nacionais: fixos (Lei 662/1949, 6.802/1980, 14.759/2023) + Sexta-feira Santa. */
export function nationalHolidays(y: number): Set<DateOnly> {
  const fixed: [number, number][] = [[1, 1], [4, 21], [5, 1], [9, 7], [10, 12], [11, 2], [11, 15], [12, 25]];
  if (y >= 2024) fixed.push([11, 20]);
  const out = new Set(fixed.map(([m, d]) => toDateOnly({ y, m, d })));
  out.add(toDateOnly(addDays(easter(y), -2)));
  return out;
}

export const isBusinessDay = (x: Ymd) => {
  const w = weekday(x);
  return w !== 0 && w !== 6 && !nationalHolidays(x.y).has(toDateOnly(x));
};

export function addBusinessDays(x: Ymd, n: number): Ymd {
  let cur = x;
  let left = Math.max(0, Math.trunc(n));
  while (left > 0) {
    cur = addDays(cur, 1);
    if (isBusinessDay(cur)) left--;
  }
  return cur;
}

/** Data de hoje no fuso de quem usa (componentes locais, não UTC). */
export const todayLocal = (now: Date): DateOnly => toDateOnly({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });

/* ── Busca de prazos no texto ────────────────────────────────────────────────────────────────────────────── */

/** Texto sem acento e em minúsculas, com o mapa de cada posição para a posição no original (para recortar o trecho exato). */
export function foldWithMap(text: string): { folded: string; map: number[] } {
  let folded = "";
  const map: number[] = [];
  for (let i = 0; i < text.length; ) {
    const ch = String.fromCodePoint(text.codePointAt(i)!);
    const f = ch.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    for (const c of f) {
      folded += c;
      map.push(i);
    }
    i += ch.length;
  }
  map.push(text.length);
  return { folded, map };
}

const NUMBER_WORDS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12,
  treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20, trinta: 30,
};
const NUM = `\\d{1,3}|${Object.keys(NUMBER_WORDS).join("|")}`;
const toNumber = (s: string) => (/^\d+$/.test(s) ? Number(s) : NUMBER_WORDS[s] ?? NaN);

const MONTHS: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};
const WEEKDAYS: Record<string, number> = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
/** Depois de "sexta", "quinta"… (que também são ordinais) só aceitamos palavras que não sejam um substantivo ("a sexta reunião"). */
const AFTER_WEEKDAY_OK = new Set(["e", "ou", "que", "pela", "pelo", "de", "a", "as", "ao", "aos", "dia", "para", "pra", "no", "na", "ate", "com", "sem", "se", "mas", "porque", "pois", "o", "os", "agora", "mesmo", "proxima", "proximo", "cedo", "tarde", "antes", "depois", "logo", "entao"]);

interface Candidate { ymd: Ymd; start: number; end: number; kind: DueDate["kind"]; cue: boolean }

const CUE_BEFORE = /\b(ate|prazo|para|limite|vence|vencimento|entregar|entrega)\b[^.;]{0,12}$/;

function resolveDayMonth(d: number, m: number, yRaw: string | undefined, base: Ymd): Ymd | null {
  if (yRaw) {
    const y = yRaw.length === 2 ? 2000 + Number(yRaw) : Number(yRaw);
    const v = { y, m, d };
    return isValidYmd(v) ? v : null;
  }
  const same = { y: base.y, m, d };
  if (!isValidYmd(same)) {
    const next = { y: base.y + 1, m, d };
    return isValidYmd(next) ? next : null;
  }
  return diffDays(same, base) < -31 ? (isValidYmd({ y: base.y + 1, m, d }) ? { y: base.y + 1, m, d } : null) : same;
}

function nextWeekday(base: Ymd, target: number): Ymd {
  const delta = (target - weekday(base) + 7) % 7 || 7;
  return addDays(base, delta);
}
function fridayOfWeek(base: Ymd): Ymd {
  const w = weekday(base);
  if (w === 0 || w === 6) return nextWeekday(base, 5);
  return addDays(base, 5 - w);
}

/** Todos os prazos reconhecidos no texto, na ordem em que aparecem. */
export function findDueDates(text: string, baseDate: DateOnly): Candidate[] {
  const base = parseDateOnly(baseDate);
  if (!base) return [];
  const { folded } = foldWithMap(text);
  const out: Candidate[] = [];
  const push = (ymd: Ymd | null, start: number, end: number, kind: DueDate["kind"], cueInside = false) => {
    if (!ymd || !isValidYmd(ymd)) return;
    if (out.some((c) => start < c.end && end > c.start)) return; // sobreposto a um já reconhecido
    out.push({ ymd, start, end, kind, cue: cueInside || CUE_BEFORE.test(folded.slice(Math.max(0, start - 24), start)) });
  };
  const scan = (re: RegExp, fn: (m: RegExpExecArray) => void) => {
    for (const m of folded.matchAll(re)) fn(m as RegExpExecArray);
  };
  // relativas com número (prefixo obrigatório: "5 dias atrás" não é prazo)
  scan(new RegExp(`\\b(em ate|em|dentro de|daqui a|no prazo de|prazo de|ate|apos)\\s+(${NUM})\\s+(dias?\\s+uteis|dias?|semanas?|mes(?:es)?)\\b`, "g"), (m) => {
    const n = toNumber(m[2]!);
    if (!Number.isFinite(n) || n > 400) return;
    const unit = m[3]!;
    const ymd = unit.includes("uteis") ? addBusinessDays(base, n) : unit.startsWith("dia") ? addDays(base, n) : unit.startsWith("semana") ? addDays(base, 7 * n) : addMonths(base, n);
    push(ymd, m.index!, m.index! + m[0].length, "RELATIVA", true);
  });
  scan(/\bdepois de amanha\b/g, (m) => push(addDays(base, 2), m.index!, m.index! + m[0].length, "RELATIVA"));
  scan(/\bamanha\b/g, (m) => push(addDays(base, 1), m.index!, m.index! + m[0].length, "RELATIVA"));
  scan(/\bhoje\b/g, (m) => push(base, m.index!, m.index! + m[0].length, "RELATIVA"));
  scan(/\b(?:o\s+)?(?:fim|final)\s+(?:da|desta|dessa)\s+semana\b/g, (m) => push(fridayOfWeek(base), m.index!, m.index! + m[0].length, "RELATIVA"));
  scan(/\b(?:o\s+)?(?:fim|final)\s+(?:do|deste|desse)\s+mes\b/g, (m) => push({ y: base.y, m: base.m, d: daysInMonth(base.y, base.m) }, m.index!, m.index! + m[0].length, "RELATIVA"));
  scan(/\b(?:o\s+)?(?:fim|final)\s+(?:do|deste|desse)\s+ano\b/g, (m) => push({ y: base.y, m: 12, d: 31 }, m.index!, m.index! + m[0].length, "RELATIVA"));
  scan(/\b(?:(?:a|na)\s+)?(?:proxima\s+semana|semana\s+que\s+vem)\b/g, (m) => push(addDays(fridayOfWeek(base), weekday(base) === 0 || weekday(base) === 6 ? 0 : 7), m.index!, m.index! + m[0].length, "RELATIVA"));
  // datas por extenso: "20 de novembro (de 2026)", "1º de dez."
  scan(/\b(\d{1,2})(?:º|o)?\s+de\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b\.?(?:\s+de\s+(\d{4}))?/g, (m) => {
    push(resolveDayMonth(Number(m[1]), MONTHS[m[2]!]!, m[3], base), m.index!, m.index! + m[0].length, "ABSOLUTA");
  });
  // numéricas: "20/11", "20/11/2026", "20/11/26"
  scan(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?(?![\d/])/g, (m) => {
    push(resolveDayMonth(Number(m[1]), Number(m[2]), m[3], base), m.index!, m.index! + m[0].length, "ABSOLUTA");
  });
  // "dia 20" sem mês: o próximo dia 20 a partir da data-base
  scan(/\bdia\s+(\d{1,2})\b(?!\s*\/)(?!\s+de\s+[a-z])/g, (m) => {
    const d = Number(m[1]);
    const same = { y: base.y, m: base.m, d };
    const ymd = isValidYmd(same) && d >= base.d ? same : (() => { const n = addMonths({ ...base, d: 1 }, 1); return { ...n, d }; })();
    push(isValidYmd(ymd) ? ymd : null, m.index!, m.index! + m[0].length, "ABSOLUTA");
  });
  // dias da semana
  scan(/\b(?:(?:ate|para|na|no|nesta|neste|esta|este)\s+)?(?:(?:a|o)\s+)?(?:(?:proxima|proximo)\s+)?(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:[-\s]feira)?(?:\s+que\s+vem)?\b/g, (m) => {
    const after = folded.slice(m.index! + m[0].length).match(/^\s+([a-z]+)/)?.[1];
    const hasFeira = /feira/.test(m[0]);
    if (!hasFeira && after && !AFTER_WEEKDAY_OK.has(after)) return; // "a sexta reunião" é ordinal
    push(nextWeekday(base, WEEKDAYS[m[1]!]!), m.index!, m.index! + m[0].length, "RELATIVA", /^(ate|para)\b/.test(m[0]));
  });
  return out.sort((a, b) => a.start - b.start);
}

/**
 * O prazo de uma frase: o primeiro com marca de prazo ("até", "prazo", "para"…); sem marca, uma data relativa ou uma absoluta
 * futura (uma data sem marca e já passada é só uma referência — "a reunião de 12/11").
 */
export function parseDue(text: string, baseDate: DateOnly): DueDate | null {
  const all = findDueDates(text, baseDate);
  const base = parseDateOnly(baseDate);
  if (!base || !all.length) return null;
  const pick = all.find((c) => c.cue) ?? all.find((c) => c.kind === "RELATIVA") ?? all.find((c) => diffDays(c.ymd, base) > 0);
  if (!pick) return null;
  const { map } = foldWithMap(text);
  const raw = text.slice(map[pick.start], map[pick.end]).trim();
  return { date: toDateOnly(pick.ymd), raw, kind: pick.kind };
}
