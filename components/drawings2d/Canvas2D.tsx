"use client";
/**
 * Prancheta 2D (SVG): folha com grade, regiões (divisórias e rótulos com o estado da reserva em TEXTO e ícone), formas
 * por camada, seleção, presença de quem colabora (cursor e seleção com nome e cor) e a prévia fantasma da IA — em
 * transparência, tracejada, com o rótulo ✦ e sem interceptar o ponteiro (RF74.CA05). Arrastar move; o teclado faz o
 * mesmo pelo editor (WCAG 2.5.7). A gravação acontece só no soltar, pela sessão (que pode recusar).
 */
import { useRef, useState, type PointerEvent, type RefObject } from "react";
import { cn } from "@/components/ui";
import type { RegionLock } from "@/lib/pieces/collab";
import type { Participant } from "@/lib/drawings2d/engine";
import { drawOrder, groupBounds, layerById, regionAt, regionTree, shapeAt, shapeBounds, type Bounds, type Drawing2D, type Point, type Shape2D, type ViewState } from "@/lib/drawings2d/model";
import type { PeerPresence } from "@/lib/drawings2d/session";
import { TONE_WIDTH } from "@/lib/drawings2d/export";
import { ShapeSvg } from "./ShapeSvg";
import { PRESENCE, TONE } from "./tokens";

export interface GhostOverlay {
  id: string;
  index: number;
  shapes: readonly Shape2D[];
}

export interface Canvas2DProps {
  doc: Drawing2D;
  view: ViewState;
  locks: readonly RegionLock[];
  participants: Readonly<Record<string, Participant>>;
  meId: string;
  peers: readonly PeerPresence[];
  selection: readonly string[];
  focusRegion: string | null;
  showRegions: boolean;
  ghosts: readonly GhostOverlay[];
  /** 0..1 */
  ghostOpacity: number;
  snapToGrid: boolean;
  label: string;
  /** "Ana · até 14:05" para o rótulo da região reservada */
  lockText: (lock: RegionLock) => string;
  formatMeters: (m: number) => string;
  onPick(id: string | null, additive: boolean): void;
  onPickRegion(id: string | null): void;
  onMove(ids: readonly string[], dx: number, dy: number): void;
  onCursor(p: Point | null): void;
  svgRef?: RefObject<SVGSVGElement | null>;
}

const pad = (b: Bounds, p: number): Bounds => ({ x: b.x - p, y: b.y - p, width: b.width + p * 2, height: b.height + p * 2 });

/** Cadeado (fechado) desenhado no rótulo da região reservada — o texto ao lado diz quem e até quando. */
function LockMark({ x, y, fillClass, strokeClass }: { x: number; y: number; fillClass: string; strokeClass: string }) {
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden>
      <rect x={0} y={6} width={11} height={8} rx={1.5} className={fillClass} />
      <path d="M2.5 6 V4 a3 3 0 0 1 6 0 V6" className={cn("fill-none", strokeClass)} strokeWidth={1.6} />
    </g>
  );
}

