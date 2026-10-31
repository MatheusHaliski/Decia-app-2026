import { describe, expect, it } from "vitest";
import { acquireLock, canEditRegions, LOCK_TTL_MS, MAX_LOCK_TTL_MS, regionsOverlap } from "./collab";
import { authorizePatch } from "./patch";
import { createLayerStack } from "./layers";

/** Reservas colaborativas em cenários complexos (auditoria do Drawings, 31/10/2026). */
describe("reservas hierárquicas e prazos", () => {
  const now = 1_000_000;
  const req = (ownerId: string, regionIds: string[], layerId = "L1") => ({ pieceId: "p", layerId, regionIds, ownerId });

  it("reservar a região-mãe conflita com as filhas e vice-versa; nomes parecidos não", () => {
    expect(regionsOverlap("A", "A/1")).toBe(true);
    expect(regionsOverlap("A/1/b", "A")).toBe(true);
    expect(regionsOverlap("A1", "A10")).toBe(false);
    expect(regionsOverlap("A/1", "A/10")).toBe(false);
    const ana = acquireLock([], req("ana", ["A"]), now);
    expect(ana.ok).toBe(true);
    const bruno = acquireLock(ana.locks, req("bruno", ["C", "A/1"]), now);
    expect(bruno).toMatchObject({ ok: false, conflictWith: "ana" });
    const neta = acquireLock([], req("ana", ["A/1/b"]), now);
    expect(acquireLock(neta.locks, req("bruno", ["A"]), now).ok).toBe(false);
    expect(acquireLock(neta.locks, req("bruno", ["A/2"]), now).ok).toBe(true);
    expect(canEditRegions(ana.locks, { pieceId: "p", layerId: "L1", regionIds: ["A/1/b"], userId: "bruno" }, now)).toBe(false);
    expect(canEditRegions(ana.locks, { pieceId: "p", layerId: "L2", regionIds: ["A/1/b"], userId: "bruno" }, now)).toBe(true);
  });

  it("patch na região filha de uma reserva alheia é recusado", () => {
    const stack = createLayerStack([{ id: "L1", name: "frente", depth: 1 }]);
    const lock = acquireLock([], req("ana", ["A"]), now);
    const verdict = authorizePatch(stack, lock.locks, {
      pieceId: "p", actorId: "bruno", origin: "MANUAL", scope: { mode: "EDIT", layerId: "L1" },
      targets: [{ layerId: "L1", regionIds: ["A/3"], objectPath: ["x"] }],
    }, now);
    expect(verdict).toMatchObject({ ok: false, reason: "REGIAO_RESERVADA" });
  });

  it("prazo infinito, NaN, negativo, zero ou acima do teto é recusado; o teto é aceito", () => {
    for (const ttl of [Number.POSITIVE_INFINITY, Number.NaN, -5, 0, MAX_LOCK_TTL_MS + 1]) {
      expect(() => acquireLock([], req("ana", ["X"]), now, ttl)).toThrow("Prazo de reserva inválido");
    }
    expect(() => acquireLock([], req("ana", ["X"]), Number.NaN)).toThrow("Prazo de reserva inválido");
    expect(acquireLock([], req("ana", ["X"]), now, MAX_LOCK_TTL_MS).ok).toBe(true);
    const lock = acquireLock([], req("ana", ["X"]), now);
    expect(lock.ok && lock.lock.expiresAt).toBe(now + LOCK_TTL_MS);
    expect(canEditRegions(lock.locks, { pieceId: "p", layerId: "L1", regionIds: ["X"], userId: "bruno" }, now + LOCK_TTL_MS + 1)).toBe(true);
  });
});
