/**
 * Copiloto do Letters × autonomia da IA (RF51, lib/ai/autonomy — os 5 modos D-136, não os 4 níveis do documento de
 * especificação): o que cada modo libera no painel e a aceitação de propostas, sempre pela decisão única
 * `evaluateAiAction`/`proposalValidity`. Proposta calculada sobre revisão ou política antiga é recusada; o texto atual
 * nunca é sobrescrito com trecho desatualizado (TRECHO_ALTERADO).
 *
 * | Modo            | Análise                   | Correção                                   |
 * |-----------------|---------------------------|--------------------------------------------|
 * | MANUAL          | desligada                 | nenhuma                                    |
 * | SOB_SOLICITACAO | só quando a pessoa pede   | proposta ✦ por achado, aceite explícito    |
 * | SUGESTOES       | automática (com pausa)    | sugestão de um clique (o clique é o aceite)|
 * | ASSISTIDO       | automática (com pausa)    | um clique + lote com prévia e desfazer     |
 * | AGENTE          | indisponível: exige mandato (objetivo, escopo, ferramentas, limites e prazo)            |
 */
import { MODE_CAPABILITIES, evaluateAiAction, proposalValidity, type AiPolicy, type AutonomyDenial, type AutonomyMode } from "@/lib/ai/autonomy";
import { applyChanges, type LetterPiece, type PieceError } from "./pieces";
import { restrictProposal, type RewriteProposal } from "./rewrite";

export interface CopilotCaps {
  mode: AutonomyMode;
  /** o copiloto responde (análise e explicação) */
  enabled: boolean;
  /** analisa sozinho depois de uma pausa na digitação */
  autoAnalyze: boolean;
  /** propõe correção quando a pessoa pede (cartão ✦ com prévia e aceite) */
  proposeOnRequest: boolean;
  /** mostra a correção pronta para um clique */
  oneClick: boolean;
  /** aplica em lote, com prévia antes/depois e desfazer */
  batch: boolean;
}

/** Pausa da análise automática (RF53.CA06: sem reanálise a cada tecla). */
export const AUTO_ANALYZE_DELAY_MS = 700;

export function copilotCaps(policy: AiPolicy): CopilotCaps {
  const asked = { requestedByUser: true };
  const spontaneous = { requestedByUser: false };
  return {
    mode: policy.mode,
    enabled: evaluateAiAction(policy, "RESPONDER", asked).ok,
    autoAnalyze: evaluateAiAction(policy, "SUGESTAO_ESPONTANEA", spontaneous).ok,
    proposeOnRequest: evaluateAiAction(policy, "PROPOR_ALTERACAO", asked).ok,
    oneClick: evaluateAiAction(policy, "PROPOR_ALTERACAO", spontaneous).ok,
    batch: MODE_CAPABILITIES[policy.mode].applies === "APOS_REVISAO",
  };
}

export type AcceptDenial = AutonomyDenial | PieceError | "COPILOTO_DESLIGADO";
export type AcceptResult = { ok: true; piece: LetterPiece } | { ok: false; reason: AcceptDenial };

/**
 * Aceite humano de uma proposta (achado ou bloco): vale só na mesma política e revisão e nos blocos ainda editáveis.
 * Registra a versão com origem AI_PROPOSAL_ACCEPTED (cadeia de autoria, lib/pieces/authorship).
 */
export function acceptProposal(piece: LetterPiece, proposal: RewriteProposal, actor: string, now: Date): AcceptResult {
  if (!copilotCaps(piece.policy).enabled) return { ok: false, reason: "COPILOTO_DESLIGADO" };
  const reviewed = { ...proposal, reviewedBy: actor };
  const editable = new Set(piece.blocks.map((b) => b.id));
  const v = proposalValidity(piece.policy, reviewed, piece.revision, editable);
  if (!v.ok) return { ok: false, reason: v.reason };
  const r = applyChanges(piece, proposal.changes, "AI_PROPOSAL_ACCEPTED", now, { proposal: proposal.id });
  return r.ok ? { ok: true, piece: r.piece } : { ok: false, reason: r.error };
}

/**
 * Lote do modo ASSISTIDO: a pessoa revisou a prévia e escolheu os blocos (`selected`); a IA aplica só neles, na mesma
 * revisão, numa versão única que um "desfazer" reverte inteira (RF51.CA03, RF55.CA04).
 */
export function applyBatch(piece: LetterPiece, proposal: RewriteProposal, selected: ReadonlySet<string>, actor: string, now: Date): AcceptResult {
  const scoped = { ...restrictProposal(proposal, selected), reviewedBy: actor };
  const editable = new Set(piece.blocks.filter((b) => selected.has(b.id)).map((b) => b.id));
  const v = evaluateAiAction(piece.policy, "APLICAR_ALTERACAO", { requestedByUser: true, proposal: scoped, editableIds: editable, currentRevision: piece.revision });
  if (!v.ok) return { ok: false, reason: v.reason };
  const r = applyChanges(piece, scoped.changes, "AI_PROPOSAL_ACCEPTED", now, { proposal: proposal.id, blocks: scoped.targetIds.length });
  return r.ok ? { ok: true, piece: r.piece } : { ok: false, reason: r.error };
}

/** Estado de uma proposta pendente diante da peça atual (para o cartão mostrar "desatualizada"). */
export function proposalState(piece: LetterPiece, proposal: RewriteProposal): { valid: true } | { valid: false; reason: AutonomyDenial } {
  const v = proposalValidity(piece.policy, proposal, piece.revision, new Set(piece.blocks.map((b) => b.id)));
  return v.ok ? { valid: true } : { valid: false, reason: v.reason };
}
