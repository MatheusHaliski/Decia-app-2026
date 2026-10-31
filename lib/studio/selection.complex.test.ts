import { describe, expect, it } from "vitest";
import { editableNodeIds, geometryBounds, selectAtPoint, selectedNodeIds, type DrawingNode, type DrawingScene, type Geometry, type Point } from "./selection";

/**
 * Cenas 2D complexas (auditoria do Drawings, 31/10/2026): ciclo de grupos, laço côncavo, laço sem área, coordenadas UTM, correção do
 * modo "contido" por amostragem densa em cenas aleatórias e limites de tempo em plantas grandes (antes: 5,8 s, 28 s e 99 s).
 */
let seed = 20261031;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const layer = [{ id: "L" }];
const node = (id: string, geometry: Geometry, extra: Partial<DrawingNode> = {}): DrawingNode => ({ id, layerId: "L", geometry, ...extra });

describe("cenas 2D complexas", () => {
  it("ciclo de grupos (dado corrompido) não trava: some do clique e da edição", () => {
    const scene: DrawingScene = {
      layers: layer,
      nodes: [
        node("A", { kind: "rect", x: 0, y: 0, width: 10, height: 10 }, { parentId: "B" }),
        node("B", { kind: "rect", x: 20, y: 0, width: 10, height: 10 }, { parentId: "A" }),
        node("ok", { kind: "rect", x: 40, y: 0, width: 10, height: 10 }),
      ],
    };
    expect(selectAtPoint(scene, { x: 5, y: 5 })).toEqual({ kind: "none" });
    expect([...selectedNodeIds(scene, { kind: "bounds", bounds: { x: -1, y: -1, width: 60, height: 20 } })]).toEqual(["ok"]);
    expect([...editableNodeIds(scene, { kind: "objects", ids: ["A", "ok"] })]).toEqual(["ok"]);
  });

  it("laço côncavo (U) no modo contido não pega o que atravessa o vão; no braço pega", () => {
    const U: Point[] = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 70, y: 100 }, { x: 70, y: 30 }, { x: 30, y: 30 }, { x: 30, y: 100 }, { x: 0, y: 100 }];
    const scene: DrawingScene = {
      layers: layer,
      nodes: [
        node("atravessa", { kind: "segment", start: { x: 10, y: 80 }, end: { x: 90, y: 80 } }),
        node("ponte", { kind: "rect", x: 10, y: 50, width: 80, height: 10 }),
        node("noBraco", { kind: "polygon", points: [{ x: 5, y: 40 }, { x: 25, y: 40 }, { x: 15, y: 90 }] }),
        node("naBase", { kind: "circle", cx: 50, cy: 15, radius: 10 }),
      ],
    };
    expect([...selectedNodeIds(scene, { kind: "polygon", points: U, mode: "contained" })].sort()).toEqual(["naBase", "noBraco"]);
    expect(selectedNodeIds(scene, { kind: "polygon", points: U, mode: "crossing" }).size).toBe(4);
  });

  it("laço sem área (pontos alinhados ou repetidos) não seleciona nada", () => {
    const scene: DrawingScene = { layers: layer, nodes: [node("s", { kind: "segment", start: { x: 10, y: 0 }, end: { x: 20, y: 0 } })] };
    for (const points of [[{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }], [{ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 }]]) {
      for (const mode of ["contained", "crossing"] as const) expect(selectedNodeIds(scene, { kind: "polygon", points, mode }).size).toBe(0);
    }
  });

  it("raio inválido não produz caixa NaN", () => {
    expect(geometryBounds({ kind: "circle", cx: 0, cy: 0, radius: Number.NaN })).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it("coordenadas UTM (~7,2 milhões) selecionam o mesmo que perto da origem", () => {
    const scene = (ox: number, oy: number): DrawingScene => ({
      layers: layer,
      nodes: Array.from({ length: 1600 }, (_, k) => {
        const i = Math.floor(k / 40), j = k % 40;
        return node(`p${k}`, { kind: "polygon", points: [{ x: ox + i * 10, y: oy + j * 10 }, { x: ox + i * 10 + 7.3, y: oy + j * 10 + 0.001 }, { x: ox + i * 10 + 3.1, y: oy + j * 10 + 6.9 }] });
      }),
    });
    const lasso = (ox: number, oy: number): Point[] => [{ x: ox + 55.5, y: oy + 33.3 }, { x: ox + 301.7, y: oy + 40.2 }, { x: ox + 250.1, y: oy + 290.9 }, { x: ox + 120.4, y: oy + 150.05 }, { x: ox + 40.2, y: oy + 260.6 }];
    for (const mode of ["contained", "crossing"] as const) {
      const near = selectedNodeIds(scene(0, 0), { kind: "polygon", points: lasso(0, 0), mode });
      const utm = selectedNodeIds(scene(612345.678, 7187654.321), { kind: "polygon", points: lasso(612345.678, 7187654.321), mode });
      expect(near.size).toBeGreaterThan(300);
      expect([...utm].sort()).toEqual([...near].sort());
    }
  });

  it("modo contido é correto em 300 cenas aleatórias: nenhum ponto das arestas fica fora do laço", () => {
    const pip = (p: Point, poly: Point[]) => {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i]!, b = poly[j]!;
        if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
      }
      return inside;
    };
    const near = (p: Point, a: Point, b: Point) => {
      const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy;
      const t = l ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l)) : 0;
      return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)) < 1e-6;
    };
    let contained = 0;
    for (let s = 0; s < 300; s += 1) {
      const nodes = Array.from({ length: 20 }, (_, j) => {
        const x = rnd() * 200, y = rnd() * 200, n = 3 + Math.floor(rnd() * 8);
        return node(`n${j}`, j % 2 ? { kind: "segment", start: { x, y }, end: { x: x + rnd() * 60 - 30, y: y + rnd() * 60 - 30 } }
          : { kind: "path", closed: rnd() < 0.5, points: Array.from({ length: n }, () => ({ x: x + rnd() * 50 - 25, y: y + rnd() * 50 - 25 })) });
      });
      const m = 5 + Math.floor(rnd() * 10), cx = rnd() * 200, cy = rnd() * 200;
      const lasso = Array.from({ length: m }, (_, j) => { const a = (j / m) * 2 * Math.PI, r = 20 + rnd() * 90; return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }; });
      for (const id of selectedNodeIds({ nodes, layers: layer }, { kind: "polygon", points: lasso, mode: "contained" })) {
        contained += 1;
        const g = nodes.find((x) => x.id === id)!.geometry;
        const pts = g.kind === "segment" ? [g.start, g.end] : (g as { points: Point[] }).points;
        const closed = g.kind === "path" && g.closed === true;
        for (let e = 0; e < (closed ? pts.length : pts.length - 1); e += 1) {
          const a = pts[e]!, b = pts[(e + 1) % pts.length]!;
          for (let k = 0; k <= 100; k += 1) {
            const p = { x: a.x + ((b.x - a.x) * k) / 100, y: a.y + ((b.y - a.y) * k) / 100 };
            const onBorder = lasso.some((q, j) => near(p, q, lasso[(j + 1) % lasso.length]!));
            expect(onBorder || pip(p, lasso), `${id} sai do laço`).toBe(true);
          }
        }
      }
    }
    expect(contained).toBeGreaterThan(50);
  });

  it("plantas grandes respondem rápido (limites folgados; antes 5,8 s, 28 s e 99 s)", () => {
    const nodes: DrawingNode[] = Array.from({ length: 20000 }, (_, i) => {
      const x = rnd() * 10000, y = rnd() * 10000;
      return node(`n${i}`, i % 2 ? { kind: "rect", x, y, width: 30, height: 30 } : { kind: "path", points: Array.from({ length: 40 }, (_, j) => ({ x: x + j * 3, y: y + Math.sin(j / 3) * 15 })) });
    });
    const lasso = Array.from({ length: 400 }, (_, j) => ({ x: 5000 + Math.cos((j / 400) * 2 * Math.PI) * (1500 + 400 * Math.sin(j / 7)), y: 5000 + Math.sin((j / 400) * 2 * Math.PI) * (1500 + 400 * Math.sin(j / 7)) }));
    let t = performance.now();
    const editable = editableNodeIds({ nodes, layers: layer }, { kind: "polygon", points: lasso, mode: "crossing" });
    expect(editable.size).toBeGreaterThan(500);
    expect(performance.now() - t).toBeLessThan(3000);

    const dense: DrawingNode[] = Array.from({ length: 60 }, (_, i) => node(`c${i}`, { kind: "path", closed: true, points: Array.from({ length: 5000 }, (_, j) => ({ x: i * 30 + Math.cos((j / 5000) * 2 * Math.PI) * 10, y: Math.sin((j / 5000) * 2 * Math.PI) * 10 })) }));
    const far = Array.from({ length: 1000 }, (_, j) => ({ x: 50000 + Math.cos((j / 1000) * 2 * Math.PI) * 3000, y: Math.sin((j / 1000) * 2 * Math.PI) * 3000 }));
    t = performance.now();
    expect(selectedNodeIds({ nodes: dense, layers: layer }, { kind: "polygon", points: far, mode: "crossing" }).size).toBe(0);
    expect(performance.now() - t).toBeLessThan(3000);

    const group: DrawingNode[] = [node("g", { kind: "rect", x: 0, y: 0, width: 1, height: 1 }), ...Array.from({ length: 8000 }, (_, i) => node(`f${i}`, { kind: "rect", x: i, y: 0, width: 1, height: 1 }, { parentId: "g" }))];
    t = performance.now();
    expect(selectedNodeIds({ nodes: group, layers: layer }, { kind: "object", id: "g" }).size).toBe(8001);
    expect(performance.now() - t).toBeLessThan(3000);
  });
});
