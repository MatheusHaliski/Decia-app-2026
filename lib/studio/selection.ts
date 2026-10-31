export type Point = { x: number; y: number };
export type Bounds = { x: number; y: number; width: number; height: number };

export type Geometry =
  | ({ kind: "rect" } & Bounds)
  | { kind: "circle"; cx: number; cy: number; radius: number }
  | { kind: "segment"; start: Point; end: Point }
  | { kind: "polygon"; points: Point[] }
  | { kind: "path"; points: Point[]; closed?: boolean };

export type DrawingNode = {
  id: string;
  layerId: string;
  parentId?: string;
  geometry: Geometry;
  locked?: boolean;
};

export type DrawingLayer = { id: string; visible?: boolean; locked?: boolean };

export type DrawingScene = {
  nodes: DrawingNode[];
  layers: DrawingLayer[];
  lockedRegions?: Array<{ geometry: Geometry; layerId?: string }>;
};

export type Selection =
  | { kind: "none" }
  | { kind: "object"; id: string }
  | { kind: "objects"; ids: string[] }
  | { kind: "layer"; id: string }
  | { kind: "region"; geometry: Geometry; layerId?: string }
  | { kind: "bounds"; bounds: Bounds; mode?: "crossing" | "contained" }
  | { kind: "polygon"; points: Point[]; mode?: "crossing" | "contained" };

const EPSILON = 1e-9;

export function geometryBounds(geometry: Geometry): Bounds {
  switch (geometry.kind) {
    case "rect":
      return normalizedBounds(geometry);
    case "circle":
      if (!Number.isFinite(geometry.radius) || geometry.radius < 0 || !Number.isFinite(geometry.cx) || !Number.isFinite(geometry.cy)) {
        return { x: 0, y: 0, width: 0, height: 0 };
      }
      return {
        x: geometry.cx - geometry.radius,
        y: geometry.cy - geometry.radius,
        width: geometry.radius * 2,
        height: geometry.radius * 2,
      };
    case "segment":
      return boundsFromPoints([geometry.start, geometry.end]);
    case "polygon":
    case "path":
      return boundsFromPoints(geometry.points);
  }
}

export function hitTest(
  geometry: Geometry,
  point: Point,
  tolerance = 6,
): boolean {
  if (!isFinitePoint(point) || !Number.isFinite(tolerance) || tolerance < 0) return false;

  switch (geometry.kind) {
    case "rect": {
      const bounds = normalizedBounds(geometry);
      return containsPoint(expandBounds(bounds, tolerance), point);
    }
    case "circle": {
      if (!Number.isFinite(geometry.radius) || geometry.radius < 0) return false;
      return distance(point, { x: geometry.cx, y: geometry.cy }) <= geometry.radius + tolerance;
    }
    case "segment":
      return distanceToSegment(point, geometry.start, geometry.end) <= tolerance;
    case "polygon":
      return geometry.points.length >= 3 && (
        pointInPolygonSimple(point, geometry.points) ||
        pathHitTest(geometry.points, point, tolerance, true)
      );
    case "path":
      return pathHitTest(geometry.points, point, tolerance, geometry.closed === true);
  }
}

export function selectAtPoint(
  scene: DrawingScene,
  point: Point,
  tolerance = 6,
): Selection {
  const nodesById = new Map(scene.nodes.map((node) => [node.id, node]));
  const layersById = new Map(scene.layers.map((layer) => [layer.id, layer]));
  const visibility = visibilityMap(scene.nodes, nodesById, layersById);
  // Ancestral em camada oculta também esconde o filho: clicar não pode escolher o que não está na tela.
  const node = [...scene.nodes].reverse().find((candidate) =>
    visibility.get(candidate.id) === true && hitTest(candidate.geometry, point, tolerance),
  );
  return node ? { kind: "object", id: node.id } : { kind: "none" };
}

export function selectInBounds(
  scene: DrawingScene,
  bounds: Bounds,
  mode: "crossing" | "contained" = "crossing",
): Selection {
  return { kind: "bounds", bounds: normalizedBounds(bounds), mode };
}

export function selectInPolygon(
  scene: DrawingScene,
  points: Point[],
  mode: "crossing" | "contained" = "crossing",
): Selection {
  return { kind: "polygon", points, mode };
}

