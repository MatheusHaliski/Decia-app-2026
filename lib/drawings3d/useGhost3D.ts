"use client";
/**
 * Estado da prévia fantasma no editor 3D (RF74 sobre RF51): política de autonomia (padrão pessoal), proposta, recusa automática,
 * aceitar/rejeitar uma a uma ou todas, lote do modo Assistido e o modo espontâneo (recalcula na pausa depois de editar).
 * A viewport só desenha `ghosts`; o modelo muda apenas ao aceitar, por um comando no histórico do editor.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { changeMode, personalPolicy, type AiPolicy, type AutonomyMode } from "@/lib/ai/autonomy";
import { useI18n } from "@/lib/i18n/useI18n";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import {
  aiCapabilities, assistedBatch3D, buildBatch3D, createProposal3D, itemValidity3D, pendingItems3D, reconcileProposal3D, setStatus3D,
  type Ghost3DItem, type Ghost3DProposal, type GhostRender, type Refusal3D,
} from "./ghost";
import { subtreeIds } from "./model";
import { sceneFingerprint, suggest3D, type Label3D } from "./suggest";
import type { Editor3D } from "./useEditor3D";

/** Pausa na edição antes de a IA (Sugestões/Assistido) recalcular a prévia (RF74: ~1,5 s). */
export const GHOST3D_PAUSE_MS = 1500;
const ME = "eu";

let seq = 0;
const newId = () => `pr3-${Date.now().toString(36)}-${(seq += 1)}`;

