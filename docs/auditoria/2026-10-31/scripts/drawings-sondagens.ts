// Sondagens de correção do motor de seleção 2D (auditoria do Drawings, 31/10/2026).
// Rodar da raiz: node --experimental-strip-types docs/auditoria/2026-10-31/scripts/drawings-sondagens.ts
import { selectedNodeIds, selectAtPoint, editableNodeIds, hitTest, geometryBounds, snapPoint } from "../../../../lib/studio/selection.ts";
type P = { x: number; y: number };
const out: Record<string, unknown> = {};
const L = [{ id: "L" }];
// 1) laço côncavo (U) + modo contido: segmento cujas pontas estão dentro mas que atravessa o recorte
const U: P[] = [{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:70,y:100},{x:70,y:30},{x:30,y:30},{x:30,y:100},{x:0,y:100}];
const seg = { id: "s", layerId: "L", geometry: { kind: "segment", start: {x:10,y:80}, end: {x:90,y:80} } };
out.concaveContainedSegment = [...selectedNodeIds({ nodes: [seg] as any, layers: L }, { kind: "polygon", points: U, mode: "contained" })];
// retângulo cujos 4 cantos ficam nos braços do U, mas o meio passa pelo vão
const rect = { id: "r", layerId: "L", geometry: { kind: "rect", x: 10, y: 50, width: 80, height: 10 } };
out.concaveContainedRect = [...selectedNodeIds({ nodes: [rect] as any, layers: L }, { kind: "polygon", points: U, mode: "contained" })];
// 2) círculo grande: retângulo que invade 3 px do arco entre dois vértices do 32-gono
const R = 1000, ang = Math.PI / 32; // meio entre vértice 0 e 1
const px = Math.cos(ang) * R, py = Math.sin(ang) * R; // ponto do arco verdadeiro
const box = { x: px - 3, y: py - 1, width: 50, height: 2 }; // encosta 3 px para dentro do arco
const circle = { id: "c", layerId: "L", geometry: { kind: "circle", cx: 0, cy: 0, radius: R } };
out.bigCircleTrueOverlap = Math.hypot(px - 3, py) < R;
out.bigCircleCrossing = [...selectedNodeIds({ nodes: [circle] as any, layers: L }, { kind: "bounds", bounds: box, mode: "crossing" })];
out.bigCircleRegion = [...selectedNodeIds({ nodes: [circle] as any, layers: L }, { kind: "region", geometry: { kind: "rect", ...box } })];
// 3) invariância a translação com coordenadas UTM (~7.2e6 m) e milímetros
function scene(offx: number, offy: number) {
  const n: any[] = [];
  for (let i = 0; i < 40; i++) for (let j = 0; j < 40; j++)
    n.push({ id: `p${i}_${j}`, layerId: "L", geometry: { kind: "polygon", points: [
      {x:offx+i*10, y:offy+j*10}, {x:offx+i*10+7.3, y:offy+j*10+0.001}, {x:offx+i*10+3.1, y:offy+j*10+6.9} ] } });
  return { nodes: n, layers: L };
}
const lasso = (ox: number, oy: number): P[] => [{x:ox+55.5,y:oy+33.3},{x:ox+301.7,y:oy+40.2},{x:ox+250.1,y:oy+290.9},{x:ox+120.4,y:oy+150.05},{x:ox+40.2,y:oy+260.6}];
const base = selectedNodeIds(scene(0,0), { kind: "polygon", points: lasso(0,0), mode: "contained" });
const utm = selectedNodeIds(scene(612345.678, 7187654.321), { kind: "polygon", points: lasso(612345.678, 7187654.321), mode: "contained" });
const baseX = selectedNodeIds(scene(0,0), { kind: "polygon", points: lasso(0,0), mode: "crossing" });
const utmX = selectedNodeIds(scene(612345.678, 7187654.321), { kind: "polygon", points: lasso(612345.678, 7187654.321), mode: "crossing" });
out.utmContainedSame = base.size === utm.size && [...base].every((id) => utm.has(id));
out.utmCrossingSame = baseX.size === utmX.size && [...baseX].every((id) => utmX.has(id));
out.utmCounts = { base: base.size, utm: utm.size, baseX: baseX.size, utmX: utmX.size };
// 4) clique na borda do retângulo em coordenada UTM com tolerância 0
out.utmEdgeClick = hitTest({ kind: "rect", x: 7187654.1, y: 0.1, width: 0.2, height: 1 }, { x: 7187654.3, y: 0.5 }, 0);
// 5) dados inválidos: raio NaN, pontos NaN, lasso degenerado (colinear)
out.nanRadiusBounds = geometryBounds({ kind: "circle", cx: 0, cy: 0, radius: NaN });
out.nanPolygonClick = selectAtPoint({ nodes: [{ id: "n", layerId: "L", geometry: { kind: "polygon", points: [{x:0,y:0},{x:NaN,y:5},{x:10,y:10}] } }] as any, layers: L }, { x: 3, y: 3 });
const line: P[] = [{x:0,y:0},{x:50,y:0},{x:100,y:0}];
out.degenerateLassoContained = [...selectedNodeIds({ nodes: [{ id: "onLine", layerId: "L", geometry: { kind: "segment", start: {x:10,y:0}, end: {x:20,y:0} } }] as any, layers: L }, { kind: "polygon", points: line, mode: "contained" })];
out.snapNegHalf = snapPoint({ x: -5, y: 5 }, 10, true);
// 6) camada travada com objeto filho em outra camada destravada
const nodes6 = [
  { id: "g", layerId: "LK", geometry: { kind: "rect", x: 0, y: 0, width: 100, height: 100 } },
  { id: "child", layerId: "L", parentId: "g", geometry: { kind: "rect", x: 10, y: 10, width: 5, height: 5 } },
];
out.childOfLockedLayerEditable = [...editableNodeIds({ nodes: nodes6 as any, layers: [{ id: "L" }, { id: "LK", locked: true }] }, { kind: "object", id: "child" })];
console.log(JSON.stringify(out, null, 1));