/**
 * Seleção explícita (objeto, objetos, camada) devolve o que foi nomeado; seleção espacial (região, retângulo,
 * laço) só alcança o que está visível, para que a contagem exibida corresponda ao que o usuário vê.
 * A edição continua passando por `editableNodeIds`, que também exclui ocultos e travados.
 */
export function selectedNodeIds(scene: DrawingScene, selection: Selection): Set<string> {
  const nodesById = new Map(scene.nodes.map((node) => [node.id, node]));
  const layersById = new Map(scene.layers.map((layer) => [layer.id, layer]));
  const visibility = visibilityMap(scene.nodes, nodesById, layersById);
  const visibleNodes = scene.nodes.filter((node) => visibility.get(node.id) === true);

  switch (selection.kind) {
    case "none":
      return new Set();
    case "object":
      return descendantsOf(scene.nodes, nodesById, [selection.id]);
    case "objects":
      return descendantsOf(scene.nodes, nodesById, selection.ids);
    case "layer":
      return new Set(scene.nodes.filter((node) => node.layerId === selection.id).map((node) => node.id));
    case "region": {
      const region = preparePolygon(geometryPoints(selection.geometry));
      if (!region) return new Set();
      return new Set(visibleNodes
        .filter((node) => selection.layerId === undefined || node.layerId === selection.layerId)
        .filter((node) => selectionMatches(node.geometry, region, "crossing"))
        .map((node) => node.id));
    }
    case "bounds": {
      const polygon = preparePolygon(boundsToPolygon(selection.bounds), true);
      if (!polygon) return new Set();
      return new Set(visibleNodes
        .filter((node) => selectionMatches(node.geometry, polygon, selection.mode ?? "crossing"))
        .map((node) => node.id));
    }
    case "polygon": {
      if (selection.points.length < 3 || selection.points.some((point) => !isFinitePoint(point))) return new Set();
      const polygon = preparePolygon(selection.points);
      if (!polygon) return new Set();
      return new Set(visibleNodes
        .filter((node) => selectionMatches(node.geometry, polygon, selection.mode ?? "crossing"))
        .map((node) => node.id));
    }
  }
}

export function editableNodeIds(scene: DrawingScene, selection: Selection): Set<string> {
  const selected = selectedNodeIds(scene, selection);
  const nodesById = new Map(scene.nodes.map((node) => [node.id, node]));
  const layersById = new Map(scene.layers.map((layer) => [layer.id, layer]));
  const visibility = visibilityMap(scene.nodes, nodesById, layersById);
  const lockedRegions = (scene.lockedRegions ?? [])
    .map((region) => ({ layerId: region.layerId, polygon: preparePolygon(geometryPoints(region.geometry)) }))
    .filter((region): region is { layerId: string | undefined; polygon: PreparedPolygon } => region.polygon !== null);

  return new Set([...selected].filter((id) => {
    const node = nodesById.get(id);
    if (!node || visibility.get(id) !== true) return false;

    // ancestral travado (objeto ou camada) trava o filho; ciclo de grupos é dado corrompido e não se edita
    const seen = new Set<string>();
    let current: DrawingNode | undefined = node;
    while (current) {
      if (seen.has(current.id)) return false;
      seen.add(current.id);
      if (current.locked || layersById.get(current.layerId)?.locked) return false;
      current = current.parentId ? nodesById.get(current.parentId) : undefined;
    }

    return !lockedRegions.some((region) =>
      (region.layerId === undefined || region.layerId === node.layerId) &&
      selectionMatches(node.geometry, region.polygon, "crossing"),
    );
  }));
}

