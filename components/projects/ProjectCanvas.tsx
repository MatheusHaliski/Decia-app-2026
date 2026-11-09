"use client";
/**
 * Canvas CONECTADO da Mesa (RF22.CA03): não é um quadro branco solto — as zonas dão significado ao que se faz nelas, e cada gesto
 * vira um comando sobre o MESMO modelo das outras áreas:
 *  • Project Model Canvas (Finocchio): post-it criado/solto num bloco vira o dado da área (Requisitos → rastreabilidade,
 *    Partes interessadas → mapa poder × interesse, Entregas → EAP, Riscos → registro com VME, demais blocos → TAP/business case);
 *  • faixas de fase: cartão de atividade solto noutra faixa muda de fase (quadro); ligar dois cartões cria dependência (CPM);
 *  • ligações: requisito ↔ entrega (rastreabilidade), entrega ↔ atividade (EAP), risco ↔ atividade, parte interessada ↔ requisito.
 * Depois de cada edição estrutural, a faixa "Efeito" diz o que mudou e onde (quadro, linha do tempo, escopo…).
 * Teclado: Tab percorre os itens; setas movem (Shift = passo maior); Enter abre o inspetor; L inicia uma ligação; Delete apaga post-it.
 */
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Badge, Button, Checkbox, Dialog, Field, Input, Select, Tag, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { ITEM_SIZE, gridSlot, refId, refKind, zoneAt, type Rect, type Zone } from "@/lib/projects/canvas";
import type { CommandResult, ProjectCommand } from "@/lib/projects/commands";
import { emv } from "@/lib/projects/engine/methods";
import { PHASE_META, PMC_LAYOUT, PMC_TARGET, type PmcBlock } from "@/lib/projects/lifecycle";
import type { WorkspaceTab } from "@/lib/projects/metrics";
import type { CanvasNote, CanvasRef } from "@/lib/projects/types";
import { canvasView, type CanvasEdge, type CanvasEdgeKind, type CanvasItemView } from "@/lib/projects/views";
import { CommitText, versionSummary } from "./common";
import { TaskInspector } from "./TaskInspector";
import { fmt, type PanelProps } from "./shared";

const EDGE_KINDS: readonly CanvasEdgeKind[] = ["DEPENDENCIA", "RASTREABILIDADE", "EAP", "RISCO", "ORIGEM"];
const EDGE_CLASS: Record<CanvasEdgeKind, string> = {
  DEPENDENCIA: "stroke-ws-text-muted",
  RASTREABILIDADE: "stroke-ws-info",
  EAP: "stroke-ws-success",
  RISCO: "stroke-ws-node-red",
  ORIGEM: "stroke-ws-warning",
};
const EDGE_DASH: Record<CanvasEdgeKind, string | undefined> = { DEPENDENCIA: undefined, RASTREABILIDADE: "7 4", EAP: "2 4", RISCO: "9 3 2 3", ORIGEM: "4 4" };
const NOTE_FILL: Record<NonNullable<CanvasNote["color"]>, string> = { AMARELO: "fill-ws-warning-soft", AZUL: "fill-ws-info-soft", VERDE: "fill-ws-success-soft", ROSA: "fill-ws-danger-soft" };
const ITEM_FILL: Record<Exclude<CanvasItemView["kind"], "NOTE">, string> = {
  TASK: "fill-ws-surface-1",
  WBS: "fill-ws-node-green-soft",
  REQ: "fill-ws-node-blue-soft",
  RISK: "fill-ws-node-red-soft",
  STK: "fill-ws-node-yellow-soft",
};
/** Pares que se ligam no canvas (o núcleo valida de novo; aqui só para oferecer as opções certas). */
const LINKABLE: Record<string, readonly string[]> = { TASK: ["TASK", "WBS", "RISK"], WBS: ["REQ", "TASK"], REQ: ["WBS", "STK"], RISK: ["TASK"], STK: ["REQ"], NOTE: [] };

/** Onde o efeito de uma edição do canvas aparece (para a faixa "Efeito" e os atalhos). */
function affectedTabs(key: string | undefined, vars?: Record<string, string | number>): WorkspaceTab[] {
  switch (key) {
    case "taskCreated": case "taskPhase": case "taskDeleted": return ["quadro", "cronograma"];
    case "depAdded": case "depRemoved": case "depUpdated": return ["cronograma", "quadro"];
    case "reqAdded": case "reqLinked": case "reqUnlinked": case "reqUpdated": case "wbsAdded": case "wbsLinked": case "wbsUnlinked": return ["escopo"];
    case "stkAdded": case "riskAdded": case "riskLinked": case "riskUnlinked": return ["riscos"];
    case "charterListAdded": case "charterUpdated": case "businessCaseUpdated": return ["iniciacao"];
    case "budgetLineAdded": return ["governanca"];
    case "noteConverted": {
      const target = String(vars?.target ?? "");
      if (target in PHASE_META) return ["quadro", "cronograma"];
      const t = PMC_TARGET[target as PmcBlock];
      return t === "REQ" || t === "WBS" ? ["escopo"] : t === "STK" || t === "RISK" ? ["riscos"] : target === "CUSTOS" ? ["governanca"] : ["iniciacao"];
    }
    default: return [];
  }
}

