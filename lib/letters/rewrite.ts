/**
 * "IA" simulada do copiloto (✦, D-12): monta propostas de reescrita SÓ com as correções seguras que as regras
 * apontaram — nada de texto novo, número ou citação inventada. Cada proposta é um `AiProposal` (lib/ai/autonomy)
 * ancorado à revisão e à versão da política em que foi calculada; o diff por palavras mostra removido/adicionado.
 */
import type { AiProposal } from "@/lib/ai/autonomy";
import { shortHash } from "./text";
import type { Finding, LetterBlock } from "./types";

export interface ProposalChange {
  blockId: string;
  findingId: string;
  ruleId: string;
  start: number;
  end: number;
  before: string;
  after: string;
}

export type SkipReason = "SEM_CORRECAO_SEGURA" | "SOBREPOSTO" | "TRECHO_DIFERENTE" | "SEM_BLOCO";

export interface RewriteProposal extends AiProposal {
  kind: "ACHADO" | "BLOCO" | "LOTE";
  createdAt: string;
  origin: "HEURISTICA";
  changes: ProposalChange[];
  previews: { blockId: string; before: string; after: string }[];
  skipped: { findingId: string; ruleId: string; reason: SkipReason }[];
}

export interface BuildProposalInput {
  findings: readonly Finding[];
  blocks: readonly LetterBlock[];
  revision: number;
  policyVersion: number;
  kind: RewriteProposal["kind"];
  now: Date;
  /** alternativa escolhida pela pessoa para um achado sem correção segura (findingId → texto) */
  chosen?: Readonly<Record<string, string>>;
}

/** Aplica trocas [start, end) → after em um texto, da direita para a esquerda (posições originais). */
export function applyChangesToText(text: string, changes: readonly { start: number; end: number; after: string }[]): string {
  let out = text;
  for (const c of [...changes].sort((a, b) => b.start - a.start)) out = out.slice(0, c.start) + c.after + out.slice(c.end);
  return out;
}

export function buildProposal(input: BuildProposalInput): RewriteProposal {
  const byId = new Map(input.blocks.map((b) => [b.id, b]));
  const changes: ProposalChange[] = [];
  const skipped: RewriteProposal["skipped"] = [];
  const sorted = [...input.findings].sort((a, b) => (a.blockId ?? "").localeCompare(b.blockId ?? "") || a.start - b.start || a.end - b.end);
  for (const f of sorted) {
    const after = input.chosen?.[f.id] ?? f.replacement;
    if (after === null || after === undefined) { skipped.push({ findingId: f.id, ruleId: f.ruleId, reason: "SEM_CORRECAO_SEGURA" }); continue; }
    const block = f.blockId ? byId.get(f.blockId) : undefined;
    if (!block) { skipped.push({ findingId: f.id, ruleId: f.ruleId, reason: "SEM_BLOCO" }); continue; }
    const before = block.text.slice(f.start, f.end);
    if (before !== f.excerpt) { skipped.push({ findingId: f.id, ruleId: f.ruleId, reason: "TRECHO_DIFERENTE" }); continue; }
    if (changes.some((c) => c.blockId === block.id && f.start < c.end && c.start < f.end)) { skipped.push({ findingId: f.id, ruleId: f.ruleId, reason: "SOBREPOSTO" }); continue; }
    changes.push({ blockId: block.id, findingId: f.id, ruleId: f.ruleId, start: f.start, end: f.end, before, after });
  }
  const targetIds = [...new Set(changes.map((c) => c.blockId))];
  const previews = targetIds.map((id) => {
    const before = byId.get(id)!.text;
    return { blockId: id, before, after: applyChangesToText(before, changes.filter((c) => c.blockId === id)) };
  });
  const id = `prop-${shortHash(`${input.revision}|${input.policyVersion}|${changes.map((c) => `${c.findingId}>${c.after}`).join(";")}`)}`;
  return { id, policyVersion: input.policyVersion, baseRevision: input.revision, targetIds, reviewedBy: null, kind: input.kind, createdAt: input.now.toISOString(), origin: "HEURISTICA", changes, previews, skipped };
}

/** Restringe uma proposta de lote aos blocos escolhidos na prévia (mesma revisão e política). */
export function restrictProposal(p: RewriteProposal, blockIds: ReadonlySet<string>): RewriteProposal {
  const changes = p.changes.filter((c) => blockIds.has(c.blockId));
  return { ...p, changes, targetIds: p.targetIds.filter((id) => blockIds.has(id)), previews: p.previews.filter((x) => blockIds.has(x.blockId)) };
}

/* ── Diff por palavras (removido/adicionado) ─────────────────────────────────────────────────────────────── */

export type DiffPart = { type: "igual" | "removido" | "adicionado"; text: string };

/** Diff de palavras (LCS) preservando espaços; partes vizinhas do mesmo tipo são unidas. */
export function diffWords(before: string, after: string): DiffPart[] {
  const a = before.split(/(\s+)/).filter((x) => x !== "");
  const b = after.split(/(\s+)/).filter((x) => x !== "");
  // corta prefixo e sufixo comuns (textos longos com poucas trocas)
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
  const ma = a.slice(pre, a.length - suf);
  const mb = b.slice(pre, b.length - suf);
  const n = ma.length;
  const m = mb.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) lcs[i]![j] = ma[i] === mb[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
  const middle: DiffPart[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (ma[i] === mb[j]) { middle.push({ type: "igual", text: ma[i]! }); i++; j++; }
    else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) { middle.push({ type: "removido", text: ma[i]! }); i++; }
    else { middle.push({ type: "adicionado", text: mb[j]! }); j++; }
  }
  while (i < n) middle.push({ type: "removido", text: ma[i++]! });
  while (j < m) middle.push({ type: "adicionado", text: mb[j++]! });
  const parts: DiffPart[] = [...a.slice(0, pre).map((t) => ({ type: "igual" as const, text: t })), ...middle, ...a.slice(a.length - suf).map((t) => ({ type: "igual" as const, text: t }))];
  const merged: DiffPart[] = [];
  for (const p of parts) {
    const last = merged[merged.length - 1];
    if (last && last.type === p.type) last.text += p.text;
    else merged.push({ ...p });
  }
  return merged;
}
