/**
 * Edição colaborativa com reserva (lock) de regiões: se um usuário trava uma região, os demais não a acessam.
 * Funções puras; o servidor é a fonte de verdade e serializa as chamadas por peça. A trava expira (lease) e é
 * renovável apenas pelo dono. Locks por região+camada; qualquer interseção de regiões conflita.
 */
export const LOCK_TTL_MS = 60_000;

export interface RegionLock {
  pieceId: string;
  layerId: string;
  regionIds: readonly string[];
  ownerId: string;
  expiresAt: number;
}

export type LockResult = { ok: true; locks: RegionLock[]; lock: RegionLock } | { ok: false; locks: RegionLock[]; conflictWith: string };

export function activeLocks(locks: readonly RegionLock[], now: number): RegionLock[] {
  return locks.filter((l) => l.expiresAt > now);
}

function overlaps(a: RegionLock, pieceId: string, layerId: string, regionIds: readonly string[]): boolean {
  return a.pieceId === pieceId && a.layerId === layerId && a.regionIds.some((r) => regionIds.includes(r));
}

export function acquireLock(locks: readonly RegionLock[], req: { pieceId: string; layerId: string; regionIds: readonly string[]; ownerId: string }, now: number, ttl = LOCK_TTL_MS): LockResult {
  const live = activeLocks(locks, now);
  if (!req.regionIds.length) throw new Error("Informe ao menos uma região");
  const other = live.find((l) => l.ownerId !== req.ownerId && overlaps(l, req.pieceId, req.layerId, req.regionIds));
  if (other) return { ok: false, locks: live, conflictWith: other.ownerId };
  const lock: RegionLock = { ...req, regionIds: [...new Set(req.regionIds)], expiresAt: now + ttl };
  return { ok: true, lock, locks: [...live, lock] };
}

export function releaseLocks(locks: readonly RegionLock[], pieceId: string, ownerId: string, now: number): RegionLock[] {
  return activeLocks(locks, now).filter((l) => !(l.pieceId === pieceId && l.ownerId === ownerId));
}

/** Verdadeiro se `userId` pode alterar todas as regiões: cada uma precisa estar livre ou travada por ele mesmo. */
export function canEditRegions(locks: readonly RegionLock[], q: { pieceId: string; layerId: string; regionIds: readonly string[]; userId: string }, now: number): boolean {
  if (!q.regionIds.length) return false;
  return !activeLocks(locks, now).some((l) => l.ownerId !== q.userId && overlaps(l, q.pieceId, q.layerId, q.regionIds));
}