export function snapPoint(point: Point, gridSize: number, enabled: boolean): Point {
  if (!enabled || !Number.isFinite(gridSize) || gridSize <= 0 || !isFinitePoint(point)) {
    return { ...point };
  }
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

/**
 * Visível = a camada do objeto e as de todos os ancestrais estão visíveis. Calculado uma vez por cena (memorizado); um ciclo de
 * grupos (A dentro de B dentro de A, dado corrompido) deixa os envolvidos invisíveis em vez de travar a tela num laço infinito.
 */
function visibilityMap(
  nodes: readonly DrawingNode[],
  nodesById: Map<string, DrawingNode>,
  layers: Map<string, DrawingLayer>,
): Map<string, boolean> {
  const result = new Map<string, boolean>();
  for (const start of nodes) {
    if (result.has(start.id)) continue;
    const chain: string[] = [];
    const onChain = new Set<string>();
    let current: DrawingNode | undefined = start;
    let verdict = false;
    for (;;) {
      if (!current) break; // pai inexistente: não se exibe
      const known = result.get(current.id);
      if (known !== undefined) {
        verdict = known;
        break;
      }
      if (onChain.has(current.id)) break; // ciclo
      chain.push(current.id);
      onChain.add(current.id);
      if (layers.get(current.layerId)?.visible === false) break;
      if (!current.parentId) {
        verdict = true;
        break;
      }
      current = nodesById.get(current.parentId);
    }
    for (const id of chain) result.set(id, verdict);
  }
  return result;
}

/** O nomeado e toda a sua descendência, com um índice de filhos (linear no tamanho da cena, mesmo com grupos enormes). */
function descendantsOf(nodes: readonly DrawingNode[], byId: Map<string, DrawingNode>, roots: string[]): Set<string> {
  const children = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const list = children.get(node.parentId);
    if (list) list.push(node.id);
    else children.set(node.parentId, [node.id]);
  }
  const selected = new Set<string>();
  const stack = roots.filter((id) => byId.has(id));
  while (stack.length) {
    const id = stack.pop()!;
    if (selected.has(id)) continue;
    selected.add(id);
    for (const child of children.get(id) ?? []) stack.push(child);
  }
  return selected;
}

/**
 * "contained": todos os vértices dentro do polígono E nenhuma aresta da forma cruzando a borda — num laço côncavo (em U) uma linha
 * pode ter as duas pontas dentro e passar pelo vão, fora da área laçada. "crossing": algum vértice dentro, algum vértice do laço
 * sobre a forma ou alguma aresta cruzando. A caixa envolvente descarta antes os objetos longe da seleção.
 */
function selectionMatches(
  geometry: Geometry,
  polygon: PreparedPolygon,
  mode: "crossing" | "contained",
): boolean {
  const shape = geometryPoints(geometry);
  if (shape.length === 0) return false;
  const box = boundsFromPoints(shape);
  if (!boxesOverlap(box, polygon.bounds)) return false;
  const closed = isClosed(geometry);
  if (mode === "contained") {
    if (!boxInside(box, polygon.bounds)) return false;
    return shape.every((point) => pointInPrepared(point, polygon)) && !edgesCross(shape, closed, polygon, true);
  }
  if (shape.some((point) => pointInPrepared(point, polygon))) return true;
  if (polygon.points.some((point) => containsPoint(box, point) && hitTest(geometry, point, 0))) return true;
  return edgesCross(shape, closed, polygon, false);
}

/**
 * Polígono de seleção pronto para consultas repetidas: caixa envolvente e arestas distribuídas em faixas horizontais, de modo que o
 * teste de ponto e o de cruzamento só olham as arestas da faixa do ponto (antes: todas as arestas, para cada vértice de cada forma).
 * Polígono sem área (pontos alinhados ou repetidos) não seleciona nada.
 */
type PreparedPolygon = {
  points: Point[];
  bounds: Bounds;
  strips: number[][];
  stripHeight: number;
  marks: Int32Array;
  stamp: { value: number };
};

function preparePolygon(points: Point[], allowZeroArea = false): PreparedPolygon | null {
  const valid = points.filter(isFinitePoint);
  if (valid.length < 3) return null;
  const bounds = boundsFromPoints(valid);
  const scale = Math.max(bounds.width, bounds.height, 1);
  if (!allowZeroArea && Math.abs(signedArea(valid)) <= EPSILON * scale * scale) return null;
  const stripCount = Math.max(1, Math.min(512, Math.ceil(Math.sqrt(valid.length)) * 2));
  const stripHeight = bounds.height > 0 ? bounds.height / stripCount : 1;
  const strips: number[][] = Array.from({ length: stripCount }, () => []);
  for (let index = 0; index < valid.length; index += 1) {
    const a = valid[index]!;
    const b = valid[(index + 1) % valid.length]!;
    const first = stripOf(Math.min(a.y, b.y), bounds.y, stripHeight, stripCount);
    const last = stripOf(Math.max(a.y, b.y), bounds.y, stripHeight, stripCount);
    for (let strip = first; strip <= last; strip += 1) strips[strip]!.push(index);
  }
  return { points: valid, bounds, strips, stripHeight, marks: new Int32Array(valid.length), stamp: { value: 0 } };
}

