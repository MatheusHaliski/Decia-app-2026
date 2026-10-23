import { describe, expect, it } from "vitest";
import { acquireLock } from "./collab";
import { createLayerStack, setLayerLocked } from "./layers";
import { authorizePatch } from "./patch";
import { PiecesService } from "./service";

const layers = [{ id: "fundo", name: "Natureza", depth: 0 }, { id: "frente", name: "Pessoas e objetos", depth: 1 }];
const eye = { layerId: "frente", regionIds: ["B2"], objectPath: ["figura", "cabeca", "olho"] };
const scope = { mode: "EDIT" as const, layerId: "frente", regionIds: ["B2"], objectPath: ["figura", "cabeca"] };

describe("porta única de patch: seleção + camada + reserva (manual e IA)", () => {
  it("autoriza alvo na seleção, camada ativa visível e região livre", () => {
    expect(authorizePatch(createLayerStack(layers), [], { pieceId: "p", actorId: "a", origin: "IA", scope, targets: [eye] }, 0)).toEqual({ ok: true });
  });
  it("reserva de outro participante bloqueia mesmo com escopo válido (antes passava)", () => {
    const lock = acquireLock([], { pieceId: "p", layerId: "frente", regionIds: ["B2"], ownerId: "b" }, 0);
    if (!lock.ok) throw new Error("lock");
    for (const origin of ["MANUAL", "IA"] as const) {
      expect(authorizePatch(createLayerStack(layers), lock.locks, { pieceId: "p", actorId: "a", origin, scope, targets: [eye] }, 1)).toMatchObject({ ok: false, reason: "REGIAO_RESERVADA" });
    }
    // o dono da reserva edita
    expect(authorizePatch(createLayerStack(layers), lock.locks, { pieceId: "p", actorId: "b", origin: "MANUAL", scope, targets: [eye] }, 1)).toEqual({ ok: true });
  });
  it("IA sem seleção concreta não altera a camada inteira; manual pode", () => {
    const wide = { mode: "EDIT" as const, layerId: "frente" };
    expect(authorizePatch(createLayerStack(layers), [], { pieceId: "p", actorId: "a", origin: "IA", scope: wide, targets: [eye] }, 0)).toEqual({ ok: false, reason: "IA_SEM_SELECAO" });
    expect(authorizePatch(createLayerStack(layers), [], { pieceId: "p", actorId: "a", origin: "MANUAL", scope: wide, targets: [eye] }, 0)).toEqual({ ok: true });
  });
  it("camada oculta, travada ou inativa e alvo fora da seleção recusam o patch inteiro", () => {
    const base = createLayerStack(layers);
    const hidden = { ...base, layers: base.layers.map((l) => (l.id === "frente" ? { ...l, visible: false } : l)) };
    const req = (targets = [eye]) => ({ pieceId: "p", actorId: "a", origin: "MANUAL" as const, scope, targets });
    expect(authorizePatch(hidden, [], req(), 0)).toMatchObject({ reason: "CAMADA_OCULTA" });
    expect(authorizePatch(setLayerLocked(base, "frente", true), [], req(), 0)).toMatchObject({ reason: "CAMADA_TRAVADA" });
    expect(authorizePatch(base, [], req([{ ...eye, layerId: "fundo" }]), 0)).toMatchObject({ reason: "CAMADA_INATIVA" });
    expect(authorizePatch(base, [], req([eye, { ...eye, objectPath: ["arvore"] }]), 0)).toMatchObject({ reason: "FORA_DA_SELECAO" });
    expect(authorizePatch(base, [], req([]), 0)).toEqual({ ok: false, reason: "SEM_ALVOS" });
  });
  it("PiecesService expõe a mesma regra", () => {
    const svc = new PiecesService(() => 0);
    svc.create({ id: "p", ownerId: "a", title: "T", layers });
    svc.lockRegions("p", "b", "frente", ["B2"]);
    expect(svc.authorizePatch("p", { actorId: "a", origin: "IA", scope, targets: [eye] })).toMatchObject({ ok: false, reason: "REGIAO_RESERVADA" });
  });
});
