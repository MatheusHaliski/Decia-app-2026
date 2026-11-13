/**
 * Edição colaborativa com reserva (lock) de regiões: se um usuário trava uma região, os demais não a acessam.
 * Funções puras; o servidor é a fonte de verdade e serializa as chamadas por peça. A trava expira (lease) e é
 * renovável apenas pelo dono. Locks por região+camada; qualquer interseção de regiões conflita.
 */
export const LOCK_TTL_MS = 60_000;
/** Teto do prazo de uma reserva: prazo infinito ou enorme travaria a região para sempre (auditoria 31/10/2026). */
export const MAX_LOCK_TTL_MS = 10 * 60_000;

/**
 * Reserva de TODAS as camadas (DRAWINGS_CAMADAS_COLABORACAO_DECIA §Fluxo 4): conflita com qualquer camada sobreposta.
 * Locks com outro `layerId` continuam se comparando só pela igualdade de camada.
 */
export const ALL_LAYERS = "*";

export interface RegionLock {
  pieceId: string;
  layerId: string;
  regionIds: readonly string[];
  ownerId: string;
  expiresAt: number;
  /** id da reserva (lease) — opcional, para renovar/liberar uma reserva específica */
  id?: string;
  /** token de fencing monotônico por peça (RF66.CA03): renovar/liberar exige o token vigente */
  token?: number;
}

export type LockResult = { ok: true; locks: RegionLock[]; lock: RegionLock } | { ok: false; locks: RegionLock[]; conflictWith: string };

export function activeLocks(locks: readonly RegionLock[], now: number): RegionLock[] {
  return locks.filter((l) => l.expiresAt > now);
}

const layersOverlap = (a: string, b: string) => a === b || a === ALL_LAYERS || b === ALL_LAYERS;

/**
 * Regiões são hierárquicas por "/" ("A" contém "A/1", que contém "A/1/b"): reservar a mãe conflita com qualquer filha e vice-versa.
 * Só a hierarquia conta — "A1" e "A10" são regiões distintas.
 */
export function regionsOverlap(a: string, b: string): boolean {
  return a === b || a.startsWith(b + "/") || b.startsWith(a + "/");
}

function overlaps(a: RegionLock, pieceId: string, layerId: string, regionIds: readonly string[]): boolean {
  return a.pieceId === pieceId && layersOverlap(a.layerId, layerId) && a.regionIds.some((r) => regionIds.some((q) => regionsOverlap(r, q)));
}

export function acquireLock(locks: readonly RegionLock[], req: { pieceId: string; layerId: string; regionIds: readonly string[]; ownerId: string; id?: string; token?: number }, now: number, ttl = LOCK_TTL_MS): LockResult {
  if (!Number.isFinite(now) || !Number.isFinite(ttl) || ttl <= 0 || ttl > MAX_LOCK_TTL_MS) {
    throw new Error("Prazo de reserva inválido");
  }
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

/* ── Reservas com id e token de fencing (RF66.CA02/CA03; editor 2D colaborativo de 12/11/2026) ─────────────────────── */

/**
 * A primeira reserva viva de OUTRA pessoa que impede `q` (mesma peça, camada sobreposta e região igual, ancestral ou
 * descendente). Serve para explicar o conflito — dono e prazo — sem precisar mostrar o conteúdo da região.
 */
export function findConflict(locks: readonly RegionLock[], q: { pieceId: string; layerId: string; regionIds: readonly string[]; userId: string }, now: number): RegionLock | undefined {
  return activeLocks(locks, now).find((l) => l.ownerId !== q.userId && overlaps(l, q.pieceId, q.layerId, q.regionIds));
}

/**
 * As reservas vivas de `userId` cobrem todas as regiões pedidas na camada? Uma reserva cobre a própria região e as
 * descendentes (reservar a mãe inclui as filhas, RF65.CA03); reserva de todas as camadas cobre qualquer camada.
 */
export function coveredBy(locks: readonly RegionLock[], q: { pieceId: string; layerId: string; regionIds: readonly string[]; userId: string }, now: number): boolean {
  if (!q.regionIds.length) return false;
  const mine = activeLocks(locks, now).filter((l) => l.pieceId === q.pieceId && l.ownerId === q.userId && (l.layerId === q.layerId || l.layerId === ALL_LAYERS));
  return q.regionIds.every((r) => mine.some((l) => l.regionIds.some((owned) => r === owned || r.startsWith(owned + "/"))));
}

export type LeaseDenial = "INEXISTENTE" | "EXPIRADA" | "OUTRO_DONO" | "TOKEN_OBSOLETO";
export type RenewResult = { ok: true; locks: RegionLock[]; lock: RegionLock } | { ok: false; locks: RegionLock[]; reason: LeaseDenial };

/**
 * Localiza a reserva `id` para o dono, exigindo o token vigente quando informado. Reserva vencida não volta a valer:
 * o cliente antigo precisa reservar de novo (e recebe outro token), nunca "ressuscita" a antiga.
 */
function ownedLease(locks: readonly RegionLock[], q: { id: string; ownerId: string; token?: number }, now: number): { ok: true; lock: RegionLock } | { ok: false; reason: LeaseDenial } {
  const lock = locks.find((l) => l.id === q.id);
  if (!lock) return { ok: false, reason: "INEXISTENTE" };
  if (lock.ownerId !== q.ownerId) return { ok: false, reason: "OUTRO_DONO" };
  if (q.token !== undefined && lock.token !== q.token) return { ok: false, reason: "TOKEN_OBSOLETO" };
  if (lock.expiresAt <= now) return { ok: false, reason: "EXPIRADA" };
  return { ok: true, lock };
}

/** Renova uma reserva viva — só o dono, com o token vigente; novo prazo = agora + ttl (mesmo teto de `acquireLock`). */
export function renewLock(locks: readonly RegionLock[], q: { id: string; ownerId: string; token?: number }, now: number, ttl = LOCK_TTL_MS): RenewResult {
  if (!Number.isFinite(now) || !Number.isFinite(ttl) || ttl <= 0 || ttl > MAX_LOCK_TTL_MS) throw new Error("Prazo de reserva inválido");
  const found = ownedLease(locks, q, now);
  const live = activeLocks(locks, now);
  if (!found.ok) return { ok: false, locks: live, reason: found.reason };
  const lock: RegionLock = { ...found.lock, expiresAt: now + ttl };
  return { ok: true, lock, locks: live.map((l) => (l.id === q.id ? lock : l)) };
}

/** Libera uma reserva específica (o dono, com o token vigente). As demais reservas do dono continuam. */
export function releaseLock(locks: readonly RegionLock[], q: { id: string; ownerId: string; token?: number }, now: number): { ok: true; locks: RegionLock[] } | { ok: false; locks: RegionLock[]; reason: LeaseDenial } {
  const found = ownedLease(locks, q, now);
  const live = activeLocks(locks, now);
  if (!found.ok) return { ok: false, locks: live, reason: found.reason };
  return { ok: true, locks: live.filter((l) => l.id !== q.id) };
}
