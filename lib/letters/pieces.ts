/**
 * Peça do Letters (RF52 mínimo): documento estruturado em blocos com id estável, revisão incrementada a cada comando,
 * histórico de versões e desfazer. Comandos puros: devolvem a peça nova ou um erro; nada muda quando falham.
 * Cada gravação manual muda a revisão-base — propostas da IA calculadas antes passam a ser recusadas
 * (`proposalValidity`, PROPOSTA_OBSOLETA_REVISAO). Política de autonomia por peça (D-136: só o dono troca o modo).
 */
import { changeMode, personalPolicy, type AiPolicy, type AutonomyDenial, type AutonomyMode } from "@/lib/ai/autonomy";
import type { ContributionOrigin } from "@/lib/pieces/authorship";
import { applyChangesToText, type ProposalChange } from "./rewrite";
import type { BlockKind, DocType, IgnoredFinding, IgnoreReason, LetterBlock, TextGenre, TextLanguage } from "./types";

export type VersionOrigin = ContributionOrigin | "MODELO" | "RESTAURACAO";

export interface PieceVersion {
  revision: number;
  at: string;
  origin: VersionOrigin;
  /** chave i18n do resumo (letters.history.*) e variáveis */
  summary: string;
  vars?: Record<string, string | number>;
  /** bloco da edição manual (para juntar digitação contínua numa versão só) */
  blockId?: string;
  blocks: LetterBlock[];
}

export interface LetterPiece {
  id: string;
  title: string;
  docType: DocType;
  genre: TextGenre;
  language: TextLanguage;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  blocks: LetterBlock[];
  nextBlockSeq: number;
  /** versões em ordem crescente de revisão; a última é a atual */
  history: PieceVersion[];
  /** pilha de revisões para desfazer (topo = a anterior à atual) */
  undoStack: number[];
  policy: AiPolicy;
  ignored: IgnoredFinding[];
}

export type PieceError = "BLOCO_INEXISTENTE" | "TRECHO_ALTERADO" | "SEM_ALTERACAO" | "NADA_PARA_DESFAZER" | "VERSAO_INEXISTENTE" | "ULTIMO_BLOCO" | "TITULO_VAZIO";
export type PieceResult = { ok: true; piece: LetterPiece } | { ok: false; error: PieceError };

export const HISTORY_LIMIT = 100;
/** digitação contínua no mesmo bloco dentro desta janela vira uma versão só */
export const COALESCE_MS = 15_000;
export const MAX_BLOCK_CHARS = 20_000;

const ok = (piece: LetterPiece): PieceResult => ({ ok: true, piece });
const fail = (error: PieceError): PieceResult => ({ ok: false, error });

function commit(p: LetterPiece, blocks: LetterBlock[], now: Date, v: Omit<PieceVersion, "revision" | "at" | "blocks">, extra: Partial<LetterPiece> = {}): LetterPiece {
  const revision = p.revision + 1;
  const at = now.toISOString();
  const last = p.history[p.history.length - 1];
  const coalesce = v.origin === "MANUAL" && v.summary === "edit" && last && last.origin === "MANUAL" && last.summary === "edit" && last.blockId === v.blockId && now.getTime() - Date.parse(last.at) < COALESCE_MS;
  const version: PieceVersion = { ...v, revision, at, blocks };
  const history = coalesce ? [...p.history.slice(0, -1), version] : [...p.history, version].slice(-HISTORY_LIMIT);
  // a revisão anterior entra na pilha de desfazer (na digitação contínua, a pilha já aponta para antes dela)
  const undoStack = coalesce ? p.undoStack : [...p.undoStack, p.revision].filter((r) => history.some((h) => h.revision === r));
  return { ...p, ...extra, blocks, revision, updatedAt: at, history, undoStack };
}

/* ── Criação ─────────────────────────────────────────────────────────────────────────────────────────────── */

export interface NewPieceInput {
  id: string;
  title: string;
  docType: DocType;
  genre?: TextGenre;
  ownerId: string;
  now: Date;
  blocks: Omit<LetterBlock, "id">[];
  /** modo padrão da pessoa (preferência); AGENTE exige mandato e cai para ASSISTIDO */
  mode: AutonomyMode;
}

export const defaultGenre = (docType: DocType): TextGenre => (docType === "LIVRE" ? "ACADEMICO" : "TECNICO");

