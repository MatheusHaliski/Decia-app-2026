/**
 * Transcrição de reunião → falas (RF37.CA01/CA02). Entradas aceitas: texto colado ou .txt ("Nome: fala", com ou sem horário),
 * legendas WebVTT (.vtt, inclusive as do Teams com `<v Nome>`) e SubRip (.srt). Tudo roda no navegador: nem o arquivo nem o
 * áudio saem da aba. O arquivo é conferido pelo CONTEÚDO (cabeçalho WEBVTT, blocos de tempo do SRT, nada binário), não só
 * pela extensão, e tem limite de tamanho.
 */

export interface Segment { speaker: string | null; text: string; line: number; startMs: number | null }
export type TranscriptFormat = "VTT" | "SRT" | "TEXTO";
export interface ParsedTranscript { format: TranscriptFormat; segments: Segment[] }

export const ACCEPTED_EXTENSIONS = [".txt", ".vtt", ".srt"] as const;
export const MAX_TRANSCRIPT_BYTES = 1_000_000;
export const MAX_TRANSCRIPT_CHARS = 200_000;

export type FileProblem = "EXTENSAO_NAO_ACEITA" | "ARQUIVO_GRANDE" | "ARQUIVO_VAZIO" | "ARQUIVO_BINARIO" | "VTT_SEM_CABECALHO" | "SRT_INVALIDO";

const extOf = (name: string) => (/\.[^.]+$/.exec(name.toLowerCase())?.[0] ?? "");
const TIMING = /(\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3}\s*-->\s*(\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3}/;

export function checkTranscriptFile(name: string, size: number, text: string): FileProblem | null {
  const ext = extOf(name);
  if (!(ACCEPTED_EXTENSIONS as readonly string[]).includes(ext)) return "EXTENSAO_NAO_ACEITA";
  if (size > MAX_TRANSCRIPT_BYTES) return "ARQUIVO_GRANDE";
  if (!text.trim()) return "ARQUIVO_VAZIO";
  // byte nulo e controles C0 denunciam arquivo binário renomeado (.pdf/.png com extensão .txt)
  if (/[\u0000-\u0008\u000E-\u001F]/.test(text.slice(0, 4096))) return "ARQUIVO_BINARIO";
  if (ext === ".vtt" && !/^﻿?WEBVTT/.test(text.trimStart())) return "VTT_SEM_CABECALHO";
  if (ext === ".srt" && !TIMING.test(text)) return "SRT_INVALIDO";
  return null;
}

/* ── Quem fala ───────────────────────────────────────────────────────────────────────────────────────────── */

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
/** Rótulos que parecem "Nome:" mas são campos da ata, não pessoas. */
const NOT_SPEAKERS = new Set([
  "pauta", "pauta do dia", "decisao", "decisoes", "deliberacao", "encaminhamento", "encaminhamentos", "acao", "acoes", "tarefa", "tarefas", "prazo",
  "responsavel", "responsaveis", "obs", "observacao", "observacoes", "nota", "notas", "ata", "reuniao", "local", "data", "hora", "horario",
  "participantes", "presentes", "ausentes", "convidados", "assunto", "tema", "item", "ponto", "resumo", "pendencia", "pendencias", "secretario",
  "secretaria", "coordenacao", "inicio", "fim", "link", "anexo", "anexos", "fonte", "importante", "atencao", "conclusao", "proximos passos",
]);

