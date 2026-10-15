import { describe, expect, it } from "vitest";
import { PiecesService } from "./service";
import { assertEditableInActiveLayer, createLayerStack, setLayerLocked, switchActiveLayer } from "./layers";
import { acquireLock } from "./collab";
import { completeWireframe, isWireframe, toWireframe, type SuggestedElement } from "./wireframe";

const layers = [{ id: "fundo", name: "Natureza", depth: 0 }, { id: "frente", name: "Pessoas e objetos", depth: 1 }];
const tgt = (layerId: string) => ({ layerId, regionIds: ["A1"], objectPath: ["o1"] });

describe("camadas", () => {
  it("edita só na camada ativa", () => {
    const s = createLayerStack(layers);
    expect(s.activeLayerId).toBe("frente");
    expect(() => assertEditableInActiveLayer(s, [tgt("frente")])).not.toThrow();
    expect(() => assertEditableInActiveLayer(s, [tgt("fundo")])).toThrow();
    expect(switchActiveLayer(s, "fundo").activeLayerId).toBe("fundo");
  });
  it("camada travada não ativa nem edita", () => {
    const s = setLayerLocked(createLayerStack(layers), "frente", true);
    expect(s.activeLayerId).toBe("fundo");
    expect(() => switchActiveLayer(s, "frente")).toThrow();
  });
});

describe("colaboração", () => {
  it("região travada por um usuário bloqueia o outro", () => {
    let t = 0;
    const svc = new PiecesService(() => t);
    svc.create({ id: "p", ownerId: "a", title: "T", layers });
    expect(svc.lockRegions("p", "a", "frente", ["A1", "A2"]).ok).toBe(true);
    expect(svc.lockRegions("p", "b", "frente", ["A2"])).toEqual({ ok: false, conflictWith: "a" });
    expect(svc.canEdit("p", "b", "frente", ["A2"])).toBe(false);
    expect(svc.canEdit("p", "b", "frente", ["B1"])).toBe(true);
    expect(svc.canEdit("p", "b", "fundo", ["A2"])).toBe(true);
    t = 61_000;
    expect(svc.canEdit("p", "b", "frente", ["A2"])).toBe(true);
  });
  it("dono renova e libera", () => {
    const svc = new PiecesService(() => 0);
    svc.create({ id: "p", ownerId: "a", title: "T", layers });
    svc.lockRegions("p", "a", "frente", ["A1"]);
    expect(svc.lockRegions("p", "a", "frente", ["A1"]).ok).toBe(true);
    svc.unlock("p", "a");
    expect(svc.canEdit("p", "b", "frente", ["A1"])).toBe(true);
    expect(acquireLock([], { pieceId: "p", layerId: "x", regionIds: ["r"], ownerId: "a" }, 0).ok).toBe(true);
  });
});

describe("wireframe", () => {
  const el: SuggestedElement = { id: "e", kind: "person", name: "Figura", mode: "FILLED", stroke: "#000", strokeWidth: 2, fill: "#fff", details: ["sombra"] };
  it("remove preenchimento e devolve ao usuário", () => {
    const w = toWireframe(el);
    expect(isWireframe(w)).toBe(true);
    expect(w.pendingForUser).toContain("preenchimento");
    const done = completeWireframe(w, "#f00");
    expect(done.mode).toBe("FILLED");
    expect(done.pendingForUser).toBeUndefined();
    expect(() => completeWireframe(done, "#0f0")).toThrow();
  });
});

describe("proveniência", () => {
  it("gera manifesto não assinado e esconde autoria oculta", async () => {
    const svc = new PiecesService(() => 0);
    svc.create({ id: "p", ownerId: "a", title: "T", layers, units: [{ id: "u", weight: 1 }], authorshipDisplay: "HIDDEN" });
    await svc.recordEvent("p", { id: "e1", actorId: "a", origin: "MANUAL", scope: ["u"] });
    const m = await svc.manifest("p");
    expect(m.signed).toBe(false);
    expect(m.authorship.category).toBe("HUMAN");
    expect(m.assertions.some((a) => a.label === "iptc.digitalSourceType")).toBe(true);
    expect(svc.publicAuthorship("p").category).toBe("NOT_DISCLOSED");
  });
  it("sem eventos fica não verificado", async () => {
    const svc = new PiecesService(() => 0);
    svc.create({ id: "p", ownerId: "a", title: "T", layers });
    expect((await svc.manifest("p")).assertions[1]?.label).toBe("decia.unverified");
  });
});
