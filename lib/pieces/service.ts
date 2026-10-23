/**
 * API de peças (camada de serviço, independente de transporte): repositório em memória + operações de camadas,
 * reserva de regiões, autoria e manifesto de proveniência. Persistência real e rotas HTTP autenticadas ficam a cargo
 * do backend; o chamador informa `actorId` já autenticado. Visitantes só recebem a visão pública de autoria.
 */
import { appendEvent, computeAuthorship, publicAuthorship, verifyChain, type AuthorshipDisplay, type ContributionEvent, type FinalUnit, type NewContributionEvent } from "./authorship";
import { acquireLock, canEditRegions, releaseLocks, type RegionLock } from "./collab";
import { createLayerStack, switchActiveLayer, type LayerStack } from "./layers";
import { authorizePatch, type PatchRequest, type PatchVerdict } from "./patch";
import { buildProvenanceManifest, type ProvenanceManifest } from "./provenance";

export interface WorkPiece {
  id: string;
  ownerId: string;
  title: string;
  revisionId: string;
  stack: LayerStack;
  units: FinalUnit[];
  events: ContributionEvent[];
  locks: RegionLock[];
  authorshipDisplay: AuthorshipDisplay;
}

export class PiecesService {
  private readonly pieces = new Map<string, WorkPiece>();

  constructor(private readonly clock: () => number = Date.now) {}

  create(input: { id: string; ownerId: string; title: string; layers: { id: string; name: string; depth: number }[]; units?: FinalUnit[]; authorshipDisplay?: AuthorshipDisplay }): WorkPiece {
    if (this.pieces.has(input.id)) throw new Error("Peça já existe");
    const piece: WorkPiece = { id: input.id, ownerId: input.ownerId, title: input.title, revisionId: "r1", stack: createLayerStack(input.layers), units: input.units ?? [], events: [], locks: [], authorshipDisplay: input.authorshipDisplay ?? "FULL" };
    this.pieces.set(piece.id, piece);
    return piece;
  }

  get(id: string): WorkPiece {
    const p = this.pieces.get(id);
    if (!p) throw new Error("Peça inexistente");
    return p;
  }

  setActiveLayer(id: string, layerId: string): WorkPiece {
    const p = this.get(id);
    p.stack = switchActiveLayer(p.stack, layerId);
    return p;
  }

  lockRegions(id: string, actorId: string, layerId: string, regionIds: readonly string[]) {
    const p = this.get(id);
    const r = acquireLock(p.locks, { pieceId: id, layerId, regionIds, ownerId: actorId }, this.clock());
    p.locks = r.locks;
    return r.ok ? { ok: true as const, lock: r.lock } : { ok: false as const, conflictWith: r.conflictWith };
  }

  unlock(id: string, actorId: string): void {
    const p = this.get(id);
    p.locks = releaseLocks(p.locks, id, actorId, this.clock());
  }

  canEdit(id: string, actorId: string, layerId: string, regionIds: readonly string[]): boolean {
    const p = this.get(id);
    return canEditRegions(p.locks, { pieceId: id, layerId, regionIds, userId: actorId }, this.clock());
  }

  /** Autoriza um patch manual ou de IA contra camada ativa, seleção e reservas (mesma regra para os dois). */
  authorizePatch(id: string, req: Omit<PatchRequest, "pieceId">): PatchVerdict {
    const p = this.get(id);
    return authorizePatch(p.stack, p.locks, { ...req, pieceId: id }, this.clock());
  }

  async recordEvent(id: string, e: Omit<NewContributionEvent, "pieceId" | "revisionId" | "acceptedAt">): Promise<ContributionEvent[]> {
    const p = this.get(id);
    p.events = await appendEvent(p.events, { ...e, pieceId: id, revisionId: p.revisionId, acceptedAt: new Date(this.clock()).toISOString() });
    return p.events;
  }

  /** Visão pública: nunca inclui logs, prompts ou modelo. */
  publicAuthorship(id: string) {
    const p = this.get(id);
    return publicAuthorship(computeAuthorship({ finalUnits: p.units, events: p.events }), p.authorshipDisplay);
  }

  async manifest(id: string): Promise<ProvenanceManifest> {
    const p = this.get(id);
    if ((await verifyChain(p.events)) !== -1) throw new Error("Cadeia de eventos corrompida");
    return buildProvenanceManifest({ pieceId: id, revisionId: p.revisionId, title: p.title, authorship: computeAuthorship({ finalUnits: p.units, events: p.events }), eventChainHead: p.events.at(-1)?.hash ?? null, createdAt: new Date(this.clock()).toISOString() });
  }
}
