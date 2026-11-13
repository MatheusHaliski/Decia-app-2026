/**
 * Prévia fantasma (RF74 sobre RF51): a proposta da IA guarda a versão da política e, por sugestão, a revisão do escopo em
 * que foi calculada. A cada mudança a tela reconcilia: sugestão cuja política mudou, cujo escopo foi alterado ou cuja
 * região-alvo passou a ser reservada por outra pessoa é RECUSADA automaticamente, com o motivo (`proposalValidity`).
 * Aceitar vira patch de origem IA, sob as mesmas reservas e a mesma porta `authorizePatch` de qualquer edição.
 *
 * Modos (D-136): MANUAL não sugere; SOB_SOLICITACAO só quando a pessoa pede; SUGESTOES mostra o fantasma por conta
 * própria; ASSISTIDO também aplica em lote o que a pessoa revisou, só na seleção, com um desfazer para o lote inteiro;
 * AGENTE exige mandato (objetivo, escopo, ferramentas, limites) e fica indisponível neste editor.
 */
import { evaluateAiAction, proposalValidity, type AiPolicy, type AutonomyDenial } from "@/lib/ai/autonomy";
import { findConflict, type RegionLock } from "@/lib/pieces/collab";
import type { Denial, DrawingPatch, Label, PatchOp, SharedState } from "./engine";
import { layerById, shapeById, type ViewState } from "./model";
import { scopeFingerprint, type Suggestion } from "./suggest";

/** APLICANDO = aceita e em gravação: a reconciliação não a recusa enquanto o próprio aceite muda a revisão. */
export type GhostStatus = "PENDENTE" | "APLICANDO" | "ACEITA" | "REJEITADA" | "RECUSADA";

export type RefusalReason =
  | { code: "POLITICA"; from: number; to: number }
  | { code: "REVISAO" }
  | { code: "REGIAO_RESERVADA"; lock: RegionLock }
  | { code: "CAMADA"; layerId: string }
  | { code: "OBJETO_REMOVIDO" }
  | { code: "LOTE"; by: string }
  | { code: "GRAVACAO"; denial: Denial };

export interface GhostItem {
  suggestion: Suggestion;
  /** revisão do escopo (impressão das revisões lidas) quando a sugestão foi calculada */
  base: number;
  status: GhostStatus;
  reason?: RefusalReason;
}

export interface GhostProposal {
  id: string;
  policyVersion: number;
  /** revisão global da peça no cálculo (exibida) */
  baseRevision: number;
  createdAt: number;
  /** pedida explicitamente (SOB_SOLICITACAO) ou espontânea (SUGESTOES/ASSISTIDO) */
  requested: boolean;
  items: GhostItem[];
}

export interface AiCapabilities {
  /** a IA pode mostrar o fantasma por conta própria */
  spontaneous: boolean;
  /** a pessoa pode pedir sugestões */
  onRequest: boolean;
  /** aplicar em lote revisado (Assistido) */
  batch: boolean;
  /** motivo de indisponibilidade (MANUAL ou AGENTE sem mandato) */
  unavailable: "MANUAL" | "AGENTE" | null;
}

/** O que cada modo permite neste editor, decidido por `evaluateAiAction` (a mesma regra da UI do DECIA e do servidor). */
export function aiCapabilities(policy: AiPolicy): AiCapabilities {
  if (policy.mode === "AGENTE") return { spontaneous: false, onRequest: false, batch: false, unavailable: "AGENTE" };
  const onRequest = evaluateAiAction(policy, "PROPOR_ALTERACAO", { requestedByUser: true }).ok;
  if (!onRequest) return { spontaneous: false, onRequest: false, batch: false, unavailable: "MANUAL" };
  return {
    onRequest,
    spontaneous: evaluateAiAction(policy, "SUGESTAO_ESPONTANEA", { requestedByUser: false }).ok && evaluateAiAction(policy, "PROPOR_ALTERACAO", { requestedByUser: false }).ok,
    batch: policy.mode === "ASSISTIDO",
    unavailable: null,
  };
}