function stripOf(y: number, top: number, height: number, count: number): number {
  return Math.max(0, Math.min(count - 1, Math.floor((y - top) / height)));
}

function signedArea(points: Point[]): number {
  let twice = 0;
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index]!;
    const b = points[(index + 1) % points.length]!;
    twice += a.x * b.y - b.x * a.y;
  }
  return twice / 2;
}

function pointInPrepared(point: Point, polygon: PreparedPolygon): boolean {
  const { bounds, points } = polygon;
  if (point.x < bounds.x - EPSILON || point.x > bounds.x + bounds.width + EPSILON ||
    point.y < bounds.y - EPSILON || point.y > bounds.y + bounds.height + EPSILON) return false;
  let inside = false;
  for (const index of polygon.strips[stripOf(point.y, bounds.y, polygon.stripHeight, polygon.strips.length)]!) {
    const previousPoint = points[index]!;
    const currentPoint = points[(index + 1) % points.length]!;
    if (distanceToSegment(point, previousPoint, currentPoint) <= EPSILON) return true;
    const crosses = (currentPoint.y > point.y) !== (previousPoint.y > point.y) &&
      point.x < ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
        (previousPoint.y - currentPoint.y) + currentPoint.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** Alguma aresta da forma cruza alguma aresta do polígono? `strict` = só cruzamento próprio (encostar na borda não conta). */
function edgesCross(shape: Point[], closed: boolean, polygon: PreparedPolygon, strict: boolean): boolean {
  const edges = closed ? shape.length : shape.length - 1;
  const { bounds, points, strips, stripHeight, marks, stamp } = polygon;
  for (let index = 0; index < edges; index += 1) {
    const a = shape[index]!;
    const b = shape[(index + 1) % shape.length]!;
    const top = Math.min(a.y, b.y);
    const bottom = Math.max(a.y, b.y);
    if (bottom < bounds.y - EPSILON || top > bounds.y + bounds.height + EPSILON ||
      Math.max(a.x, b.x) < bounds.x - EPSILON || Math.min(a.x, b.x) > bounds.x + bounds.width + EPSILON) continue;
    stamp.value += 1;
    const first = stripOf(top, bounds.y, stripHeight, strips.length);
    const last = stripOf(bottom, bounds.y, stripHeight, strips.length);
    for (let strip = first; strip <= last; strip += 1) {
      for (const edge of strips[strip]!) {
        if (marks[edge] === stamp.value) continue;
        marks[edge] = stamp.value;
        const c = points[edge]!;
        const d = points[(edge + 1) % points.length]!;
        if (strict ? segmentsCrossProperly(a, b, c, d) : segmentsIntersect(a, b, c, d)) return true;
      }
    }
  }
  return false;
}

function geometryPoints(geometry: Geometry): Point[] {
  switch (geometry.kind) {
    case "rect": {
      const bounds = normalizedBounds(geometry);
      return boundsToPolygon(bounds);
    }
    case "circle":
      if (!Number.isFinite(geometry.radius) || geometry.radius < 0) return [];
      return Array.from({ length: 32 }, (_, index) => {
        const angle = (index / 32) * Math.PI * 2;
        return { x: geometry.cx + Math.cos(angle) * geometry.radius, y: geometry.cy + Math.sin(angle) * geometry.radius };
      });
    case "segment":
      return [geometry.start, geometry.end];
    case "polygon":
    case "path":
      return geometry.points.filter(isFinitePoint);
  }
}

function pathHitTest(points: Point[], point: Point, tolerance: number, closed: boolean): boolean {
  if (points.length < 2) return false;
  const edges = closed ? points.length : points.length - 1;
  for (let index = 0; index < edges; index += 1) {
    const start = points[index];
    const end = points[(index + 1) % points.length];
    if (start && end && distanceToSegment(point, start, end) <= tolerance) return true;
  }
  return false;
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const orient = (p: Point, q: Point, r: Point) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  return (o1 === 0 && onSegment(a, b, c)) ||
    (o2 === 0 && onSegment(a, b, d)) ||
    (o3 === 0 && onSegment(c, d, a)) ||
    (o4 === 0 && onSegment(c, d, b)) ||
    ((o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0));
}

/** Cruzamento próprio: cada segmento tem uma ponta de cada lado do outro (tocar ou ser colinear não conta). */
function segmentsCrossProperly(a: Point, b: Point, c: Point, d: Point): boolean {
  const orient = (p: Point, q: Point, r: Point) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const scale = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y), Math.abs(d.x - c.x), Math.abs(d.y - c.y), 1);
  const tolerance = EPSILON * scale * scale;
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  return ((o1 > tolerance && o2 < -tolerance) || (o1 < -tolerance && o2 > tolerance)) &&
    ((o3 > tolerance && o4 < -tolerance) || (o3 < -tolerance && o4 > tolerance));
}