export function createPiece(input: NewPieceInput): LetterPiece {
  const blocks = input.blocks.map((b, i) => ({ ...b, id: `b${i + 1}` }));
  const at = input.now.toISOString();
  const mode: AutonomyMode = input.mode === "AGENTE" ? "ASSISTIDO" : input.mode;
  return {
    id: input.id,
    title: input.title.trim() || "—",
    docType: input.docType,
    genre: input.genre ?? defaultGenre(input.docType),
    language: "pt-BR",
    ownerId: input.ownerId,
    createdAt: at,
    updatedAt: at,
    revision: 1,
    blocks,
    nextBlockSeq: blocks.length + 1,
    history: [{ revision: 1, at, origin: "MODELO", summary: "created", vars: { docType: input.docType }, blocks }],
    undoStack: [],
    policy: { ...personalPolicy(mode), changedBy: input.ownerId, changedAt: at },
    ignored: [],
  };
}

/* ── Comandos de bloco (letters.bloco.*) ─────────────────────────────────────────────────────────────────── */

export function editBlockText(p: LetterPiece, blockId: string, text: string, now: Date): PieceResult {
  const b = p.blocks.find((x) => x.id === blockId);
  if (!b) return fail("BLOCO_INEXISTENTE");
  const clipped = text.slice(0, MAX_BLOCK_CHARS);
  if (clipped === b.text) return fail("SEM_ALTERACAO");
  const blocks = p.blocks.map((x) => (x.id === blockId ? { ...x, text: clipped } : x));
  return ok(commit(p, blocks, now, { origin: "MANUAL", summary: "edit", blockId }));
}

export function insertBlock(p: LetterPiece, afterId: string | null, kind: BlockKind, now: Date): PieceResult & { blockId?: string } {
  const id = `b${p.nextBlockSeq}`;
  const block: LetterBlock = { id, kind, text: "", ...(kind === "TITULO" ? { level: 2 as const } : {}) };
  const idx = afterId === null ? -1 : p.blocks.findIndex((x) => x.id === afterId);
  if (afterId !== null && idx < 0) return fail("BLOCO_INEXISTENTE");
  const blocks = [...p.blocks.slice(0, idx + 1), block, ...p.blocks.slice(idx + 1)];
  return { ...ok(commit(p, blocks, now, { origin: "MANUAL", summary: "insert", vars: { kind } }, { nextBlockSeq: p.nextBlockSeq + 1 })), blockId: id };
}

export function removeBlock(p: LetterPiece, blockId: string, now: Date): PieceResult {
  if (!p.blocks.some((x) => x.id === blockId)) return fail("BLOCO_INEXISTENTE");
  if (p.blocks.length <= 1) return fail("ULTIMO_BLOCO");
  const removed = p.blocks.find((x) => x.id === blockId)!;
  return ok(commit(p, p.blocks.filter((x) => x.id !== blockId), now, { origin: "MANUAL", summary: "remove", vars: { kind: removed.kind } }));
}

export function moveBlock(p: LetterPiece, blockId: string, dir: -1 | 1, now: Date): PieceResult {
  const i = p.blocks.findIndex((x) => x.id === blockId);
  if (i < 0) return fail("BLOCO_INEXISTENTE");
  const j = i + dir;
  if (j < 0 || j >= p.blocks.length) return fail("SEM_ALTERACAO");
  const blocks = [...p.blocks];
  [blocks[i], blocks[j]] = [blocks[j]!, blocks[i]!];
  return ok(commit(p, blocks, now, { origin: "MANUAL", summary: "move", vars: { kind: blocks[j]!.kind } }));
}

export function setBlockKind(p: LetterPiece, blockId: string, kind: BlockKind, now: Date): PieceResult {
  const b = p.blocks.find((x) => x.id === blockId);
  if (!b) return fail("BLOCO_INEXISTENTE");
  if (b.kind === kind) return fail("SEM_ALTERACAO");
  const blocks = p.blocks.map((x) => (x.id === blockId ? { ...x, kind, level: kind === "TITULO" ? (x.level ?? 2) : undefined } : x));
  return ok(commit(p, blocks, now, { origin: "MANUAL", summary: "kind", vars: { kind } }));
}

/** Insere título + parágrafo de uma seção ausente (achado SECAO_AUSENTE) antes da primeira seção que deve vir depois. */
export function insertSection(p: LetterPiece, heading: string, beforeBlockId: string | null, now: Date): PieceResult {
  const title: LetterBlock = { id: `b${p.nextBlockSeq}`, kind: "TITULO", level: 2, text: heading };
  const para: LetterBlock = { id: `b${p.nextBlockSeq + 1}`, kind: heading.toLowerCase().startsWith("refer") ? "REFERENCIAS" : "PARAGRAFO", text: "" };
  const idx = beforeBlockId ? p.blocks.findIndex((x) => x.id === beforeBlockId) : -1;
  const at = idx < 0 ? p.blocks.length : idx;
  const blocks = [...p.blocks.slice(0, at), title, para, ...p.blocks.slice(at)];
  return ok(commit(p, blocks, now, { origin: "MANUAL", summary: "section", vars: { heading } }, { nextBlockSeq: p.nextBlockSeq + 2 }));
}

