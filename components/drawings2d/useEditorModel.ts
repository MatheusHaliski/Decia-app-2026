"use client";
/**
 * Controlador do editor 2D colaborativo (Mediator): a prancheta, os painéis e o teclado não se falam — todos chamam este
 * hook, que monta os patches (lib/drawings2d/commands), grava pela sessão (transação entre abas), mantém a visão da
 * pessoa (camada ativa, camadas ocultas), a seleção e a prévia fantasma da IA sob a política de autonomia (RF51/RF74).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui";
import { changeMode, personalPolicy, type AiPolicy, type AutonomyMode } from "@/lib/ai/autonomy";
import { useI18n } from "@/lib/i18n/useI18n";
import { activeLocks, ALL_LAYERS, type RegionLock } from "@/lib/pieces/collab";
import { snapPoint } from "@/lib/studio/selection";
import { defaultGeom, insertPatch, movePatch, newId, removePatch, setGeomPatch } from "@/lib/drawings2d/commands";
import type { Label } from "@/lib/drawings2d/engine";
import type { ExplainContext } from "@/lib/drawings2d/explain";
import { exportSvg } from "@/lib/drawings2d/export";
import { DEMO_START_LAYER } from "@/lib/drawings2d/fixture";
import { aiCapabilities, assistedBatch, batchPatch, buildBatch, createProposal, itemValidity, pendingItems, reconcileProposal, setStatus, type GhostItem, type GhostProposal } from "@/lib/drawings2d/ghost";
import { layerById, regionCenter, regionsOfShape, shapeById, shapesInRegion, type Point, type ShapeGeom, type ShapeKind, type ViewState } from "@/lib/drawings2d/model";
import { scopeFingerprint, suggest } from "@/lib/drawings2d/suggest";
import { useCollabDrawing } from "@/lib/drawings2d/useCollabDrawing";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { useViewer } from "@/lib/viewer/ViewerProvider";
import { downloadBlob, exportColors, svgToPng, type CaptureBackground } from "./capture";
import { describeEvent, labelText } from "./describe";

export const TTL_OPTIONS = [30_000, 60_000, 120_000] as const;
/** Pausa na edição antes de a IA (Sugestões/Assistido) recalcular a prévia (RF74: ~1,5 s). */
export const SUGGEST_PAUSE_MS = 1500;