export function Canvas2D(props: Canvas2DProps) {
  const { doc, view, locks, participants, meId, peers, selection, focusRegion, showRegions, ghosts, ghostOpacity, snapToGrid } = props;
  const localRef = useRef<SVGSVGElement | null>(null);
  const ref = props.svgRef ?? localRef;
  const [drag, setDrag] = useState<{ ids: readonly string[]; start: Point; dx: number; dy: number } | null>(null);
  const tones = new Map(doc.layers.map((l) => [l.id, l.tone]));
  const hidden = new Set(view.hiddenLayerIds);
  const selected = new Set(selection);

  const scaleOf = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || !r.width || !r.height) return { s: 1, ox: 0, oy: 0, left: 0, top: 0 };
    const s = Math.min(r.width / doc.width, r.height / doc.height);
    return { s, ox: (r.width - doc.width * s) / 2, oy: (r.height - doc.height * s) / 2, left: r.left, top: r.top };
  };
  const toDoc = (e: PointerEvent): Point => {
    const { s, ox, oy, left, top } = scaleOf();
    return { x: (e.clientX - left - ox) / s, y: (e.clientY - top - oy) / s };
  };

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const p = toDoc(e);
    const hit = shapeAt(doc, view, p, 6 / scaleOf().s);
    if (!hit) {
      props.onPick(null, e.shiftKey);
      props.onPickRegion(regionAt(doc, p));
      return;
    }
    const keep = selected.has(hit.id) && !e.shiftKey;
    props.onPick(hit.id, e.shiftKey);
    const ids = keep ? selection : e.shiftKey ? [...selection, hit.id] : [hit.id];
    if (layerById(doc, hit.layerId)?.locked) return;
    setDrag({ ids, start: p, dx: 0, dy: 0 });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* navegador sem captura de ponteiro */
    }
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const p = toDoc(e);
    props.onCursor(p);
    if (!drag) return;
    let dx = p.x - drag.start.x;
    let dy = p.y - drag.start.y;
    if (snapToGrid) {
      dx = Math.round(dx / doc.grid) * doc.grid;
      dy = Math.round(dy / doc.grid) * doc.grid;
    } else {
      dx = Math.round(dx);
      dy = Math.round(dy);
    }
    if (dx !== drag.dx || dy !== drag.dy) setDrag({ ...drag, dx, dy });
  };
  const onPointerUp = () => {
    if (drag && (drag.dx || drag.dy)) props.onMove(drag.ids, drag.dx, drag.dy);
    setDrag(null);
  };

  const dragging = new Set(drag?.ids ?? []);
  const shapes = drawOrder(doc).filter((s) => !hidden.has(s.layerId));
  const regions = regionTree(doc);
  const exactLocks = (regionId: string) => locks.filter((l) => l.regionIds.includes(regionId));

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${doc.width} ${doc.height}`}
      role="img"
      aria-label={props.label}
      className="block h-auto w-full touch-none select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDrag(null)}
      onPointerLeave={() => props.onCursor(null)}
      data-testid="canvas-2d"
    >
      <defs>
        <pattern id="drw2d-grid" width={50} height={50} patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" className="fill-none stroke-ws-border" strokeWidth={0.75} />
        </pattern>
      </defs>
      <rect x={0} y={0} width={doc.width} height={doc.height} className="fill-ws-surface-1" />
      <rect x={0} y={0} width={doc.width} height={doc.height} fill="url(#drw2d-grid)" opacity={0.7} />

      {/* regiões: divisórias, rótulos e reservas (ocultar não libera reserva, RF65.CA05) */}
      {showRegions ? (
        <g data-testid="regions-layer">
          {regions.map((r) => {
            const box = r.kind === "AREA" ? r.bounds : groupBounds(doc, r.id);
            if (!box) return null;
            const b = r.kind === "AREA" ? box : pad(box, 8);
            const held = exactLocks(r.id);
            const lock = held[0];
            const color = lock ? (participants[lock.ownerId]?.color ?? "blue") : null;
            const child = r.id.includes("/");
            return (
              <g key={r.id} data-region={r.id} data-reserved={lock ? lock.ownerId : undefined}>
                {lock && color ? <rect x={b.x} y={b.y} width={b.width} height={b.height} className={PRESENCE[color].fillSoft} opacity={0.45} /> : null}
                <rect
                  x={b.x + 1}
                  y={b.y + 1}
                  width={Math.max(0, b.width - 2)}
                  height={Math.max(0, b.height - 2)}
                  className={cn("fill-none", focusRegion === r.id ? "stroke-ws-accent" : lock && color ? PRESENCE[color].stroke : "stroke-ws-border-strong")}
                  strokeWidth={focusRegion === r.id ? 3 : 1.25}
                  strokeDasharray={child ? "4 4" : "10 6"}
                  vectorEffect="non-scaling-stroke"
                />
                <text x={b.x + (child ? 8 : 10)} y={b.y + (child ? 34 : 18)} fontSize={14} className="select-none fill-ws-text-muted font-semibold">
                  {r.name}
                  {r.kind === "GRUPO" ? " ◇" : ""}
                </text>
                {lock && color ? (
                  <g>
                    <LockMark x={b.x + (child ? 8 : 10)} y={b.y + (child ? 40 : 24)} fillClass={PRESENCE[color].fillInk} strokeClass={PRESENCE[color].strokeInk} />
                    <text x={b.x + (child ? 24 : 26)} y={b.y + (child ? 52 : 36)} fontSize={13} className={cn("select-none", PRESENCE[color].fillInk)}>
                      {props.lockText(lock)}
                      {held.length > 1 ? ` +${held.length - 1}` : ""}
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}
        </g>
      ) : null}

      {/* desenho */}
      <g data-testid="shapes-layer">
        {shapes.map((s) => {
          const tone = tones.get(s.layerId) ?? "estrutura";
          const locked = layerById(doc, s.layerId)?.locked;
          const moving = dragging.has(s.id);
          return (
            <g key={s.id} data-shape={s.id} opacity={locked ? 0.65 : 1}>
              <title>{s.name}</title>
              <ShapeSvg shape={s} strokeClass={TONE[tone].stroke} textClass={TONE[tone].fill} width={TONE_WIDTH[tone]} metersPerUnit={doc.metersPerUnit} formatMeters={props.formatMeters} dash={tone === "referencia" ? "8 6" : undefined} dx={moving ? drag!.dx : 0} dy={moving ? drag!.dy : 0} />
            </g>
          );
        })}
      </g>

      {/* seleção desta pessoa */}
      <g data-testid="selection-layer">
        {shapes.filter((s) => selected.has(s.id)).map((s) => {
          const b0 = pad(shapeBounds(s.geom), 6);
          const b = dragging.has(s.id) ? { ...b0, x: b0.x + drag!.dx, y: b0.y + drag!.dy } : b0;
          const corners: Point[] = [{ x: b.x, y: b.y }, { x: b.x + b.width, y: b.y }, { x: b.x, y: b.y + b.height }, { x: b.x + b.width, y: b.y + b.height }];
          return (
            <g key={s.id}>
              <rect x={b.x} y={b.y} width={b.width} height={b.height} className="fill-none stroke-ws-accent" strokeWidth={1.5} strokeDasharray="5 3" vectorEffect="non-scaling-stroke" />
              {corners.map((c, i) => <rect key={i} x={c.x - 3.5} y={c.y - 3.5} width={7} height={7} className="fill-ws-surface-1 stroke-ws-accent" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />)}
            </g>
          );
        })}
      </g>

      {/* prévia fantasma da IA: transparente, tracejada, com ✦ — não intercepta o ponteiro */}
      {ghosts.length ? (
        <g opacity={ghostOpacity} className="pointer-events-none" data-testid="ghost-layer" aria-hidden>
          {ghosts.map((gh) => {
            const boxes = gh.shapes.map((s) => shapeBounds(s.geom));
            const right = Math.max(...boxes.map((b) => b.x + b.width));
            const top = Math.min(...boxes.map((b) => b.y));
            return (
              <g key={gh.id} data-ghost={gh.id}>
                {gh.shapes.map((s) => (
                  <ShapeSvg key={s.id} shape={s} strokeClass="stroke-ws-ai-spark" textClass="fill-ws-ai-spark-ink" width={2.5} metersPerUnit={doc.metersPerUnit} formatMeters={props.formatMeters} dash="7 5" />
                ))}
                <g transform={`translate(${Math.min(right + 4, doc.width - 34)} ${Math.max(top - 20, 2)})`}>
                  <rect width={32} height={18} rx={9} className="fill-ws-ai-spark-soft stroke-ws-ai-spark" strokeWidth={1} />
                  <text x={16} y={13} fontSize={12} textAnchor="middle" className="select-none fill-ws-ai-spark-ink font-semibold">✦ {gh.index}</text>
                </g>
              </g>
            );
          })}
        </g>
      ) : null}

      {/* presença: seleção e cursor de cada pessoa, com nome (cor nunca sozinha) */}
      <g className="pointer-events-none" data-testid="presence-layer">
        {peers.filter((p) => p.id !== meId).map((p) => {
          const c = PRESENCE[p.color] ?? PRESENCE.blue;
          const sel = p.selection.map((id) => doc.shapes.find((s) => s.id === id)).filter((s): s is Shape2D => !!s && !hidden.has(s.layerId));
          return (
            <g key={p.id} data-peer={p.id}>
              {sel.map((s) => {
                const b = pad(shapeBounds(s.geom), 10);
                return (
                  <g key={s.id}>
                    <rect x={b.x} y={b.y} width={b.width} height={b.height} className={cn("fill-none", c.stroke)} strokeWidth={2} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
                    <text x={b.x} y={b.y - 4} fontSize={12} className={cn("select-none font-semibold", c.fillInk)}>{p.name}</text>
                  </g>
                );
              })}
              {p.cursor ? (
                <g transform={`translate(${p.cursor.x} ${p.cursor.y})`}>
                  <path d="M0 0 L0 20 L5.5 14.5 L9.5 23.5 L13 22 L9 13 L16 13 Z" className={cn(c.fill, "stroke-ws-surface-1")} strokeWidth={1.5} />
                  <rect x={14} y={18} width={p.name.length * 7.4 + 14} height={20} rx={10} className={cn(c.fillSoft, c.stroke)} strokeWidth={1} />
                  <text x={21} y={32} fontSize={12.5} className={cn("select-none font-semibold", c.fillInk)}>{p.name}</text>
                </g>
              ) : null}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