function borderPoint(r: Rect, tx: number, ty: number) {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  if (!dx && !dy) return { x: cx, y: cy };
  const s = Math.min((r.w / 2) / Math.abs(dx || 1e-9), (r.h / 2) / Math.abs(dy || 1e-9));
  return { x: cx + dx * s, y: cy + dy * s };
}

const wrap = (text: string, max: number, lines: number): string[] => {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur ? cur.length + 1 : 0) + w.length > max) {
      out.push(cur);
      cur = w;
      if (out.length === lines) break;
    } else cur = cur ? `${cur} ${w}` : w;
  }
  if (out.length < lines && cur) out.push(cur);
  if (out.length === lines && words.join(" ").length > out.join(" ").length) out[lines - 1] = `${out[lines - 1]!.slice(0, max - 1)}…`;
  return out.slice(0, lines);
};

type Tool = "select" | "connect";

export function ProjectCanvas(props: PanelProps) {
  const { model, dispatch, readOnly, selected, onSelect, goTo } = props;
  const { t } = useI18n();
  const view = useMemo(() => canvasView(model), [model]);
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(0.55);
  const [tool, setTool] = useState<Tool>("select");
  const [connectFrom, setConnectFrom] = useState<CanvasRef | null>(null);
  const [drag, setDrag] = useState<{ ref: CanvasRef; x: number; y: number; ox: number; oy: number; px: number; py: number; moved: boolean } | null>(null);
  const [createAt, setCreateAt] = useState<{ x: number; y: number } | null>(null);
  const [effect, setEffect] = useState<{ key?: string; vars?: Record<string, string | number> } | null>(null);
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [edgeSel, setEdgeSel] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<CanvasEdgeKind>>(new Set());

  const run = (cmd: ProjectCommand): CommandResult => {
    const r = dispatch(cmd);
    if (r.ok && r.structural) setEffect({ key: r.versionKey, vars: r.vars });
    if (r.ok && r.createdRef) onSelect?.(r.createdRef);
    return r;
  };

  const items = view.items.map((it) => (drag && drag.ref === it.ref ? { ...it, rect: { ...it.rect, x: drag.x, y: drag.y } } : it));
  const rectOf = new Map(items.map((i) => [i.ref, i.rect]));
  const itemOf = new Map(items.map((i) => [i.ref, i]));
  const sel = selected && itemOf.has(selected) ? itemOf.get(selected)! : null;

  const toCanvas = (clientX: number, clientY: number) => {
    const box = svgRef.current?.getBoundingClientRect();
    return box ? { x: (clientX - box.left) / zoom, y: (clientY - box.top) / zoom } : { x: 0, y: 0 };
  };

  const pick = (ref: CanvasRef) => {
    setEdgeSel(null);
    if (tool === "connect" || connectFrom) {
      if (!connectFrom) {
        setConnectFrom(ref);
        onSelect?.(ref);
        return;
      }
      if (connectFrom !== ref) run({ type: "CANVAS_CONNECT", from: connectFrom, to: ref });
      setConnectFrom(null);
      setTool("select");
      return;
    }
    onSelect?.(ref);
  };

  const onItemPointerDown = (e: ReactPointerEvent<SVGGElement>, it: CanvasItemView) => {
    if (readOnly || tool !== "select" || e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDrag({ ref: it.ref, x: it.rect.x, y: it.rect.y, ox: it.rect.x, oy: it.rect.y, px: e.clientX, py: e.clientY, moved: false });
  };
  const onItemPointerMove = (e: ReactPointerEvent<SVGGElement>) => {
    if (!drag) return;
    const dx = (e.clientX - drag.px) / zoom;
    const dy = (e.clientY - drag.py) / zoom;
    const moved = drag.moved || Math.abs(dx) + Math.abs(dy) > 3;
    setDrag({ ...drag, x: Math.max(0, drag.ox + dx), y: Math.max(0, drag.oy + dy), moved });
  };
  const onItemPointerUp = (e: ReactPointerEvent<SVGGElement>, it: CanvasItemView) => {
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    const d = drag;
    setDrag(null);
    if (d?.moved) run({ type: "CANVAS_MOVE", ref: it.ref, x: Math.round(d.x), y: Math.round(d.y) });
    else pick(it.ref);
  };

  const nudge = (it: CanvasItemView, dx: number, dy: number) => run({ type: "CANVAS_MOVE", ref: it.ref, x: Math.max(0, it.rect.x + dx), y: Math.max(0, it.rect.y + dy) });

  const tabsOfEffect = effect ? affectedTabs(effect.key, effect.vars) : [];
  const zoneLabel = (z: Zone) => (z.kind === "PHASE" ? t(`pm.phase.${z.phase}`) : t(`pm.pmcBlock.${z.block}`));

  return (
    <div className="grid gap-[var(--ws-space-3)]">
      {/* barra de ferramentas */}
      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label={t("pm.canvas.toolbar")}>
        <Button size="sm" variant={tool === "select" && !connectFrom ? "primary" : "default"} aria-pressed={tool === "select" && !connectFrom} onClick={() => { setTool("select"); setConnectFrom(null); }}>{t("pm.canvas.tool.select")}</Button>
        <Button size="sm" variant={tool === "connect" || connectFrom ? "primary" : "default"} aria-pressed={tool === "connect" || Boolean(connectFrom)} disabled={readOnly} onClick={() => { setTool("connect"); setConnectFrom(null); }}>{t("pm.canvas.tool.connect")}</Button>
        <Button size="sm" disabled={readOnly} onClick={() => setCreateAt({ x: 40, y: view.lanesTop + 40 + view.laneHeight + 60 })}>{t("pm.canvas.tool.note")}</Button>
        <span className="mx-1 h-6 w-px bg-ws-border" aria-hidden />
        <Button size="sm" variant="ghost" aria-label={t("pm.canvas.zoomOut")} onClick={() => setZoom((z) => Math.max(0.3, Math.round((z - 0.1) * 100) / 100))}>−</Button>
        <span className="min-w-12 text-center font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] tabular-nums" aria-live="polite">{Math.round(zoom * 100)}%</span>
        <Button size="sm" variant="ghost" aria-label={t("pm.canvas.zoomIn")} onClick={() => setZoom((z) => Math.min(1.5, Math.round((z + 0.1) * 100) / 100))}>+</Button>
        <Button size="sm" variant="ghost" onClick={() => {
          const w = svgRef.current?.parentElement?.clientWidth;
          if (w) setZoom(Math.max(0.3, Math.min(1.5, Math.floor((w / view.width) * 100) / 100)));
        }}>{t("pm.canvas.fit")}</Button>
        <p className="min-w-0 flex-1 text-right text-[length:var(--ws-text-caption)] text-ws-text-muted" aria-live="polite">
          {connectFrom ? t("pm.canvas.connectFrom", { item: labelOf(itemOf.get(connectFrom)) }) : tool === "connect" ? t("pm.canvas.connectHint") : t("pm.canvas.hint")}
        </p>
      </div>

      {effect?.key ? (
        <div role="status" className="flex flex-wrap items-center gap-2 rounded-[var(--ws-radius-md)] border border-ws-ai-spark bg-ws-ai-spark-soft px-3 py-2 text-[length:var(--ws-text-body-sm)]">
          <Badge tone="spark">{t("pm.canvas.effect")}</Badge>
          <span className="min-w-0 flex-1">{versionSummary(t, { key: effect.key, vars: effect.vars })}</span>
          {tabsOfEffect.length ? <span className="text-ws-text-muted">{t("pm.canvas.updatedIn")}</span> : null}
          {tabsOfEffect.map((tab) => <Button key={tab} size="sm" variant="ghost" onClick={() => goTo?.(tab)} disabled={!goTo}>{t(`pm.tab.${tab}`)}</Button>)}
          <Button size="sm" variant="ghost" aria-label={t("pm.ui.close")} onClick={() => setEffect(null)}>×</Button>
        </div>
      ) : null}

      <div className="grid gap-[var(--ws-space-3)] xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="max-h-[75dvh] overflow-auto rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-0">
          <svg
            ref={svgRef}
            width={view.width * zoom}
            height={view.height * zoom}
            viewBox={`0 0 ${view.width} ${view.height}`}
            className={cn("block select-none font-[family-name:var(--ws-font-body)]", tool === "connect" && "cursor-crosshair")}
            role="application"
            aria-roledescription={t("pm.canvas.roledesc")}
            aria-label={t("pm.canvas.label", { n: view.items.length, edges: view.edges.length })}
            onDoubleClick={(e) => {
              if (readOnly || e.target !== e.currentTarget && !(e.target as Element).hasAttribute?.("data-zone")) return;
              setCreateAt(toCanvas(e.clientX, e.clientY));
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setEdgeSel(null);
                if (!connectFrom) onSelect?.(null);
              }
            }}
          >
            <defs>
              <marker id="cv-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" className="fill-ws-text-muted" />
              </marker>
              <marker id="cv-arrow-crit" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" className="fill-ws-danger" />
              </marker>
            </defs>
            <Zones view={view} />
            {/* ligações */}
            {view.edges.filter((ed) => !hidden.has(ed.kind)).map((ed) => (
              <EdgePath key={ed.id} edge={ed} a={rectOf.get(ed.from)} b={rectOf.get(ed.to)} selected={edgeSel === ed.id} onSelect={() => { setEdgeSel(ed.id); onSelect?.(null); }} />
            ))}
            {/* itens */}
            {items.map((it) => (
              <CanvasItem
                key={it.ref}
                it={it}
                selected={selected === it.ref}
                source={connectFrom === it.ref}
                readOnly={readOnly}
                onPointerDown={(e) => onItemPointerDown(e, it)}
                onPointerMove={onItemPointerMove}
                onPointerUp={(e) => onItemPointerUp(e, it)}
                onKey={(key, shift) => {
                  const step = shift ? 40 : 10;
                  if (key === "Enter" || key === " ") pick(it.ref);
                  else if (readOnly) return;
                  else if (key === "ArrowLeft") nudge(it, -step, 0);
                  else if (key === "ArrowRight") nudge(it, step, 0);
                  else if (key === "ArrowUp") nudge(it, 0, -step);
                  else if (key === "ArrowDown") nudge(it, 0, step);
                  else if (key === "l" || key === "L") { setConnectFrom(it.ref); onSelect?.(it.ref); }
                  else if (key === "Escape") setConnectFrom(null);
                  else if ((key === "Delete" || key === "Backspace") && it.kind === "NOTE") run({ type: "NOTE_DELETE", id: refId(it.ref) });
                }}
              />
            ))}
          </svg>
        </div>

        <aside className="grid content-start gap-[var(--ws-space-3)]" aria-label={t("pm.canvas.inspector")}>
          {edgeSel ? (
            <EdgeInspector edge={view.edges.find((x) => x.id === edgeSel)} itemOf={itemOf} readOnly={readOnly} onDisconnect={(ed) => { if (run({ type: "CANVAS_DISCONNECT", from: ed.from, to: ed.to }).ok) setEdgeSel(null); }} />
          ) : sel ? (
            <ItemInspector it={sel} view={view} items={items} {...props} run={run} openTask={setOpenTask} startConnect={() => setConnectFrom(sel.ref)} zoneLabel={zoneLabel} />
          ) : (
            <div className="grid gap-2 rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)] text-[length:var(--ws-text-body-sm)]">
              <p className="font-semibold">{t("pm.canvas.howTitle")}</p>
              <ul className="grid list-disc gap-1 pl-4 text-ws-text">
                <li>{t("pm.canvas.how.pmc")}</li>
                <li>{t("pm.canvas.how.lanes")}</li>
                <li>{t("pm.canvas.how.connect")}</li>
                <li>{t("pm.canvas.how.free")}</li>
                <li>{t("pm.canvas.how.keyboard")}</li>
              </ul>
            </div>
          )}
          <fieldset className="grid gap-1 rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)]">
            <legend className="px-1 text-[length:var(--ws-text-body-sm)] font-semibold">{t("pm.canvas.legend")}</legend>
            {EDGE_KINDS.map((k) => (
              <div key={k} className="flex items-center gap-2">
                <svg width="34" height="10" aria-hidden className="shrink-0"><line x1="1" y1="5" x2="33" y2="5" className={EDGE_CLASS[k]} strokeWidth="2.5" strokeDasharray={EDGE_DASH[k]} /></svg>
                <Checkbox checked={!hidden.has(k)} onCheckedChange={(v) => setHidden((h) => { const n = new Set(h); if (v) n.delete(k); else n.add(k); return n; })} label={t(`pm.canvas.edge.${k}`)} className="py-0" />
              </div>
            ))}
          </fieldset>
        </aside>
      </div>

      <CreateDialog at={createAt} onClose={() => setCreateAt(null)} zones={view.zones} zoneLabel={zoneLabel} onCreate={(text) => {
        if (!createAt) return false;
        const r = run({ type: "CANVAS_CREATE", x: createAt.x, y: createAt.y, text });
        return r.ok;
      }} />
      <TaskInspector {...props} taskId={openTask} onClose={() => setOpenTask(null)} />
    </div>
  );
}