export function createProposal(state: SharedState, policy: AiPolicy, suggestions: readonly Suggestion[], opts: { id: string; now: number; requested: boolean }): GhostProposal {
  return {
    id: opts.id,
    policyVersion: policy.version,
    baseRevision: state.doc.revision,
    createdAt: opts.now,
    requested: opts.requested,
    items: suggestions.map((s) => ({ suggestion: s, base: scopeFingerprint(state.doc, s.dependsOn), status: "PENDENTE" })),
  };
}

export interface ValidityContext {
  state: SharedState;
  policy: AiPolicy;
  view: ViewState;
  actorId: string;
  now: number;
}

/** Alvos editáveis agora pela pessoa: camada visível e destravada, regiões (antes e depois) sem reserva alheia. */
function editableTargets(s: Suggestion, ctx: ValidityContext): { ids: Set<string>; lock?: RegionLock; layerBlocked: boolean } {
  const layer = layerById(ctx.state.doc, s.layerId);
  const layerBlocked = !layer || layer.locked || ctx.view.hiddenLayerIds.includes(s.layerId);
  const lock = findConflict(ctx.state.locks, { pieceId: ctx.state.doc.pieceId, layerId: s.layerId, regionIds: s.regionIds, userId: ctx.actorId }, ctx.now);
  if (layerBlocked || lock) return { ids: new Set(), lock, layerBlocked };
  const creates = new Set(s.ops.filter((o): o is Extract<PatchOp, { op: "add" }> => o.op === "add").map((o) => o.shape.id));
  // alvo novo vale enquanto não existe; alvo existente vale enquanto existe
  const ids = new Set(s.targetIds.filter((id) => (creates.has(id) ? !shapeById(ctx.state.doc, id) : !!shapeById(ctx.state.doc, id))));
  return { ids, layerBlocked };
}

/** Validade de uma sugestão agora: `proposalValidity` (política, revisão do escopo, alvos editáveis) + motivo legível. */
export function itemValidity(proposal: GhostProposal, item: GhostItem, ctx: ValidityContext): { ok: true } | { ok: false; reason: RefusalReason; denial: AutonomyDenial } {
  const s = item.suggestion;
  const editable = editableTargets(s, ctx);
  const v = proposalValidity(ctx.policy, { id: s.id, policyVersion: proposal.policyVersion, baseRevision: item.base, targetIds: s.targetIds, reviewedBy: null }, scopeFingerprint(ctx.state.doc, s.dependsOn), editable.ids);
  if (v.ok) return { ok: true };
  if (v.reason === "PROPOSTA_OBSOLETA_POLITICA") return { ok: false, denial: v.reason, reason: { code: "POLITICA", from: proposal.policyVersion, to: ctx.policy.version } };
  if (v.reason === "PROPOSTA_OBSOLETA_REVISAO") return { ok: false, denial: v.reason, reason: { code: "REVISAO" } };
  if (editable.lock) return { ok: false, denial: v.reason, reason: { code: "REGIAO_RESERVADA", lock: editable.lock } };
  if (editable.layerBlocked) return { ok: false, denial: v.reason, reason: { code: "CAMADA", layerId: s.layerId } };
  return { ok: false, denial: v.reason, reason: { code: "OBJETO_REMOVIDO" } };
}

/**
 * Recusa automática: pendentes que deixaram de valer viram RECUSADA com o motivo daquele momento (estado terminal — a
 * proposta não "ressuscita"; peça de novo). Devolve o MESMO objeto quando nada muda (sem renderização à toa).
 */
export function reconcileProposal(proposal: GhostProposal, ctx: ValidityContext): GhostProposal {
  let changed = false;
  const items = proposal.items.map((item) => {
    if (item.status !== "PENDENTE") return item;
    const v = itemValidity(proposal, item, ctx);
    if (v.ok) return item;
    changed = true;
    return { ...item, status: "RECUSADA" as const, reason: v.reason };
  });
  return changed ? { ...proposal, items } : proposal;
}

