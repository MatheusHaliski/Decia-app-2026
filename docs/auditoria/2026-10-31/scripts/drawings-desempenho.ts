// Medição de desempenho do motor de seleção 2D em plantas grandes (auditoria do Drawings, 31/10/2026).
// Rodar da raiz: node --experimental-strip-types docs/auditoria/2026-10-31/scripts/drawings-desempenho.ts
import { selectedNodeIds, selectAtPoint, editableNodeIds } from "../../../../lib/studio/selection.ts";
let seed = 42; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const L = [{ id: "A" }, { id: "B" }, { id: "C", locked: true }, { id: "H", visible: false }];
function t<T>(label: string, f: () => T, out: Record<string, unknown>) { const s = performance.now(); const r = f(); out[label] = Math.round(performance.now() - s) + " ms"; return r; }
const out: Record<string, unknown> = {};
// cena 1: planta grande — 20.000 objetos variados em 4 camadas
const nodes: any[] = [];
for (let i = 0; i < 20000; i++) {
  const x = rnd() * 10000, y = rnd() * 10000, k = i % 5, layerId = L[i % 4].id;
  const g = k === 0 ? { kind: "rect", x, y, width: rnd() * 50, height: rnd() * 50 }
    : k === 1 ? { kind: "circle", cx: x, cy: y, radius: rnd() * 30 }
    : k === 2 ? { kind: "segment", start: { x, y }, end: { x: x + rnd() * 80, y: y + rnd() * 80 } }
    : k === 3 ? { kind: "polygon", points: Array.from({ length: 12 }, (_, j) => ({ x: x + Math.cos(j) * 20, y: y + Math.sin(j) * 20 })) }
    : { kind: "path", points: Array.from({ length: 40 }, (_, j) => ({ x: x + j * 3, y: y + Math.sin(j / 3) * 15 })) };
  nodes.push({ id: "n" + i, layerId, geometry: g });
}
const big = { nodes, layers: L };
t("clique (20k objetos)", () => selectAtPoint(big as any, { x: 5000, y: 5000 }), out);
const sel = t("retângulo crossing 2000x2000 (20k)", () => selectedNodeIds(big as any, { kind: "bounds", bounds: { x: 4000, y: 4000, width: 2000, height: 2000 }, mode: "crossing" }), out) as Set<string>;
out["selecionados no retângulo"] = sel.size;
const lasso = Array.from({ length: 400 }, (_, j) => ({ x: 5000 + Math.cos(j / 400 * 2 * Math.PI) * (1500 + 400 * Math.sin(j / 7)), y: 5000 + Math.sin(j / 400 * 2 * Math.PI) * (1500 + 400 * Math.sin(j / 7)) }));
const ls = t("laço 400 vértices contained (20k)", () => selectedNodeIds(big as any, { kind: "polygon", points: lasso, mode: "contained" }), out) as Set<string>;
out["selecionados no laço"] = ls.size;
t("editáveis do laço (20k)", () => editableNodeIds(big as any, { kind: "polygon", points: lasso, mode: "crossing" }), out);
// cena 2: grupo com 8.000 filhos (bloco/símbolo grande)
const g2: any[] = [{ id: "grupo", layerId: "A", geometry: { kind: "rect", x: 0, y: 0, width: 1, height: 1 } }];
for (let i = 0; i < 8000; i++) g2.push({ id: "f" + i, layerId: "A", parentId: "grupo", geometry: { kind: "rect", x: i, y: 0, width: 1, height: 1 } });
t("selecionar grupo com 8.000 filhos", () => selectedNodeIds({ nodes: g2, layers: L } as any, { kind: "object", id: "grupo" }), out);
// cena 3: aninhamento profundo (cadeia de 3.000 níveis)
const g3: any[] = [];
for (let i = 0; i < 3000; i++) g3.push({ id: "d" + i, layerId: "A", parentId: i ? "d" + (i - 1) : undefined, geometry: { kind: "rect", x: i, y: i, width: 1, height: 1 } });
t("clique em cadeia de 3.000 níveis", () => selectAtPoint({ nodes: g3, layers: L } as any, { x: 0.5, y: 0.5 }), out);
t("retângulo em cadeia de 3.000 níveis", () => selectedNodeIds({ nodes: g3, layers: L } as any, { kind: "bounds", bounds: { x: 0, y: 0, width: 3000, height: 3000 } }), out);
// cena 4: contornos técnicos densos — 300 caminhos de 5.000 pontos e laço de 1.000 vértices
const g4: any[] = [];
for (let i = 0; i < 300; i++) g4.push({ id: "c" + i, layerId: "A", geometry: { kind: "path", closed: true, points: Array.from({ length: 5000 }, (_, j) => ({ x: i * 30 + Math.cos(j / 5000 * 2 * Math.PI) * 10, y: Math.sin(j / 5000 * 2 * Math.PI) * 10 })) } });
const lasso4 = Array.from({ length: 1000 }, (_, j) => ({ x: 4500 + Math.cos(j / 1000 * 2 * Math.PI) * 3000, y: Math.sin(j / 1000 * 2 * Math.PI) * 3000 }));
t("laço 1.000 vértices sobre 300 contornos de 5.000 pontos (contained)", () => selectedNodeIds({ nodes: g4, layers: L } as any, { kind: "polygon", points: lasso4, mode: "contained" }), out);
t("mesmo laço em crossing (contornos fora)", () => selectedNodeIds({ nodes: g4, layers: L } as any, { kind: "polygon", points: lasso4.map(p => ({ x: p.x + 20000, y: p.y })), mode: "crossing" }), out);
console.log(JSON.stringify(out, null, 1));