const TS_PREFIX = /^\s*[[(]?\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?[\])]?\s*[-–—]?\s*/;
const BULLET = /^\s*(?:[-•*>]+|>>)\s*/;
const SPEAKER_LINE = /^(@?[\p{L}][\p{L}\p{N}.'’\- ]{0,48}?)\s*(?:\(\s*\d{1,2}:\d{2}(?::\d{2})?\s*\))?\s*[:：]\s*(.*)$/u;

/** O rótulo é de uma pessoa? @menção, nome conhecido, ou palavras com inicial maiúscula (até 5) fora da lista de campos. */
export function isSpeakerLabel(label: string, knownNames: readonly string[] = []): boolean {
  const l = label.trim();
  if (!l) return false;
  if (l.startsWith("@")) return /^@[\p{L}\p{N}._-]{2,40}$/u.test(l);
  const f = fold(l);
  if (NOT_SPEAKERS.has(f)) return false;
  if (knownNames.some((n) => fold(n) === f || fold(n).split(/\s+/)[0] === f)) return true;
  const words = l.split(/\s+/);
  if (words.length > 5) return false;
  const connectors = new Set(["da", "de", "do", "das", "dos", "e"]);
  return words.every((w) => connectors.has(w.toLowerCase()) || /^\p{Lu}[\p{L}.'’-]*$/u.test(w));
}

function splitSpeaker(line: string, knownNames: readonly string[]): { speaker: string; text: string } | null {
  const m = SPEAKER_LINE.exec(line);
  if (!m || !isSpeakerLabel(m[1]!, knownNames)) return null;
  return { speaker: m[1]!.trim(), text: m[2]!.trim() };
}

/** Linha que é só o cabeçalho de um bloco de fala: "Ana Exemplo  10:05" ou um nome conhecido sozinho. */
function headerSpeaker(line: string, knownNames: readonly string[]): string | null {
  const m = /^(\p{Lu}[\p{L}.'’-]*(?:\s+(?:d[aeo]s?\s+)?\p{Lu}[\p{L}.'’-]*){0,3})\s+[[(]?\d{1,2}:\d{2}(?::\d{2})?[\])]?$/u.exec(line);
  if (m && isSpeakerLabel(m[1]!, knownNames)) return m[1]!.trim();
  const f = fold(line);
  return knownNames.find((n) => fold(n) === f) ?? null;
}

/* ── Formatos ────────────────────────────────────────────────────────────────────────────────────────────── */

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&nbsp;": " ", "&quot;": '"', "&#39;": "'" };
const stripTags = (s: string) => s.replace(/<[^>]*>/g, "").replace(/&(amp|lt|gt|nbsp|quot|#39);/g, (e) => ENTITIES[e] ?? e);

function timeToMs(s: string): number | null {
  const m = /(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/.exec(s);
  if (!m) return null;
  return ((Number(m[1] ?? 0) * 60 + Number(m[2])) * 60 + Number(m[3])) * 1000 + Number(m[4]!.padEnd(3, "0"));
}

function mergeSameSpeaker(segments: Segment[]): Segment[] {
  const out: Segment[] = [];
  for (const s of segments) {
    const last = out.at(-1);
    if (last && s.speaker && last.speaker === s.speaker) last.text = `${last.text} ${s.text}`.trim();
    else out.push({ ...s });
  }
  return out.filter((s) => s.text.trim());
}

function parseCues(text: string, knownNames: readonly string[], vtt: boolean): Segment[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const segments: Segment[] = [];
  let i = 0;
  while (i < lines.length) {
    while (i < lines.length && !lines[i]!.trim()) i++;
    const start = i;
    const block: string[] = [];
    while (i < lines.length && lines[i]!.trim()) block.push(lines[i++]!);
    if (!block.length) break;
    const head = block[0]!.trim();
    if (vtt && (/^﻿?WEBVTT/.test(head) || /^(NOTE|STYLE|REGION)\b/.test(head))) continue;
    const t = block.findIndex((l) => l.includes("-->"));
    if (t < 0) continue;
    const payload = block.slice(t + 1).map((l) => l.trim()).filter(Boolean).join(" ");
    if (!payload) continue;
    const voice = /<v(?:\.[^\s>]+)*\s+([^>]+)>/.exec(payload);
    let speaker: string | null = voice ? voice[1]!.trim() : null;
    let body = stripTags(payload).trim();
    if (!speaker) {
      const sp = splitSpeaker(body.replace(/^(?:-|>>|\[)\s*/, "").replace(/^([^\]]{1,48})\]\s*/, "$1: "), knownNames);
      if (sp) {
        speaker = sp.speaker;
        body = sp.text;
      }
    }
    segments.push({ speaker, text: body, line: start + t + 2, startMs: timeToMs(block[t]!) });
  }
  return mergeSameSpeaker(segments);
}

function parseText(text: string, knownNames: readonly string[]): Segment[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const segments: Segment[] = [];
  let current: Segment | null = null;
  let blank = false;
  lines.forEach((rawLine, idx) => {
    const line = rawLine.replace(TS_PREFIX, "").replace(BULLET, "").trim();
    if (!line) {
      blank = true;
      return;
    }
    const header = headerSpeaker(line, knownNames);
    if (header) {
      current = { speaker: header, text: "", line: idx + 1, startMs: null };
      segments.push(current);
      blank = false;
      return;
    }
    const sp = splitSpeaker(line, knownNames);
    const field = /^([\p{L} ]{2,30}?)\s*[:：]/u.exec(line);
    if (sp) {
      current = { speaker: sp.speaker, text: sp.text, line: idx + 1, startMs: null };
      segments.push(current);
    } else if (field && NOT_SPEAKERS.has(fold(field[1]!))) {
      // "Pauta: …", "Decisão: …", "Encaminhamento: …" são campos da ata: sempre um trecho próprio, sem falante
      current = { speaker: null, text: line, line: idx + 1, startMs: null };
      segments.push(current);
    } else if (current && current.speaker && (!blank || !current.text)) {
      current.text = `${current.text} ${line}`.trim();
    } else {
      current = { speaker: null, text: line, line: idx + 1, startMs: null };
      segments.push(current);
    }
    blank = false;
  });
  return segments.filter((s) => s.text.trim());
}

export function detectFormat(text: string, fileName?: string | null): TranscriptFormat {
  const ext = fileName ? extOf(fileName) : "";
  if (ext === ".vtt" || /^﻿?WEBVTT/.test(text.trimStart())) return "VTT";
  if (ext === ".srt" || /^\s*\d+\s*\r?\n\s*\d{1,2}:\d{2}:\d{2},\d{3}\s*-->/.test(text)) return "SRT";
  return "TEXTO";
}

export function parseTranscript(raw: string, fileName?: string | null, knownNames: readonly string[] = []): ParsedTranscript {
  const text = raw.slice(0, MAX_TRANSCRIPT_CHARS).normalize("NFC");
  const format = detectFormat(text, fileName);
  const segments = format === "TEXTO" ? parseText(text, knownNames) : parseCues(text, knownNames, format === "VTT");
  return { format, segments };
}

/** Frases de uma fala (ponto final, exclamação, interrogação e ponto e vírgula), sem quebrar "Sr.", "Dra.", "art." etc. */
const ABBREV = new Set(["sr", "sra", "srta", "dr", "dra", "prof", "profa", "art", "inc", "n", "no", "nº", "pag", "p", "eng", "av", "etc", "ex", "obs"]);
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c !== "." && c !== "!" && c !== "?" && c !== ";") continue;
    if (!/\s/.test(text[i + 1] ?? " ")) continue;
    if (c === ".") {
      const word = /([\p{L}º]+)$/u.exec(text.slice(start, i))?.[1]?.toLowerCase();
      if (word && ABBREV.has(word)) continue;
    }
    const piece = text.slice(start, i + 1).trim();
    if (piece) out.push(piece);
    start = i + 1;
  }
  const tail = text.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}
