/**
 * Prévia fantasma no editor 3D (RF74 sobre RF51): a proposta guarda a versão da política e, por sugestão, a revisão do escopo
 * (impressão do conteúdo dos objetos lidos) em que foi calculada. A cada mudança a tela reconcilia: sugestão cuja política mudou,
 * cujo escopo foi alterado ou cujo alvo deixou de existir (ou passou a existir, no caso de uma cópia) é RECUSADA
 * automaticamente, com o motivo (`proposalValidity`). Aceitar vira um comando no histórico do editor (um desfazer por aceite).
 *
 * Modos (D-136), iguais aos do 2D (`aiCapabilities`): MANUAL não sugere; SOB_SOLICITACAO só a pedido; SUGESTOES mostra o
 * fantasma sozinha; ASSISTIDO aplica em lote o que a pessoa revisou, só na seleção, com um desfazer; AGENTE indisponível.
 */
import { evaluateAiAction, proposalValidity, type AiPolicy, type AutonomyDenial } from "@/lib/ai/autonomy";
import type { Scene3D, SceneObject } from "./model";
import { sceneFingerprint, type Op3D, type Suggestion3D } from "./suggest";

export { aiCapabilities, type AiCapabilities } from "@/lib/drawings2d/ghost";

/** O que a viewport desenha: a cópia "depois" e o número da sugestão na lista (rótulo ✦ n). */
export interface GhostRender {
  key: string;
  n: number;
  object: SceneObject;
}

/** APLICANDO não existe aqui: aceitar no 3D é síncrono (um comando no histórico local). */
export type Ghost3DStatus = "PENDENTE" | "ACEITA" | "REJEITADA" | "RECUSADA";

export type Refusal3D =
  | { code: "POLITICA"; from: number; to: number }
  | { code: "REVISAO" }
  | { code: "OBJETO_REMOVIDO" }
  | { code: "LOTE"; by: string };

export interface Ghost3DItem {
  suggestion: Suggestion3D;
  /** revisão do escopo quando a sugestão foi calculada */
  base: number;
  status: Ghost3DStatus;
  reason?: Refusal3D;
}

export interface Ghost3DProposal {
  id: string;
  policyVersion: number;
  /** revisão da cena (contador do editor) no cálculo — exibida */
  baseRevision: number;
  createdAt: number;
  requested: boolean;
  items: Ghost3DItem[];
}

export function createProposal3D(scene: Scene3D, sceneRevision: number, policy: AiPolicy, suggestions: readonly Suggestion3D[], opts: { id: string; now: number; requested: boolean }): Ghost3DProposal {
  return {
    id: opts.id,
    policyVersion: policy.version,
    baseRevision: sceneRevision,
    createdAt: opts.now,
    requested: opts.requested,
    items: suggestions.map((s) => ({ suggestion: s, base: sceneFingerprint(scene, s.dependsOn), status: "PENDENTE" })),
  };
}

export interface Validity3DContext {
  scene: Scene3D;
  policy: AiPolicy;
}

/** Alvos editáveis agora: objeto alterado vale enquanto existe; objeto criado vale enquanto ainda não existe. */
function editableTargets(s: Suggestion3D, scene: Scene3D): Set<string> {
  const ids = new Set(scene.objects.map((o) => o.id));
  const creates = new Set(s.ops.filter((o): o is Extract<Op3D, { op: "add" }> => o.op === "add").map((o) => o.object.id));
  return new Set(s.targetIds.filter((id) => (creates.has(id) ? !ids.has(id) : ids.has(id))));
}

/** Validade de uma sugestão agora (`proposalValidity`: política, revisão do escopo, alvos) + motivo legível. */
export function itemValidity3D(proposal: Ghost3DProposal, item: Ghost3DItem, ctx: Validity3DContext): { ok: true } | { ok: false; reason: Refusal3D; denial: AutonomyDenial } {
  const s = item.suggestion;
  const v = proposalValidity(ctx.policy, { id: s.id, policyVersion: proposal.policyVersion, baseRevision: item.base, targetIds: s.targetIds, reviewedBy: null }, sceneFingerprint(ctx.scene, s.dependsOn), editableTargets(s, ctx.scene));
  if (v.ok) return { ok: true };
  if (v.reason === "PROPOSTA_OBSOLETA_POLITICA") return { ok: false, denial: v.reason, reason: { code: "POLITICA", from: proposal.policyVersion, to: ctx.policy.version } };
  if (v.reason === "PROPOSTA_OBSOLETA_REVISAO") return { ok: false, denial: v.reason, reason: { code: "REVISAO" } };
  return { ok: false, denial: v.reason, reason: { code: "OBJETO_REMOVIDO" } };
}