function onSegment(a: Point, b: Point, point: Point): boolean {
  return point.x >= Math.min(a.x, b.x) - EPSILON &&
    point.x <= Math.max(a.x, b.x) + EPSILON &&
    point.y >= Math.min(a.y, b.y) - EPSILON &&
    point.y <= Math.max(a.y, b.y) + EPSILON;
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return distance(point, start);
  const ratio = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return distance(point, { x: start.x + ratio * dx, y: start.y + ratio * dy });
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function containsPoint(bounds: Bounds, point: Point): boolean {
  return point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y && point.y <= bounds.y + bounds.height;
}

function expandBounds(bounds: Bounds, amount: number): Bounds {
  return { x: bounds.x - amount, y: bounds.y - amount, width: bounds.width + amount * 2, height: bounds.height + amount * 2 };
}

function boundsFromPoints(points: Point[]): Bounds {
  const valid = points.filter(isFinitePoint);
  if (valid.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const xs = valid.map((point) => point.x);
  const ys = valid.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

function normalizedBounds(bounds: Bounds): Bounds {
  const x2 = bounds.x + bounds.width;
  const y2 = bounds.y + bounds.height;
  return { x: Math.min(bounds.x, x2), y: Math.min(bounds.y, y2), width: Math.abs(bounds.width), height: Math.abs(bounds.height) };
}

function boundsToPolygon(bounds: Bounds): Point[] {
  const normalized = normalizedBounds(bounds);
  return [
    { x: normalized.x, y: normalized.y },
    { x: normalized.x + normalized.width, y: normalized.y },
    { x: normalized.x + normalized.width, y: normalized.y + normalized.height },
    { x: normalized.x, y: normalized.y + normalized.height },
  ];
}

function isClosed(geometry: Geometry): boolean {
  return geometry.kind === "polygon" || geometry.kind === "rect" || geometry.kind === "circle" ||
    (geometry.kind === "path" && geometry.closed === true);
}

function boxesOverlap(a: Bounds, b: Bounds): boolean {
  return a.x <= b.x + b.width + EPSILON && b.x <= a.x + a.width + EPSILON &&
    a.y <= b.y + b.height + EPSILON && b.y <= a.y + a.height + EPSILON;
}

function boxInside(inner: Bounds, outer: Bounds): boolean {
  return inner.x >= outer.x - EPSILON && inner.y >= outer.y - EPSILON &&
    inner.x + inner.width <= outer.x + outer.width + EPSILON && inner.y + inner.height <= outer.y + outer.height + EPSILON;
}

/** Ponto em polígono para o clique (polígono da própria forma, consultado uma vez). Par-ímpar; sobre a borda conta como dentro. */
function pointInPolygonSimple(point: Point, polygon: Point[]): boolean {
  const valid = polygon.filter(isFinitePoint);
  if (valid.length < 3) return false;
  let inside = false;
  for (let index = 0, previous = valid.length - 1; index < valid.length; previous = index, index += 1) {
    const currentPoint = valid[index]!;
    const previousPoint = valid[previous]!;
    if (distanceToSegment(point, previousPoint, currentPoint) <= EPSILON) return true;
    const crosses = (currentPoint.y > point.y) !== (previousPoint.y > point.y) &&
      point.x < ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
        (previousPoint.y - currentPoint.y) + currentPoint.x;
    if (crosses) inside = !inside;
  }
  return inside;
}


function isFinitePoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}