/**
 * Aplica trocas exatas (correções do copiloto). Atômico: se algum trecho não confere com o texto atual, nada muda
 * (TRECHO_ALTERADO). A versão registra a origem (MANUAL ou AI_PROPOSAL_ACCEPTED).
 */
export function applyChanges(p: LetterPiece, changes: readonly ProposalChange[], origin: VersionOrigin, now: Date, vars: Record<string, string | number> = {}): PieceResult {
  if (!changes.length) return fail("SEM_ALTERACAO");
  for (const c of changes) {
    const b = p.blocks.find((x) => x.id === c.blockId);
    if (!b) return fail("BLOCO_INEXISTENTE");
    if (b.text.slice(c.start, c.end) !== c.before) return fail("TRECHO_ALTERADO");
  }
  const blocks = p.blocks.map((b) => {
    const own = changes.filter((c) => c.blockId === b.id);
    return own.length ? { ...b, text: applyChangesToText(b.text, own) } : b;
  });
  return ok(commit(p, blocks, now, { origin, summary: origin === "MANUAL" ? "fix" : "ai", vars: { count: changes.length, ...vars } }));
}

/* ── Histórico (letters.historico.desfazer) ──────────────────────────────────────────────────────────────── */

/** Desfaz a última alteração: volta ao conteúdo da revisão anterior numa revisão NOVA (as propostas antigas caem). */
export function undo(p: LetterPiece, now: Date): PieceResult {
  const stack = [...p.undoStack];
  let target: PieceVersion | undefined;
  while (stack.length && !target) {
    const rev = stack.pop();
    target = p.history.find((h) => h.revision === rev);
  }
  if (!target) return fail("NADA_PARA_DESFAZER");
  const next = commit(p, target.blocks, now, { origin: "RESTAURACAO", summary: "undo", vars: { revision: target.revision } });
  return ok({ ...next, undoStack: stack });
}

export function restoreVersion(p: LetterPiece, revision: number, now: Date): PieceResult {
  const v = p.history.find((h) => h.revision === revision);
  if (!v) return fail("VERSAO_INEXISTENTE");
  if (revision === p.revision) return fail("SEM_ALTERACAO");
  return ok(commit(p, v.blocks, now, { origin: "RESTAURACAO", summary: "restore", vars: { revision } }));
}

export const canUndo = (p: LetterPiece) => p.undoStack.some((r) => p.history.some((h) => h.revision === r));

/* ── Metadados, autonomia e achados ignorados ────────────────────────────────────────────────────────────── */

export function rename(p: LetterPiece, title: string, now: Date): PieceResult {
  if (!title.trim()) return fail("TITULO_VAZIO");
  return ok({ ...p, title: title.trim(), updatedAt: now.toISOString() });
}

export const setGenre = (p: LetterPiece, genre: TextGenre): LetterPiece => ({ ...p, genre });
export const setLanguage = (p: LetterPiece, language: TextLanguage): LetterPiece => ({ ...p, language });

/** Troca o modo de autonomia da peça (só o dono; AGENTE sem mandato é recusado com SEM_MANDATO). */
export function changePieceMode(p: LetterPiece, actor: string, to: AutonomyMode, now: Date): { ok: true; piece: LetterPiece } | { ok: false; reason: AutonomyDenial } {
  const r = changeMode(p.policy, [{ userId: p.ownerId, role: "PROPRIETARIO" }], actor, to, now, null);
  if (!r.ok) return r;
  return { ok: true, piece: { ...p, policy: r.policy } };
}

export function ignoreFinding(p: LetterPiece, f: { key: string; ruleId: string; excerpt: string }, reason: IgnoreReason, now: Date, note?: string): LetterPiece {
  const entry: IgnoredFinding = { key: f.key, ruleId: f.ruleId, excerpt: f.excerpt, reason, note: note?.trim() || undefined, at: now.toISOString() };
  return { ...p, ignored: [...p.ignored.filter((x) => x.key !== f.key), entry] };
}

export const reopenFinding = (p: LetterPiece, key: string): LetterPiece => ({ ...p, ignored: p.ignored.filter((x) => x.key !== key) });

/** Numeração dos parágrafos (RF52.CA03): títulos e referências não recebem número. */
export function paragraphNumbers(blocks: readonly LetterBlock[]): Map<string, number> {
  const out = new Map<string, number>();
  let n = 0;
  for (const b of blocks) if (b.kind === "PARAGRAFO" || b.kind === "LISTA" || b.kind === "CITACAO") out.set(b.id, ++n);
  return out;
}
