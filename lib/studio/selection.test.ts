import { describe, expect, it } from "vitest";
import {
  editableNodeIds,
  geometryBounds,
  hitTest,
  selectAtPoint,
  selectInBounds,
  selectInPolygon,
  selectedNodeIds,
  snapPoint,
  type DrawingScene,
} from "./selection";

const scene: DrawingScene = {
  layers: [
    { id: "background" },
    { id: "front" },
    { id: "hidden", visible: false },
    { id: "locked", locked: true },
  ],
  nodes: [
    { id: "group", layerId: "front", geometry: { kind: "rect", x: 0, y: 0, width: 90, height: 90 } },
    { id: "child", layerId: "front", parentId: "group", geometry: { kind: "circle", cx: 30, cy: 30, radius: 10 } },
    { id: "segment", layerId: "background", geometry: { kind: "segment", start: { x: 100, y: 10 }, end: { x: 150, y: 10 } } },
    { id: "hidden-node", layerId: "hidden", geometry: { kind: "rect", x: 0, y: 0, width: 20, height: 20 } },
    { id: "locked-node", layerId: "locked", geometry: { kind: "rect", x: 200, y: 0, width: 20, height: 20 } },
    { id: "locked-child", layerId: "front", parentId: "locked-node", geometry: { kind: "rect", x: 205, y: 5, width: 5, height: 5 } },
    { id: "region-node", layerId: "background", geometry: { kind: "rect", x: 300, y: 0, width: 20, height: 20 } },
  ],
  lockedRegions: [{ layerId: "background", geometry: { kind: "rect", x: 310, y: 0, width: 20, height: 20 } }],
};

describe("drawing selection", () => {
  it("hit-tests geometry and selects the topmost visible object", () => {
    expect(hitTest({ kind: "segment", start: { x: 0, y: 0 }, end: { x: 20, y: 0 } }, { x: 10, y: 4 })).toBe(true);
    expect(selectAtPoint(scene, { x: 5, y: 5 })).toEqual({ kind: "object", id: "group" });
    expect(selectAtPoint(scene, { x: 15, y: 15 })).not.toEqual({ kind: "object", id: "hidden-node" });
  });

  it("selects objects by crossing or fully-contained bounding box", () => {
    const crossing = selectInBounds(scene, { x: 80, y: 0, width: 30, height: 20 });
    expect(selectedNodeIds(scene, crossing)).toContain("group");
    expect(selectedNodeIds(scene, crossing)).toContain("segment");

    const contained = selectInBounds(scene, { x: 0, y: 0, width: 20, height: 20 }, "contained");
    // Camada oculta não entra em seleção espacial: o que a contagem mostra é o que está na tela.
    expect(selectedNodeIds(scene, contained)).not.toContain("hidden-node");
    expect(selectedNodeIds(scene, contained)).not.toContain("group");
    expect(selectedNodeIds(scene, { kind: "region", geometry: { kind: "rect", x: 0, y: 0, width: 20, height: 20 } })).not.toContain("hidden-node");
  });

  it("selects geometry crossing a polygon even when no vertex is inside", () => {
    const selection = selectInPolygon(scene, [
      { x: 105, y: 8 },
      { x: 110, y: 8 },
      { x: 110, y: 12 },
      { x: 105, y: 12 },
    ]);
    expect(selectedNodeIds(scene, selection)).toContain("segment");
  });

  it("selects group descendants and applies layer, ancestor, and region locks", () => {
    const groupSelection = { kind: "object", id: "group" } as const;
    expect(selectedNodeIds(scene, groupSelection)).toEqual(new Set(["group", "child"]));
    expect(editableNodeIds(scene, { kind: "layer", id: "front" })).toEqual(new Set(["group", "child"]));
    expect(editableNodeIds(scene, { kind: "object", id: "locked-node" })).toEqual(new Set());
    expect(editableNodeIds(scene, { kind: "object", id: "region-node" })).toEqual(new Set());
  });

  it("does not pick or area-select a child whose ancestor sits on a hidden layer", () => {
    const nested: DrawingScene = {
      layers: [{ id: "shown" }, { id: "off", visible: false }],
      nodes: [
        { id: "parent", layerId: "off", geometry: { kind: "rect", x: 0, y: 0, width: 50, height: 50 } },
        { id: "kid", layerId: "shown", parentId: "parent", geometry: { kind: "rect", x: 10, y: 10, width: 10, height: 10 } },
      ],
    };
    expect(selectAtPoint(nested, { x: 15, y: 15 })).toEqual({ kind: "none" });
    expect(selectedNodeIds(nested, selectInBounds(nested, { x: 0, y: 0, width: 60, height: 60 }))).toEqual(new Set());
    // Seleção nomeada continua possível (painel de camadas), mas não é editável enquanto oculta.
    expect(selectedNodeIds(nested, { kind: "object", id: "kid" })).toEqual(new Set(["kid"]));
    expect(editableNodeIds(nested, { kind: "object", id: "kid" })).toEqual(new Set());
  });

  it("keeps grid snapping independent and leaves invalid grid sizes unapplied", () => {
    expect(snapPoint({ x: 17, y: 24 }, 10, true)).toEqual({ x: 20, y: 20 });
    expect(snapPoint({ x: 17, y: 24 }, 10, false)).toEqual({ x: 17, y: 24 });
    expect(snapPoint({ x: 17, y: 24 }, 0, true)).toEqual({ x: 17, y: 24 });
  });

  it("normalizes negative dimensions when deriving rectangle bounds", () => {
    expect(geometryBounds({ kind: "rect", x: 10, y: 20, width: -5, height: -7 }))
      .toEqual({ x: 5, y: 13, width: 5, height: 7 });
  });
});