export function useGhost3D(editor: Editor3D) {
  const { t, intl } = useI18n();
  const { prefs } = usePreferences();
  const [policy, setPolicy] = useState<AiPolicy>(() => personalPolicy(prefs.aiAutonomyDefault));
  const [proposal, setProposal] = useState<Ghost3DProposal | null>(null);
  const [opacity, setOpacity] = useState(50);
  const [announcement, setAnnouncement] = useState("");
  const modeTouched = useRef(false);
  const rejected = useRef(new Map<string, number>());
  const { scene, revision, selectedId, applyPatch } = editor;

  // preferência carregada depois do primeiro render vale enquanto a pessoa não trocou o modo aqui
  useEffect(() => {
    if (!modeTouched.current) setPolicy(personalPolicy(prefs.aiAutonomyDefault));
  }, [prefs.aiAutonomyDefault]);

  const caps = aiCapabilities(policy);
  const numberFmt = useMemo(() => new Intl.NumberFormat(intl, { maximumFractionDigits: 2 }), [intl]);
  const labelText = useCallback((l: Label3D) => {
    const vars = Object.fromEntries(Object.entries(l.vars ?? {}).map(([k, v]) => [k, typeof v === "number" ? numberFmt.format(v) : v]));
    return t(l.key, vars);
  }, [t, numberFmt]);
  const refusalText = useCallback((r: Refusal3D) => (r.code === "POLITICA" ? t("d3.ghost.refused.POLITICA", { from: r.from, to: r.to }) : t(`d3.ghost.refused.${r.code}`)), [t]);

  const generate = useCallback((requested: boolean) => {
    const all = suggest3D(scene, { mirrorName: (name) => t("d3.ghost.mirrorName", { name }) });
    // espontâneo respeita o "não" da pessoa enquanto nada mudou no que a sugestão leu
    const list = requested ? all : all.filter((s) => rejected.current.get(s.id) !== sceneFingerprint(scene, s.dependsOn));
    return createProposal3D(scene, revision, policy, list, { id: newId(), now: Date.now(), requested });
  }, [scene, revision, policy, t]);

  const requestSuggestions = useCallback(() => {
    if (!caps.onRequest) {
      setAnnouncement(t(caps.unavailable === "AGENTE" ? "d3.ghost.agentUnavailable" : "d3.ghost.manualOff"));
      return;
    }
    const p = generate(true);
    setProposal(p);
    setAnnouncement(p.items.length ? t("d3.ghost.ready", { count: p.items.length, revision: p.baseRevision }) : t("d3.ghost.none"));
  }, [caps.onRequest, caps.unavailable, generate, t]);

  // modo espontâneo: recalcula na pausa depois de mudar a cena ou a política
  const generateRef = useRef(generate);
  useEffect(() => {
    generateRef.current = generate;
  }, [generate]);
  useEffect(() => {
    if (!caps.spontaneous) return;
    const id = window.setTimeout(() => setProposal(generateRef.current(false)), GHOST3D_PAUSE_MS);
    return () => window.clearTimeout(id);
  }, [caps.spontaneous, revision, policy.version]);

  // recusa automática: política ou revisão do escopo mudaram, alvo sumiu
  useEffect(() => {
    if (!proposal) return;
    const next = reconcileProposal3D(proposal, { scene, policy });
    if (next !== proposal) setProposal(next);
  }, [scene, policy, proposal]);

  const changeModeTo = useCallback((to: AutonomyMode) => {
    const r = changeMode(policy, [{ userId: ME, role: "PROPRIETARIO" }], ME, to, new Date());
    if (!r.ok) {
      setAnnouncement(t(`d3.ghost.modeDenied.${r.reason}`));
      return;
    }
    modeTouched.current = true;
    setPolicy(r.policy);
    setAnnouncement(t("d3.ghost.modeChanged", { mode: t(`aiAutonomy.${to}`), version: r.policy.version }));
  }, [policy, t]);

  /** Grava as sugestões válidas num comando só (um desfazer); as que dependiam de outra do lote são recusadas. */
  const applyItems = useCallback((items: readonly Ghost3DItem[], labelKey: string) => {
    if (!proposal) return;
    const valid = items.filter((i) => itemValidity3D(proposal, i, { scene, policy }).ok);
    const { ops, itemIds, skipped } = buildBatch3D(valid);
    if (!itemIds.length || !applyPatch(ops, labelKey)) {
      setAnnouncement(t("d3.ghost.nothingValid"));
      return;
    }
    // aceitas primeiro: a reconciliação que vem com a cena nova já as encontra fora de PENDENTE
    setProposal((p) => (p ? skipped.reduce((acc, s) => setStatus3D(acc, [s.id], "RECUSADA", { code: "LOTE", by: s.by }), setStatus3D(p, itemIds, "ACEITA")) : p));
    setAnnouncement(t("d3.ghost.accepted", { count: itemIds.length }));
  }, [proposal, scene, policy, applyPatch, t]);

  const accept = useCallback((ids: readonly string[]) => {
    applyItems(pendingItems3D(proposal).filter((i) => ids.includes(i.suggestion.id)), ids.length > 1 ? "d3.ghost.cmd.acceptAll" : "d3.ghost.cmd.accept");
  }, [applyItems, proposal]);

  const reject = useCallback((ids: readonly string[]) => {
    if (!proposal) return;
    for (const i of proposal.items) if (ids.includes(i.suggestion.id)) rejected.current.set(i.suggestion.id, sceneFingerprint(scene, i.suggestion.dependsOn));
    setProposal(setStatus3D(proposal, ids, "REJEITADA"));
    setAnnouncement(t("d3.ghost.rejected", { count: ids.length }));
  }, [proposal, scene, t]);

  /** Assistido: aplica de uma vez o que a pessoa revisou, só no objeto selecionado (e descendentes), com um desfazer. */
  const applyAssisted = useCallback(() => {
    if (!proposal) return;
    const selection = selectedId ? subtreeIds(scene, selectedId) : new Set<string>();
    const r = assistedBatch3D(proposal, { scene, policy, selection, actorId: ME });
    if (!r.ok) {
      setAnnouncement(t(`d3.ghost.assisted.${r.reason}`));
      return;
    }
    applyItems(r.items, "d3.ghost.cmd.assisted");
  }, [proposal, selectedId, scene, policy, applyItems, t]);

  /** Enter na viewport: aceita a sugestão pendente do objeto selecionado (a primeira, se houver mais de uma). */
  const acceptForSelection = useCallback(() => {
    const item = pendingItems3D(proposal).find((i) => selectedId && i.suggestion.scopeIds.includes(selectedId));
    if (!item) return false;
    accept([item.suggestion.id]);
    return true;
  }, [proposal, selectedId, accept]);

  const ghosts: GhostRender[] = useMemo(() => {
    if (!proposal) return [];
    return proposal.items.flatMap((item, idx) => (item.status === "PENDENTE" ? item.suggestion.ghosts.map((object) => ({ key: `${item.suggestion.id}|${object.id}`, n: idx + 1, object })) : []));
  }, [proposal]);

  return {
    policy, caps, proposal, ghosts, opacity, setOpacity, announcement, labelText, refusalText,
    changeModeTo, requestSuggestions, accept, reject, applyAssisted, acceptForSelection,
  };
}

export type Ghost3D = ReturnType<typeof useGhost3D>;