export function useEditorModel(pieceId: string) {
  const { t, intl } = useI18n();
  const { toast } = useToast();
  const { user } = useViewer();
  const { prefs } = usePreferences();
  const myName = user.name ?? t(user.nameKey);
  const { session, snap } = useCollabDrawing(pieceId, myName);

  const [view, setView] = useState<ViewState>({ activeLayerId: DEMO_START_LAYER, hiddenLayerIds: [] });
  const [selectionState, setSelection] = useState<string[]>([]);
  const [focusRegion, setFocusRegion] = useState<string | null>(null);
  const [showRegions, setShowRegions] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [reserveLayer, setReserveLayer] = useState<string>("");
  const [ttl, setTtl] = useState<number>(60_000);
  const [policy, setPolicy] = useState<AiPolicy>(() => personalPolicy(prefs.aiAutonomyDefault));
  const [proposal, setProposal] = useState<GhostProposal | null>(null);
  const [ghostOpacity, setGhostOpacity] = useState(50);
  const [announcement, setAnnouncement] = useState("");
  const [capturing, setCapturing] = useState(false);
  const modeTouched = useRef(false);
  const rejected = useRef(new Map<string, number>());
  const lastEvent = useRef(0);

  // preferência pessoal carregada depois do primeiro render vale enquanto a pessoa não trocou o modo aqui
  useEffect(() => {
    if (!modeTouched.current) setPolicy(personalPolicy(prefs.aiAutonomyDefault));
  }, [prefs.aiAutonomyDefault]);

  const timeFmt = useMemo(() => new Intl.DateTimeFormat(intl, { hour: "2-digit", minute: "2-digit" }), [intl]);
  const meterFmt = useMemo(() => new Intl.NumberFormat(intl, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [intl]);
  const time = useCallback((ms: number) => timeFmt.format(new Date(ms)), [timeFmt]);
  const formatMeters = useCallback((m: number) => `${meterFmt.format(m)} m`, [meterFmt]);

  const state = snap?.state ?? null;
  const doc = state?.doc ?? null;
  const now = snap?.now ?? 0;
  const meId = snap?.me.id ?? "";
  const locks = useMemo(() => (state ? activeLocks(state.locks, now).sort((a, b) => a.expiresAt - b.expiresAt) : []), [state, now]);
  const selection = useMemo(() => (doc ? selectionState.filter((id) => shapeById(doc, id)) : []), [doc, selectionState]);
  const caps = aiCapabilities(policy);
  const explain: ExplainContext | null = useMemo(() => (state ? { t: (k, v) => t(k, v), time, state, meId } : null), [state, t, time, meId]);

  const announce = useCallback((text: string) => setAnnouncement(text), []);

  // acontecimentos da sessão → anúncio (aria-live) e, quando importa, toast
  useEffect(() => {
    const ev = snap?.event;
    if (!ev || !explain || ev.id === lastEvent.current) return;
    lastEvent.current = ev.id;
    const d = describeEvent(ev.e, explain);
    setAnnouncement(d.text);
    if (d.toast) toast({ title: d.text, tone: d.tone === "erro" ? "erro" : d.tone === "aviso" ? "aviso" : d.tone === "sucesso" ? "sucesso" : "info" });
  }, [snap?.event, explain, toast]);

  // a seleção desta pessoa vai para a presença (as outras abas desenham com o nome dela)
  useEffect(() => {
    session?.setPresence({ selection });
  }, [session, selection]);

  /* ── IA: proposta, reconciliação e modo espontâneo ── */

  const names = useMemo(() => ({ mirror: (source: string) => t("drw2d.sug.mirrorName", { name: source }), heightCota: t("drw2d.sug.heightName"), ridgeCota: t("drw2d.sug.ridgeName") }), [t]);

  const generate = useCallback((requested: boolean) => {
    if (!state) return null;
    const all = suggest(state.doc, view, { names });
    // espontâneo respeita o "não" da pessoa enquanto nada mudou no que a sugestão leu
    const list = requested ? all : all.filter((s) => rejected.current.get(s.id) !== scopeFingerprint(state.doc, s.dependsOn));
    return createProposal(state, policy, list, { id: newId("pr"), now: Date.now(), requested });
  }, [state, view, names, policy]);

  const requestSuggestions = useCallback(() => {
    if (!caps.onRequest) {
      announce(t(caps.unavailable === "AGENTE" ? "drw2d.ghost.agentUnavailable" : "drw2d.ghost.manualOff"));
      return;
    }
    const p = generate(true);
    if (!p) return;
    setProposal(p);
    announce(p.items.length ? t("drw2d.ghost.ready", { count: p.items.length, revision: p.baseRevision }) : t("drw2d.ghost.none"));
  }, [caps.onRequest, caps.unavailable, generate, announce, t]);

  // modo espontâneo: recalcula na pausa depois de mudar a peça, a política ou as camadas visíveis (a função mais recente
  // fica numa ref — o relógio da sessão muda a cada segundo e não deve reiniciar a pausa)
  const generateRef = useRef(generate);
  useEffect(() => {
    generateRef.current = generate;
  }, [generate]);
  const revision = doc?.revision ?? 0;
  const hiddenKey = view.hiddenLayerIds.join(",");
  useEffect(() => {
    if (!caps.spontaneous || !session) return;
    const id = window.setTimeout(() => {
      const p = generateRef.current(false);
      if (p) setProposal(p);
    }, SUGGEST_PAUSE_MS);
    return () => window.clearTimeout(id);
  }, [caps.spontaneous, session, revision, policy.version, hiddenKey]);

  // recusa automática: política, revisão do escopo, camada ou reserva alheia mudaram
  useEffect(() => {
    if (!state || !proposal) return;
    const next = reconcileProposal(proposal, { state, policy, view, actorId: meId, now });
    if (next !== proposal) setProposal(next);
  }, [state, policy, view, meId, now, proposal]);

  const changeModeTo = useCallback((to: AutonomyMode) => {
    const r = changeMode(policy, [{ userId: meId || "eu", role: "PROPRIETARIO" }], meId || "eu", to, new Date());
    if (!r.ok) {
      announce(t(`drw2d.ghost.modeDenied.${r.reason}`));
      return;
    }
    modeTouched.current = true;
    setPolicy(r.policy);
    announce(t("drw2d.ghost.modeChanged", { mode: t(`aiAutonomy.${to}`), version: r.policy.version }));
  }, [policy, meId, announce, t]);

  /** Grava sugestões aceitas: um patch de IA por camada, numa transação só; a camada ativa vira a da sugestão. */
  const applyItems = useCallback(async (items: readonly GhostItem[], aiMode: "ACEITA" | "APLICADA") => {
    if (!session || !state || !proposal) return;
    const valid = items.filter((i) => itemValidity(proposal, i, { state, policy, view, actorId: meId, now }).ok);
    const { parts, skipped } = buildBatch(valid);
    if (!parts.length) {
      announce(t("drw2d.ghost.nothingValid"));
      return;
    }
    const count = parts.reduce((n, p) => n + p.itemIds.length, 0);
    const label: Label = count === 1 ? parts[0]!.label : { key: aiMode === "APLICADA" ? "drw2d.op.aiAssisted" : "drw2d.op.aiBatch", vars: { count } };
    const commitParts = parts.map((part) => ({ patch: batchPatch(part, { id: newId("ia"), actorId: meId, baseRevision: state.doc.revision, aiMode }), view: { ...view, activeLayerId: part.layerId } }));
    const ids = parts.flatMap((p) => p.itemIds);
    // em gravação: o próprio aceite muda a revisão e a reconciliação não pode recusá-las no meio do caminho
    setProposal((p) => (p ? setStatus(p, ids, "APLICANDO") : p));
    const r = await session.commit(commitParts, { label });
    if (r.ok) {
      setProposal((p) => (p ? skipped.reduce((acc, s) => setStatus(acc, [s.id], "RECUSADA", { code: "LOTE", by: s.by }), setStatus(p, ids, "ACEITA", undefined, ["APLICANDO"])) : p));
      const last = parts.at(-1)!.layerId;
      if (last !== view.activeLayerId) setView((v) => ({ ...v, activeLayerId: last }));
    } else {
      setProposal((p) => (p ? setStatus(p, ids, "RECUSADA", { code: "GRAVACAO", denial: r.denial }, ["APLICANDO"]) : p));
    }
  }, [session, state, proposal, policy, view, meId, now, announce, t]);

  const accept = useCallback((ids: readonly string[]) => {
    void applyItems(pendingItems(proposal).filter((i) => ids.includes(i.suggestion.id)), "ACEITA");
  }, [applyItems, proposal]);

  const reject = useCallback((ids: readonly string[]) => {
    if (!proposal || !state) return;
    for (const i of proposal.items) if (ids.includes(i.suggestion.id)) rejected.current.set(i.suggestion.id, scopeFingerprint(state.doc, i.suggestion.dependsOn));
    setProposal(setStatus(proposal, ids, "REJEITADA"));
    announce(t("drw2d.ghost.rejected", { count: ids.length }));
  }, [proposal, state, announce, t]);

  /** Assistido: aplica de uma vez o que a pessoa revisou, só na seleção (objetos ou região em foco), com um desfazer. */
  const applyAssisted = useCallback(() => {
    if (!proposal || !state || !doc) return;
    const scope = new Set([...selection, ...(focusRegion ? shapesInRegion(doc, focusRegion).map((s) => s.id) : [])]);
    const r = assistedBatch(proposal, { state, policy, view, actorId: meId, now, selection: scope });
    if (!r.ok) {
      announce(t(`drw2d.ghost.assisted.${r.reason}`));
      return;
    }
    void applyItems(r.items, "APLICADA");
  }, [proposal, state, doc, selection, focusRegion, policy, view, meId, now, applyItems, announce, t]);

  /* ── edição ── */

  const commitPatch = useCallback(async (patch: ReturnType<typeof movePatch>, activeLayerId = view.activeLayerId) => {
    if (!session || !patch) return false;
    const r = await session.commit([{ patch, view: { ...view, activeLayerId } }], { ttl });
    return r.ok;
  }, [session, view, ttl]);

  const move = useCallback((ids: readonly string[], dx: number, dy: number) => {
    if (!doc || !ids.length) return;
    void commitPatch(movePatch(doc, meId, ids, dx, dy));
  }, [doc, meId, commitPatch]);

  const nudge = useCallback((dx: number, dy: number) => {
    if (!selection.length) {
      announce(t("drw2d.kbd.selectFirst"));
      return;
    }
    move(selection, dx, dy);
  }, [selection, move, announce, t]);

  const setGeom = useCallback((id: string, geom: ShapeGeom) => {
    if (!doc) return;
    void commitPatch(setGeomPatch(doc, meId, id, geom));
  }, [doc, meId, commitPatch]);

  const insert = useCallback(async (kind: ShapeKind) => {
    if (!doc) return;
    const mine = locks.find((l) => l.ownerId === meId && (l.layerId === view.activeLayerId || l.layerId === ALL_LAYERS));
    const at = (focusRegion && regionCenter(doc, focusRegion)) || (mine && regionCenter(doc, mine.regionIds[0]!)) || { x: doc.width / 2, y: doc.height / 2 };
    const count = doc.shapes.filter((s) => s.geom.kind === kind).length + 1;
    const shape = { id: newId("s"), layerId: view.activeLayerId, name: t("drw2d.newName", { kind: t(`drw2d.kind.${kind}`), n: count }), geom: defaultGeom(kind, snapPoint(at, doc.grid, true), t("drw2d.defaultText")) };
    if (await commitPatch(insertPatch(doc, meId, shape))) setSelection([shape.id]);
  }, [doc, locks, meId, view.activeLayerId, focusRegion, t, commitPatch]);

  const removeSelection = useCallback(async () => {
    if (!doc || !selection.length) return;
    if (await commitPatch(removePatch(doc, meId, selection))) setSelection([]);
  }, [doc, selection, meId, commitPatch]);

  const pick = useCallback((id: string | null, additive: boolean) => {
    if (!id) {
      if (!additive) setSelection([]);
      return;
    }
    setFocusRegion(null);
    setSelection((cur) => (additive ? (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]) : [id]));
    // a camada do objeto vira a ativa (se destravada): editar vale só na camada ativa
    const shape = doc ? shapeById(doc, id) : undefined;
    const layer = shape && doc ? layerById(doc, shape.layerId) : undefined;
    if (shape && layer && !layer.locked && shape.layerId !== view.activeLayerId) {
      setView((v) => ({ ...v, activeLayerId: shape.layerId }));
      announce(t("drw2d.layer.activated", { layer: layer.name }));
    }
  }, [doc, view.activeLayerId, announce, t]);

  const cycleSelection = useCallback((step: 1 | -1) => {
    if (!doc) return;
    const visible = doc.shapes.filter((s) => !view.hiddenLayerIds.includes(s.layerId));
    if (!visible.length) return;
    const i = visible.findIndex((s) => s.id === selection.at(-1));
    const next = visible[(i + step + visible.length) % visible.length]!;
    pick(next.id, false);
    announce(t("drw2d.kbd.selected", { name: next.name, regions: regionsOfShape(doc, next).map((r) => doc.regions.find((x) => x.id === r)?.name ?? r).join(", ") }));
  }, [doc, view.hiddenLayerIds, selection, pick, announce, t]);

  /* ── reservas ── */

  const layerForReserve = reserveLayer || view.activeLayerId;

  const reserveRegion = useCallback((regionId: string, layerId = layerForReserve) => {
    void session?.reserve(layerId, [regionId], ttl);
  }, [session, layerForReserve, ttl]);

  /** R: reserva as regiões dos objetos selecionados (na camada deles) ou a região em foco. */
  const reserveHere = useCallback(() => {
    if (!doc || !session) return;
    const shapes = selection.map((id) => shapeById(doc, id)).filter((s): s is NonNullable<typeof s> => !!s);
    if (shapes.length) {
      const layerId = shapes[0]!.layerId;
      void session.reserve(layerId, [...new Set(shapes.flatMap((s) => regionsOfShape(doc, s)))], ttl);
    } else if (focusRegion) reserveRegion(focusRegion);
    else announce(t("drw2d.kbd.selectFirst"));
  }, [doc, session, selection, focusRegion, ttl, reserveRegion, announce, t]);

  /** L: libera as reservas da pessoa que tocam a seleção ou a região em foco. */
  const releaseHere = useCallback(() => {
    if (!doc || !session) return;
    const regions = new Set(selection.length ? selection.flatMap((id) => { const s = shapeById(doc, id); return s ? regionsOfShape(doc, s) : []; }) : focusRegion ? [focusRegion] : []);
    const mine = locks.filter((l) => l.ownerId === meId && l.regionIds.some((r) => [...regions].some((q) => q === r || q.startsWith(r + "/") || r.startsWith(q + "/"))));
    if (!mine.length) {
      announce(t("drw2d.kbd.nothingToRelease"));
      return;
    }
    mine.forEach((l) => void session.release(l));
  }, [doc, session, selection, focusRegion, locks, meId, announce, t]);

  const renew = useCallback((lock: RegionLock) => void session?.renew(lock, ttl), [session, ttl]);
  const release = useCallback((lock: RegionLock) => void session?.release(lock), [session]);

  /* ── camadas ── */

  const setActiveLayer = useCallback((layerId: string) => {
    if (!doc) return;
    const layer = layerById(doc, layerId);
    if (!layer || layer.locked) {
      announce(t("drw2d.layer.lockedHint", { layer: layer?.name ?? layerId }));
      return;
    }
    setView((v) => ({ ...v, activeLayerId: layerId }));
    announce(t("drw2d.layer.activated", { layer: layer.name }));
  }, [doc, announce, t]);

  const toggleLayerVisible = useCallback((layerId: string) => {
    setView((v) => ({ ...v, hiddenLayerIds: v.hiddenLayerIds.includes(layerId) ? v.hiddenLayerIds.filter((x) => x !== layerId) : [...v.hiddenLayerIds, layerId] }));
  }, []);

  /* ── histórico, rascunho, demonstração ── */

  const undo = useCallback(() => void session?.undo(view), [session, view]);
  const redo = useCallback(() => void session?.redo(view), [session, view]);
  const reapplyDraft = useCallback(() => void session?.reapplyDraft(), [session]);
  const discardDraft = useCallback(() => session?.discardDraft(), [session]);
  const restore = useCallback(async () => {
    await session?.restoreDemo();
    setSelection([]);
    setProposal(null);
    rejected.current.clear();
  }, [session]);
  const setBotEnabled = useCallback((on: boolean) => void session?.setBotEnabled(on), [session]);

  const setCursor = useCallback((p: Point | null) => {
    session?.setPresence({ cursor: p });
    if (p) session?.touch();
  }, [session]);

  /* ── PNG ── */

  const capture = useCallback(async (background: CaptureBackground, scale: number) => {
    if (!doc) return;
    setCapturing(true);
    try {
      const { svg, width, height } = exportSvg(doc, view, { scale, colors: exportColors(background), formatMeters });
      const blob = await svgToPng(svg, width, height);
      downloadBlob(blob, `drawings-2d-${doc.pieceId}-r${doc.revision}.png`);
      announce(t("drw2d.capture.done", { width, height }));
    } catch {
      toast({ title: t("drw2d.capture.fail"), tone: "erro" });
    } finally {
      setCapturing(false);
    }
  }, [doc, view, formatMeters, announce, toast, t]);

  return {
    t, intl, session, snap, state, doc, now, meId, locks, view, selection, focusRegion, showRegions, snapToGrid, reserveLayer, layerForReserve, ttl,
    policy, caps, proposal, ghostOpacity, announcement, explain, time, formatMeters, capturing,
    labelText: (l: Label) => labelText({ t: (k, v) => t(k, v) }, l),
    setSelection, pick, cycleSelection, setFocusRegion, setShowRegions, setSnapToGrid, setReserveLayer, setTtl, setGhostOpacity,
    move, nudge, setGeom, insert, removeSelection, reserveRegion, reserveHere, releaseHere, renew, release, setActiveLayer, toggleLayerVisible,
    undo, redo, reapplyDraft, discardDraft, restore, setBotEnabled, setCursor, capture,
    changeModeTo, requestSuggestions, accept, reject, applyAssisted, announce,
  };
}

export type EditorModel = ReturnType<typeof useEditorModel>;