function labelOf(it: CanvasItemView | undefined): string {
  if (!it) return "";
  return "code" in it ? `${it.code} ${it.title}` : it.title;
}

function Zones({ view }: { view: ReturnType<typeof canvasView> }) {
  const { t } = useI18n();
  const pmc = view.zones.filter((z): z is Extract<Zone, { kind: "PMC" }> => z.kind === "PMC");
  const lanes = view.zones.filter((z): z is Extract<Zone, { kind: "PHASE" }> => z.kind === "PHASE");
  return (
    <g>
      {PMC_LAYOUT.map((col, i) => (
        <g key={col.question}>
          <rect x={i * 420} y={0} width={420} height={40} className="fill-ws-surface-3 stroke-ws-border" />
          <text x={i * 420 + 12} y={26} className="fill-ws-text text-[15px] font-bold">{t(`pm.pmcQuestion.${col.question}`)}</text>
        </g>
      ))}
      {pmc.map((z) => {
        const lines = view.lists[z.block] ?? [];
        const max = Math.max(0, Math.floor((z.rect.h - 56) / 17));
        return (
          <g key={z.block}>
            <rect data-zone={z.block} x={z.rect.x} y={z.rect.y} width={z.rect.w} height={z.rect.h} className="fill-ws-surface-1 stroke-ws-border" />
            <text x={z.rect.x + 10} y={z.rect.y + 20} className="fill-ws-text text-[13px] font-semibold">{t(`pm.pmcBlock.${z.block}`)}</text>
            <text x={z.rect.x + z.rect.w - 10} y={z.rect.y + 20} textAnchor="end" className="fill-ws-text-faint text-[11px]">{t(`pm.canvas.target.${PMC_TARGET[z.block]}`)}</text>
            {lines.slice(0, max).map((line, k) => (
              <text key={k} x={z.rect.x + 12} y={z.rect.y + 42 + k * 17} className="fill-ws-text text-[12px]">• {line.length > 56 ? `${line.slice(0, 55)}…` : line}</text>
            ))}
            {lines.length > max && max > 0 ? <text x={z.rect.x + 12} y={z.rect.y + 42 + max * 17} className="fill-ws-text-muted text-[11px]">{t("pm.canvas.more", { n: lines.length - max })}</text> : null}
          </g>
        );
      })}
      <text x={8} y={view.lanesTop - 18} className="fill-ws-text text-[15px] font-bold">{t("pm.canvas.lanesTitle")}</text>
      {lanes.map((z) => (
        <g key={z.phase}>
          <rect x={z.rect.x} y={z.rect.y - 40} width={z.rect.w} height={40} className="fill-ws-surface-3 stroke-ws-border" />
          <text x={z.rect.x + 10} y={z.rect.y - 22} className="fill-ws-text text-[14px] font-bold">{t(`pm.phase.${z.phase}`)}</text>
          <text x={z.rect.x + 10} y={z.rect.y - 7} className="fill-ws-text-muted text-[10px]">{t("pm.board.dominant", { group: t(`pm.process.${PHASE_META[z.phase].dominant}`) })}</text>
          <rect data-zone={z.phase} x={z.rect.x} y={z.rect.y} width={z.rect.w} height={z.rect.h} className="fill-ws-surface-2 stroke-ws-border" strokeDasharray="4 4" />
        </g>
      ))}
      <text x={8} y={view.lanesTop + 40 + view.laneHeight + 30} className="fill-ws-text-muted text-[13px]">{t("pm.canvas.freeArea")}</text>
    </g>
  );
}