/** Recusa automática das pendentes que deixaram de valer (estado terminal). Devolve o MESMO objeto quando nada muda. */
export function reconcileProposal3D(proposal: Ghost3DProposal, ctx: Validity3DContext): Ghost3DProposal {
  let changed = false;
  const items = proposal.items.map((item) => {
    if (item.status !== "PENDENTE") return item;
    const v = itemValidity3D(proposal, item, ctx);
    if (v.ok) return item;
    changed = true;
    return { ...item, status: "RECUSADA" as const, reason: v.reason };
  });
  return changed ? { ...proposal, items } : proposal;
}

/** Muda o estado das sugestões indicadas que ainda estão pendentes. */
export function setStatus3D(proposal: Ghost3DProposal, ids: readonly string[], status: Ghost3DStatus, reason?: Refusal3D): Ghost3DProposal {
  const set = new Set(ids);
  return { ...proposal, items: proposal.items.map((i) => (set.has(i.suggestion.id) && i.status === "PENDENTE" ? { ...i, status, ...(reason ? { reason } : {}) } : i)) };
}

export const pendingItems3D = (proposal: Ghost3DProposal | null) => proposal?.items.filter((i) => i.status === "PENDENTE") ?? [];

/**
 * Junta sugestões aceitas num único patch. Sugestão que leu um objeto que outra do MESMO lote altera fica de fora (foi
 * calculada sobre o estado anterior): é recusada com o motivo LOTE — peça de novo.
 */
export function buildBatch3D(items: readonly Ghost3DItem[]): { ops: Op3D[]; itemIds: string[]; skipped: { id: string; by: string }[] } {
  const changedBy = new Map<string, string>();
  const ops: Op3D[] = [];
  const itemIds: string[] = [];
  const skipped: { id: string; by: string }[] = [];
  for (const item of items) {
    const s = item.suggestion;
    const clash = s.dependsOn.find((id) => changedBy.has(id));
    if (clash) {
      skipped.push({ id: s.id, by: changedBy.get(clash)! });
      continue;
    }
    for (const id of s.targetIds) changedBy.set(id, s.id);
    ops.push(...s.ops);
    itemIds.push(s.id);
  }
  return { ops, itemIds, skipped };
}

/**
 * Modo Assistido: aplicar o lote revisado é `APLICAR_ALTERACAO` — exige revisão humana (o clique), seleção e que nada tenha
 * mudado desde o cálculo. O escopo é a seleção: só entram sugestões cujos objetos estão selecionados.
 */
export function assistedBatch3D(proposal: Ghost3DProposal, ctx: Validity3DContext & { selection: ReadonlySet<string>; actorId: string }): { ok: true; items: Ghost3DItem[] } | { ok: false; reason: AutonomyDenial } {
  const inScope = pendingItems3D(proposal).filter((i) => i.suggestion.scopeIds.every((id) => ctx.selection.has(id)) && itemValidity3D(proposal, i, ctx).ok);
  const editableIds = new Set(inScope.flatMap((i) => i.suggestion.targetIds));
  const revision = sceneFingerprint(ctx.scene, inScope.flatMap((i) => i.suggestion.dependsOn));
  const v = evaluateAiAction(ctx.policy, "APLICAR_ALTERACAO", {
    requestedByUser: true,
    editableIds,
    proposal: { id: proposal.id, policyVersion: proposal.policyVersion, baseRevision: revision, targetIds: [...editableIds], reviewedBy: ctx.actorId },
    currentRevision: revision,
  });
  return v.ok ? { ok: true, items: inScope } : { ok: false, reason: v.reason };
}
