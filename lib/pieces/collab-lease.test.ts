import { describe, expect, it } from "vitest";
import { acquireLock, ALL_LAYERS, canEditRegions, coveredBy, findConflict, LOCK_TTL_MS, MAX_LOCK_TTL_MS, releaseLock, renewLock } from "./collab";

/** Reservas com id, token de fencing e "todas as camadas" (editor 2D colaborativo, 12/11/2026). */
describe("reservas com id, token e todas as camadas", () => {
  const now = 1_000_000;
  const req = (ownerId: string, regionIds: string[], layerId = "L1", token?: number) => ({ pieceId: "p", layerId, regionIds, ownerId, id: token ? `L${token}` : undefined, token });

  it("a reserva guarda id e token; sem eles o comportamento antigo continua", () => {
    const withToken = acquireLock([], req("ana", ["A"], "L1", 7), now);
    expect(withToken.ok && withToken.lock).toMatchObject({ id: "L7", token: 7, expiresAt: now + LOCK_TTL_MS });
    const plain = acquireLock([], { pieceId: "p", layerId: "L1", regionIds: ["A"], ownerId: "ana" }, now);
    expect(plain.ok && plain.lock.token).toBeUndefined();
  });

  it("reserva de todas as camadas conflita com qualquer camada (e vice-versa); camadas distintas convivem", () => {
    const all = acquireLock([], req("ana", ["A"], ALL_LAYERS, 1), now);
    expect(all.ok).toBe(true);
    expect(acquireLock(all.locks, req("bruno", ["A/1"], "L2", 2), now)).toMatchObject({ ok: false, conflictWith: "ana" });
    expect(canEditRegions(all.locks, { pieceId: "p", layerId: "L9", regionIds: ["A"], userId: "bruno" }, now)).toBe(false);
    const one = acquireLock([], req("ana", ["A"], "L1", 1), now);
    expect(acquireLock(one.locks, req("bruno", ["A"], ALL_LAYERS, 2), now).ok).toBe(false);
    expect(acquireLock(one.locks, req("bruno", ["A"], "L2", 2), now).ok).toBe(true);
  });

  it("findConflict devolve a reserva alheia (dono e prazo) e ignora a própria e as vencidas", () => {
    const a = acquireLock([], req("ana", ["A/1"], "L1", 1), now, 30_000);
    expect(findConflict(a.locks, { pieceId: "p", layerId: "L1", regionIds: ["A"], userId: "bruno" }, now)).toMatchObject({ ownerId: "ana", expiresAt: now + 30_000 });
    expect(findConflict(a.locks, { pieceId: "p", layerId: "L1", regionIds: ["A"], userId: "ana" }, now)).toBeUndefined();
    expect(findConflict(a.locks, { pieceId: "p", layerId: "L1", regionIds: ["A"], userId: "bruno" }, now + 30_000)).toBeUndefined();
  });

  it("coveredBy: reservar a mãe cobre as filhas; filha não cobre a mãe; todas as camadas cobrem qualquer camada", () => {
    const a = acquireLock([], req("ana", ["A"], "L1", 1), now);
    expect(coveredBy(a.locks, { pieceId: "p", layerId: "L1", regionIds: ["A/1", "A/2/x"], userId: "ana" }, now)).toBe(true);
    expect(coveredBy(a.locks, { pieceId: "p", layerId: "L2", regionIds: ["A/1"], userId: "ana" }, now)).toBe(false);
    expect(coveredBy(a.locks, { pieceId: "p", layerId: "L1", regionIds: ["A1"], userId: "ana" }, now)).toBe(false);
    expect(coveredBy(a.locks, { pieceId: "p", layerId: "L1", regionIds: [], userId: "ana" }, now)).toBe(false);
    const child = acquireLock([], req("ana", ["A/1"], "L1", 1), now);
    expect(coveredBy(child.locks, { pieceId: "p", layerId: "L1", regionIds: ["A"], userId: "ana" }, now)).toBe(false);
    const all = acquireLock([], req("ana", ["A"], ALL_LAYERS, 1), now);
    expect(coveredBy(all.locks, { pieceId: "p", layerId: "L5", regionIds: ["A/1"], userId: "ana" }, now)).toBe(true);
  });

  it("renewLock/releaseLock: só o dono, com o token vigente, antes de vencer; prazo dentro do teto", () => {
    const a = acquireLock([], req("ana", ["A"], "L1", 3), now, 30_000);
    expect(renewLock(a.locks, { id: "L3", ownerId: "bruno", token: 3 }, now)).toMatchObject({ ok: false, reason: "OUTRO_DONO" });
    expect(renewLock(a.locks, { id: "L3", ownerId: "ana", token: 2 }, now)).toMatchObject({ ok: false, reason: "TOKEN_OBSOLETO" });
    expect(renewLock(a.locks, { id: "L9", ownerId: "ana" }, now)).toMatchObject({ ok: false, reason: "INEXISTENTE" });
    expect(renewLock(a.locks, { id: "L3", ownerId: "ana", token: 3 }, now + 30_000)).toMatchObject({ ok: false, reason: "EXPIRADA" });
    expect(() => renewLock(a.locks, { id: "L3", ownerId: "ana", token: 3 }, now, MAX_LOCK_TTL_MS + 1)).toThrow("Prazo de reserva inválido");
    const renewed = renewLock(a.locks, { id: "L3", ownerId: "ana", token: 3 }, now + 10_000, 60_000);
    expect(renewed.ok && renewed.lock.expiresAt).toBe(now + 70_000);
    expect(releaseLock(a.locks, { id: "L3", ownerId: "bruno", token: 3 }, now)).toMatchObject({ ok: false, reason: "OUTRO_DONO" });
    const freed = releaseLock(a.locks, { id: "L3", ownerId: "ana", token: 3 }, now);
    expect(freed).toEqual({ ok: true, locks: [] });
  });
});