function EdgePath({ edge, a, b, selected, onSelect }: { edge: CanvasEdge; a?: Rect; b?: Rect; selected: boolean; onSelect: () => void }) {
  const { t } = useI18n();
  if (!a || !b) return null;
  let d: string;
  let mid: { x: number; y: number };
  if (edge.kind === "DEPENDENCIA") {
    const x1 = a.x + a.w;
    const y1 = a.y + a.h / 2;
    const back = b.x < x1;
    const x2 = back ? b.x + b.w / 2 : b.x;
    const y2 = back ? (b.y > y1 ? b.y : b.y + b.h) : b.y + b.h / 2;
    d = `M${x1},${y1} C${x1 + 40},${y1} ${back ? x2 : x2 - 40},${back ? y2 + (b.y > y1 ? -40 : 40) : y2} ${x2},${y2}`;
    mid = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
  } else {
    const p = borderPoint(a, b.x + b.w / 2, b.y + b.h / 2);
    const q = borderPoint(b, a.x + a.w / 2, a.y + a.h / 2);
    d = `M${p.x},${p.y} L${q.x},${q.y}`;
    mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  }
  const crit = edge.kind === "DEPENDENCIA" && edge.critical;
  return (
    <g data-edge={edge.id}>
      <path d={d} fill="none" className={cn(crit ? "stroke-ws-danger" : EDGE_CLASS[edge.kind], selected && "stroke-ws-focus")} strokeWidth={selected ? 4 : crit ? 3 : 2} strokeDasharray={EDGE_DASH[edge.kind]} markerEnd={edge.kind === "DEPENDENCIA" ? (crit ? "url(#cv-arrow-crit)" : "url(#cv-arrow)") : undefined} opacity={0.9} />
      <path d={d} fill="none" stroke="transparent" strokeWidth={14} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <title>{t(`pm.canvas.edge.${edge.kind}`)}</title>
      </path>
      {edge.label ? <text x={mid.x} y={mid.y - 5} textAnchor="middle" className="fill-ws-text text-[11px] font-semibold">{edge.label}</text> : null}
    </g>
  );
}

