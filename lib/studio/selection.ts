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
        pointInPolygon(point, geometry.points) ||
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
  const hiddenLayers = new Set(scene.layers.filter((layer) => layer.visible === false).map((layer) => layer.id));
  const node = [...scene.nodes].reverse().find((candidate) =>
    !hiddenLayers.has(candidate.layerId) && hitTest(candidate.geometry, point, tolerance),
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

export function selectedNodeIds(scene: DrawingScene, selection: Selection): Set<string> {
  const visibleLayers = new Set(scene.layers.filter((layer) => layer.visible !== false).map((layer) => layer.id));
  const nodesById = new Map(scene.nodes.map((node) => [node.id, node]));

  switch (selection.kind) {
    case "none":
      return new Set();
    case "object":
      return descendantsOf(nodesById, [selection.id]);
    case "objects":
      return descendantsOf(nodesById, selection.ids);
    case "layer":
      return new Set(scene.nodes.filter((node) => node.layerId === selection.id).map((node) => node.id));
    case "region":
      return new Set(scene.nodes
        .filter((node) => selection.layerId === undefined || node.layerId === selection.layerId)
        .filter((node) => geometryIntersects(node.geometry, selection.geometry))
        .map((node) => node.id));
    case "bounds": {
      const polygon = boundsToPolygon(selection.bounds);
      return new Set(scene.nodes
        .filter((node) => selectionMatches(node.geometry, polygon, selection.mode ?? "crossing"))
        .map((node) => node.id));
    }
    case "polygon":
      if (selection.points.length < 3 || selection.points.some((point) => !isFinitePoint(point))) return new Set();
      return new Set(scene.nodes
        .filter((node) => selectionMatches(node.geometry, selection.points, selection.mode ?? "crossing"))
        .map((node) => node.id));
  }
}

export function editableNodeIds(scene: DrawingScene, selection: Selection): Set<string> {
  const selected = selectedNodeIds(scene, selection);
  const nodesById = new Map(scene.nodes.map((node) => [node.id, node]));
  const layersById = new Map(scene.layers.map((layer) => [layer.id, layer]));

  return new Set([...selected].filter((id) => {
    const node = nodesById.get(id);
    if (!node || !isVisible(node, nodesById, layersById)) return false;

    let current: DrawingNode | undefined = node;
    while (current) {
      if (current.locked || layersById.get(current.layerId)?.locked) return false;
      current = current.parentId ? nodesById.get(current.parentId) : undefined;
    }

    return !(scene.lockedRegions ?? []).some((region) =>
      (region.layerId === undefined || region.layerId === node.layerId) &&
      geometryIntersects(node.geometry, region.geometry),
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

function isVisible(
  node: DrawingNode,
  nodes: Map<string, DrawingNode>,
  layers: Map<string, DrawingLayer>,
): boolean {
  if (layers.get(node.layerId)?.visible === false) return false;
  let current = node;
  while (current.parentId) {
    const parent = nodes.get(current.parentId);
    if (!parent || layers.get(parent.layerId)?.visible === false) return false;
    current = parent;
  }
  return true;
}

function descendantsOf(nodes: Map<string, DrawingNode>, roots: string[]): Set<string> {
  const selected = new Set<string>();
  const queue = roots.filter((id) => nodes.has(id));
  while (queue.length) {
    const id = queue.shift()!;
    if (selected.has(id)) continue;
    selected.add(id);
    for (const node of nodes.values()) {
      if (node.parentId === id) queue.push(node.id);
    }
  }
  return selected;
}

function selectionMatches(
  geometry: Geometry,
  polygon: Point[],
  mode: "crossing" | "contained",
): boolean {
  const shape = geometryPoints(geometry);
  if (shape.length === 0) return false;
  if (mode === "contained") return shape.every((point) => pointInPolygon(point, polygon));
  if (shape.some((point) => pointInPolygon(point, polygon))) return true;
  if (polygon.some((point) => hitTest(geometry, point, 0))) return true;
  return polylinesIntersect(shape, isClosed(geometry), polygon, true);
}

function geometryIntersects(left: Geometry, right: Geometry): boolean {
  const polygon = geometryPoints(right);
  return polygon.length >= 3 && selectionMatches(left, polygon, "crossing");
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

function polylinesIntersect(
  first: Point[],
  closeFirst: boolean,
  second: Point[],
  closeSecond: boolean,
): boolean {
  const firstEdges = closeFirst ? first.length : first.length - 1;
  const secondEdges = closeSecond ? second.length : second.length - 1;
  for (let a = 0; a < firstEdges; a += 1) {
    const a1 = first[a];
    const a2 = first[(a + 1) % first.length];
    if (!a1 || !a2) continue;
    for (let b = 0; b < secondEdges; b += 1) {
      const b1 = second[b];
      const b2 = second[(b + 1) % second.length];
      if (b1 && b2 && segmentsIntersect(a1, a2, b1, b2)) return true;
    }
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

function onSegment(a: Point, b: Point, point: Point): boolean {
  return point.x >= Math.min(a.x, b.x) - EPSILON &&
    point.x <= Math.max(a.x, b.x) + EPSILON &&
    point.y >= Math.min(a.y, b.y) - EPSILON &&
    point.y <= Math.max(a.y, b.y) + EPSILON;
}

function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    if (!currentPoint || !previousPoint) continue;
    if (distanceToSegment(point, previousPoint, currentPoint) <= EPSILON) return true;
    const crosses = (currentPoint.y > point.y) !== (previousPoint.y > point.y) &&
      point.x < ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
        (previousPoint.y - currentPoint.y) + currentPoint.x;
    if (crosses) inside = !inside;
  }
  return inside;
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
  return geometry.kind === "polygon" || (geometry.kind === "path" && geometry.closed === true);
}

function isFinitePoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}