/** Muda o estado das sugestões indicadas que estão em `from` (padrão: só as pendentes). */
export function setStatus(proposal: GhostProposal, ids: readonly string[], status: GhostStatus, reason?: RefusalReason, from: readonly GhostStatus[] = ["PENDENTE"]): GhostProposal {
  const set = new Set(ids);
  return { ...proposal, items: proposal.items.map((i) => (set.has(i.suggestion.id) && from.includes(i.status) ? { ...i, status, ...(reason ? { reason } : {}) } : i)) };
}

export const pendingItems = (proposal: GhostProposal | null) => proposal?.items.filter((i) => i.status === "PENDENTE") ?? [];

export interface BatchPart {
  layerId: string;
  ops: PatchOp[];
  regionIds: string[];
  itemIds: string[];
  label: Label;
}

/**
 * Agrupa sugestões aceitas em patches (um por camada — a edição vale na camada da parte). Sugestão que leu um objeto
 * que outra do MESMO lote altera fica de fora (foi calculada sobre o estado anterior): vira obsoleta, peça de novo.
 */
export function buildBatch(items: readonly GhostItem[]): { parts: BatchPart[]; skipped: { id: string; by: string }[] } {
  const changedBy = new Map<string, string>();
  const parts = new Map<string, BatchPart>();
  const skipped: { id: string; by: string }[] = [];
  for (const item of items) {
    const s = item.suggestion;
    const clash = s.dependsOn.find((id) => changedBy.has(id));
    if (clash) {
      skipped.push({ id: s.id, by: changedBy.get(clash)! });
      continue;
    }
    for (const id of s.targetIds) changedBy.set(id, s.id);
    const part = parts.get(s.layerId) ?? { layerId: s.layerId, ops: [], regionIds: [], itemIds: [], label: s.label };
    part.ops.push(...s.ops);
    part.regionIds = [...new Set([...part.regionIds, ...s.regionIds])];
    part.itemIds.push(s.id);
    part.label = part.itemIds.length === 1 ? s.label : { key: "drw2d.op.aiBatch", vars: { count: part.itemIds.length } };
    parts.set(s.layerId, part);
  }
  return { parts: [...parts.values()], skipped };
}

/** Patch de IA de uma parte do lote: origem IA, escopo limitado às regiões da proposta (`aiScopeIsBounded`). */
export function batchPatch(part: BatchPart, opts: { id: string; actorId: string; baseRevision: number; aiMode: "ACEITA" | "APLICADA" }): DrawingPatch {
  return { id: opts.id, actorId: opts.actorId, origin: "IA", aiMode: opts.aiMode, baseRevision: opts.baseRevision, ops: part.ops, label: part.label, scopeRegionIds: part.regionIds };
}

/**
 * Modo Assistido: aplicar o lote revisado é `APLICAR_ALTERACAO` — exige revisão humana, seleção editável e que nada
 * tenha mudado desde o cálculo. O escopo é a seleção: só entram sugestões cujos objetos estão selecionados.
 */
export function assistedBatch(proposal: GhostProposal, ctx: ValidityContext & { selection: ReadonlySet<string> }): { ok: true; items: GhostItem[] } | { ok: false; reason: AutonomyDenial } {
  const inScope = pendingItems(proposal).filter((i) => i.suggestion.scopeIds.every((id) => ctx.selection.has(id)) && itemValidity(proposal, i, ctx).ok);
  const editableIds = new Set(inScope.flatMap((i) => i.suggestion.targetIds));
  const dependsOn = inScope.flatMap((i) => i.suggestion.dependsOn);
  const v = evaluateAiAction(ctx.policy, "APLICAR_ALTERACAO", {
    requestedByUser: true,
    editableIds,
    proposal: { id: proposal.id, policyVersion: proposal.policyVersion, baseRevision: scopeFingerprint(ctx.state.doc, dependsOn), targetIds: [...editableIds], reviewedBy: ctx.actorId },
    currentRevision: scopeFingerprint(ctx.state.doc, dependsOn),
  });
  return v.ok ? { ok: true, items: inScope } : { ok: false, reason: v.reason };
}