function CanvasItem({ it, selected, source, readOnly, onPointerDown, onPointerMove, onPointerUp, onKey }: {
  it: CanvasItemView;
  selected: boolean;
  source: boolean;
  readOnly: boolean;
  onPointerDown: (e: ReactPointerEvent<SVGGElement>) => void;
  onPointerMove: (e: ReactPointerEvent<SVGGElement>) => void;
  onPointerUp: (e: ReactPointerEvent<SVGGElement>) => void;
  onKey: (key: string, shift: boolean) => void;
}) {
  const { t } = useI18n();
  const { x, y, w, h } = it.rect;
  const fill = it.kind === "NOTE" ? NOTE_FILL[(it.color as CanvasNote["color"]) ?? "AMARELO"] : ITEM_FILL[it.kind];
  const stroke = it.kind === "TASK" && it.critical ? "stroke-ws-danger" : "stroke-ws-border-strong";
  const kindLabel = t(`pm.canvas.kind.${it.kind}`);
  const title = "code" in it ? `${it.code} · ${it.title}` : it.title;
  const sub =
    it.kind === "TASK" ? t(`pm.status.${it.task.status}`) + (it.critical ? ` · ${t("pm.task.critical")}` : "")
    : it.kind === "RISK" ? t(`pm.riskBand.${it.band}`)
    : it.kind === "STK" ? t(`pm.engagement.${it.strategy}`)
    : kindLabel;
  const lines = wrap(title, it.kind === "TASK" ? 26 : 23, it.kind === "TASK" || it.kind === "NOTE" ? 2 : 1);
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${kindLabel}: ${title}. ${sub}`}
      aria-pressed={selected}
      data-ref={it.ref}
      transform={`translate(${x},${y})`}
      className={cn("outline-none", !readOnly && "cursor-grab", "[&:focus-visible>rect:first-child]:stroke-ws-focus [&:focus-visible>rect:first-child]:[stroke-width:3]")}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={(e) => {
        if (["Enter", " ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Delete", "Backspace", "l", "L", "Escape"].includes(e.key)) {
          e.preventDefault();
          onKey(e.key, e.shiftKey);
        }
      }}
    >
      <rect width={w} height={h} rx={it.kind === "NOTE" ? 2 : 8} className={cn(fill, selected || source ? "stroke-ws-focus" : stroke)} strokeWidth={selected || source ? 3 : it.kind === "TASK" && it.critical ? 2.2 : 1.2} />
      {it.kind === "TASK" ? <rect width={6} height={h} rx={3} className={it.critical ? "fill-ws-danger" : "fill-ws-accent"} /> : null}
      {lines.map((line, i) => (
        <text key={i} x={it.kind === "TASK" ? 14 : 9} y={17 + i * 15} className={cn("text-[12px]", i === 0 && "font-semibold", "fill-ws-text")}>{line}</text>
      ))}
      <text x={it.kind === "TASK" ? 14 : 9} y={h - 7} className="fill-ws-text-muted text-[10px]">{sub}</text>
    </g>
  );
}

function ItemInspector({ it, view, items, model, readOnly, run, openTask, startConnect, goTo, zoneLabel }: PanelProps & {
  it: CanvasItemView;
  view: ReturnType<typeof canvasView>;
  items: CanvasItemView[];
  run: (cmd: ProjectCommand) => CommandResult;
  openTask: (id: string) => void;
  startConnect: () => void;
  zoneLabel: (z: Zone) => string;
}) {
  const { t, intl } = useI18n();
  const id = refId(it.ref);
  const [target, setTarget] = useState("");
  const [zoneKey, setZoneKey] = useState("");
  const edges = view.edges.filter((e) => e.from === it.ref || e.to === it.ref);
  const byRef = new Map(items.map((i) => [i.ref, i]));
  const linkable = items.filter((o) => o.ref !== it.ref && LINKABLE[it.kind]!.includes(o.kind) && !edges.some((e) => e.from === o.ref || e.to === o.ref));
  const movableZones = it.kind === "TASK" ? view.zones.filter((z) => z.kind === "PHASE") : it.kind === "NOTE" ? view.zones : [];
  const tab: WorkspaceTab | null = it.kind === "TASK" ? "quadro" : it.kind === "WBS" || it.kind === "REQ" ? "escopo" : it.kind === "RISK" || it.kind === "STK" ? "riscos" : null;
  const note = it.kind === "NOTE" ? model.canvas.notes.find((n) => n.id === id) : undefined;
  const risk = it.kind === "RISK" ? model.risks.find((r) => r.id === id) : undefined;
  const stk = it.kind === "STK" ? model.stakeholders.find((s) => s.id === id) : undefined;
  const req = it.kind === "REQ" ? model.requirements.find((r) => r.id === id) : undefined;
  const wbs = it.kind === "WBS" ? model.wbs.find((w) => w.id === id) : undefined;

  return (
    <div className="grid gap-3 rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)] text-[length:var(--ws-text-body-sm)]" data-inspector={it.ref}>
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone="accent">{t(`pm.canvas.kind.${it.kind}`)}</Tag>
        <p className="min-w-0 flex-1 font-semibold">{labelOf(it)}</p>
      </div>
      {it.kind === "TASK" ? (
        <p className="text-ws-text-muted">{t("pm.canvas.taskInfo", { phase: t(`pm.phase.${it.task.phase}`), status: t(`pm.status.${it.task.status}`) })}{it.critical ? ` · ${t("pm.task.critical")}` : ""}</p>
      ) : null}
      {risk ? <p className="text-ws-text-muted">{t("pm.canvas.riskInfo", { p: fmt.percent(intl, risk.probability), impact: fmt.money(intl, risk.impact), emv: fmt.money(intl, emv(risk.probability, risk.impact)) })}</p> : null}
      {stk ? <p className="text-ws-text-muted">{t("pm.canvas.stkInfo", { power: stk.power, interest: stk.interest })}</p> : null}
      {req ? <p className="text-ws-text-muted">{req.test ? t("pm.canvas.reqTest", { test: req.test }) : t("pm.canvas.reqNoTest")}</p> : null}
      {wbs?.acceptance ? <p className="text-ws-text-muted">{t("pm.canvas.wbsAcceptance", { text: wbs.acceptance })}</p> : null}
      {note ? (
        <div className="grid gap-2">
          <CommitText label={t("pm.canvas.noteText")} value={note.text} multiline disabled={readOnly} onCommit={(v) => run({ type: "NOTE_UPDATE", id, text: v })} />
          <Field label={t("pm.canvas.noteColor")}>
            {({ id: fid }) => (
              <Select id={fid} value={note.color ?? "AMARELO"} disabled={readOnly} onChange={(e) => run({ type: "NOTE_UPDATE", id, text: note.text, color: e.target.value as CanvasNote["color"] })}
                options={(["AMARELO", "AZUL", "VERDE", "ROSA"] as const).map((c) => ({ value: c, label: t(`pm.canvas.color.${c}`) }))} />
            )}
          </Field>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {it.kind === "TASK" ? <Button size="sm" variant="primary" onClick={() => openTask(id)}>{t("pm.canvas.openTask")}</Button> : null}
        {tab && goTo ? <Button size="sm" onClick={() => goTo(tab)}>{t("pm.ui.goToTab", { tab: t(`pm.tab.${tab}`) })}</Button> : null}
        {!readOnly && LINKABLE[it.kind]!.length ? <Button size="sm" onClick={startConnect}>{t("pm.canvas.startConnect")}</Button> : null}
        {!readOnly && note ? <Button size="sm" variant="danger" onClick={() => run({ type: "NOTE_DELETE", id })}>{t("pm.canvas.deleteNote")}</Button> : null}
      </div>

      <section className="grid gap-1.5">
        <p className="font-semibold">{t("pm.canvas.connections", { n: edges.length })}</p>
        {edges.length ? (
          <ul className="grid gap-1">
            {edges.map((e) => {
              const other = byRef.get(e.from === it.ref ? e.to : e.from);
              return (
                <li key={e.id} className="flex items-center gap-2">
                  <Tag>{t(`pm.canvas.edge.${e.kind}`)}</Tag>
                  <span className="min-w-0 flex-1 truncate">{e.from === it.ref ? "→ " : "← "}{labelOf(other)}</span>
                  {!readOnly ? <Button size="sm" variant="ghost" aria-label={t("pm.canvas.disconnectFrom", { item: labelOf(other) })} onClick={() => run({ type: "CANVAS_DISCONNECT", from: e.from, to: e.to })}>×</Button> : null}
                </li>
              );
            })}
          </ul>
        ) : <p className="text-ws-text-muted">{t("pm.canvas.noConnections")}</p>}
      </section>

      {!readOnly && linkable.length ? (
        <form className="grid gap-2" onSubmit={(e) => {
          e.preventDefault();
          if (!target) return;
          if (run({ type: "CANVAS_CONNECT", from: it.ref, to: target as CanvasRef }).ok) setTarget("");
        }}>
          <Field label={t("pm.canvas.linkTo")} hint={t(`pm.canvas.linkHint.${it.kind}`)}>
            {({ id: fid, describedBy }) => (
              <Select id={fid} aria-describedby={describedBy} value={target} onChange={(e) => setTarget(e.target.value)}
                options={[{ value: "", label: t("pm.ui.select") }, ...linkable.map((o) => ({ value: o.ref, label: `${t(`pm.canvas.kind.${o.kind}`)} · ${labelOf(o)}` }))]} />
            )}
          </Field>
          <Button type="submit" size="sm" disabled={!target}>{t("pm.canvas.connect")}</Button>
        </form>
      ) : null}

      {!readOnly && movableZones.length ? (
        <form className="grid gap-2" onSubmit={(e) => {
          e.preventDefault();
          const z = movableZones.find((x) => (x.kind === "PHASE" ? x.phase : x.block) === zoneKey);
          if (!z) return;
          const k = items.filter((o) => o.ref !== it.ref && zoneAt([z], o.rect.x + o.rect.w / 2, o.rect.y + o.rect.h / 2)).length;
          const p = gridSlot(z.rect, k, ITEM_SIZE[refKind(it.ref)]);
          if (run({ type: "CANVAS_MOVE", ref: it.ref, x: p.x, y: p.y }).ok) setZoneKey("");
        }}>
          <Field label={it.kind === "NOTE" ? t("pm.canvas.convertTo") : t("pm.canvas.moveToPhase")} hint={it.kind === "NOTE" ? t("pm.canvas.convertHint") : undefined}>
            {({ id: fid, describedBy }) => (
              <Select id={fid} aria-describedby={describedBy} value={zoneKey} onChange={(e) => setZoneKey(e.target.value)}
                options={[{ value: "", label: t("pm.ui.select") }, ...movableZones.map((z) => ({ value: z.kind === "PHASE" ? z.phase : z.block, label: zoneLabel(z) + (z.kind === "PMC" ? ` → ${t(`pm.canvas.target.${PMC_TARGET[z.block]}`)}` : "") }))]} />
            )}
          </Field>
          <Button type="submit" size="sm" disabled={!zoneKey}>{it.kind === "NOTE" ? t("pm.canvas.convert") : t("pm.canvas.move")}</Button>
        </form>
      ) : null}
    </div>
  );
}

function EdgeInspector({ edge, itemOf, readOnly, onDisconnect }: { edge?: CanvasEdge; itemOf: Map<CanvasRef, CanvasItemView>; readOnly: boolean; onDisconnect: (e: CanvasEdge) => void }) {
  const { t } = useI18n();
  if (!edge) return null;
  return (
    <div className="grid gap-2 rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)] text-[length:var(--ws-text-body-sm)]" data-edge-inspector={edge.id}>
      <Tag tone="accent">{t(`pm.canvas.edge.${edge.kind}`)}</Tag>
      <p>{labelOf(itemOf.get(edge.from))} → {labelOf(itemOf.get(edge.to))}{edge.label ? ` (${edge.label})` : ""}</p>
      <p className="text-ws-text-muted">{t(`pm.canvas.edgeMeaning.${edge.kind}`)}</p>
      {!readOnly ? <Button size="sm" variant="danger" onClick={() => onDisconnect(edge)}>{t("pm.canvas.disconnect")}</Button> : null}
    </div>
  );
}

function CreateDialog({ at, onClose, onCreate, zones, zoneLabel }: { at: { x: number; y: number } | null; onClose: () => void; onCreate: (text: string) => boolean; zones: Zone[]; zoneLabel: (z: Zone) => string }) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const zone = at ? zoneAt(zones, at.x, at.y) : null;
  const becomes = !zone ? t("pm.canvas.becomes.NOTE") : zone.kind === "PHASE" ? t("pm.canvas.becomes.TASK", { phase: zoneLabel(zone) }) : t(`pm.canvas.becomes.${PMC_TARGET[zone.block]}`, { block: zoneLabel(zone) });
  return (
    <Dialog open={Boolean(at)} onOpenChange={(o) => { if (!o) { setText(""); onClose(); } }} title={t("pm.canvas.createTitle")} description={becomes}>
      <form className="grid gap-3" onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        if (onCreate(text)) {
          setText("");
          onClose();
        }
      }}>
        <Field label={t("pm.canvas.createLabel")}>
          {({ id }) => <Input id={id} autoFocus value={text} onChange={(e) => setText(e.target.value)} />}
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => { setText(""); onClose(); }}>{t("pm.ui.cancel")}</Button>
          <Button type="submit" variant="primary" disabled={!text.trim()}>{t("pm.ui.create")}</Button>
        </div>
      </form>
    </Dialog>
  );
}

