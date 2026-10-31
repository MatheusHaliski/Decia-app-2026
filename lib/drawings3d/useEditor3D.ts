"use client";
/**
 * Mediador do editor 3D (Mediator): barra de ferramentas, lista de objetos, inspetor, atalhos e viewport não se falam entre si —
 * todos chamam este hook, que executa o comando no histórico (Command), atualiza a seleção e guarda o rascunho local.
 */
import { useCallback, useEffect, useState } from "react";
import { AddObject, History, RemoveObject, Rename, SetMaterial, SetTransform, type Command3D } from "./commands";
import { createObject, objectById, parseScene, starterScene, type PrimitiveKind, type Scene3D, type Transform } from "./model";
import { suggestedQuality, type QualityId } from "./quality";
import type { GizmoMode } from "./engine/Viewport3D";

export const DRAFT_KEY = "ws.drawings3d.rascunho.v1";

function loadDraft(): Scene3D | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? parseScene(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function saveDraft(scene: Scene3D): void {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(scene));
  } catch {
    /* navegação privada ou cota cheia: o rascunho é só conveniência */
  }
}

export function useEditor3D(nameOf: (kind: PrimitiveKind) => string) {
  // o histórico é mutável e vive enquanto o editor estiver aberto; `revision` avisa o React quando ele muda
  const [history] = useState(() => new History());
  const [scene, setScene] = useState<Scene3D>(() => (typeof window === "undefined" ? starterScene() : loadDraft() ?? starterScene()));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gizmoMode, setGizmoMode] = useState<GizmoMode>("translate");
  const [quality, setQuality] = useState<QualityId>(() => {
    if (typeof navigator === "undefined") return "alta";
    return suggestedQuality(navigator.hardwareConcurrency, (navigator as Navigator & { deviceMemory?: number }).deviceMemory);
  });
  const [revision, setRevision] = useState(0); // força reler canUndo/canRedo do histórico

  useEffect(() => {
    const id = window.setTimeout(() => saveDraft(scene), 400);
    return () => window.clearTimeout(id);
  }, [scene]);

  // o comando roda fora do atualizador do setState: no StrictMode o atualizador roda duas vezes e empilharia o comando em dobro
  const run = useCallback((command: Command3D) => {
    setScene(history.execute(scene, command));
    setRevision((r) => r + 1);
  }, [history, scene]);

  const undo = useCallback(() => {
    setScene(history.undo(scene));
    setRevision((r) => r + 1);
  }, [history, scene]);
  const redo = useCallback(() => {
    setScene(history.redo(scene));
    setRevision((r) => r + 1);
  }, [history, scene]);

  const add = useCallback((kind: PrimitiveKind) => {
    const object = createObject(kind, nameOf(kind));
    // ao lado do selecionado (ou à frente do pedestal), para não nascer dentro de outro objeto
    const anchor = objectById(scene, selectedId);
    const x = anchor ? anchor.transform.position[0] + 1.2 : 0;
    run(new AddObject({ ...object, transform: { ...object.transform, position: [x, object.transform.position[1], anchor ? anchor.transform.position[2] : 1.2] } }));
    setSelectedId(object.id);
  }, [nameOf, run, scene, selectedId]);

  const remove = useCallback(() => {
    if (!selectedId) return;
    run(new RemoveObject(selectedId));
    setSelectedId(null);
  }, [run, selectedId]);

  const setTransform = useCallback((id: string, t: Transform) => run(new SetTransform(id, t)), [run]);
  const setMaterial = useCallback((id: string, materialId: string) => run(new SetMaterial(id, materialId)), [run]);
  const rename = useCallback((id: string, name: string) => run(new Rename(id, name)), [run]);

  const reset = useCallback(() => {
    history.clear();
    setScene(starterScene());
    setSelectedId(null);
    setRevision((r) => r + 1);
  }, [history]);

  // seleção que deixou de existir (desfazer uma adição, remover o pai) é limpa
  const selected = objectById(scene, selectedId) ?? null;
  useEffect(() => {
    if (selectedId && !selected) setSelectedId(null);
  }, [selected, selectedId]);

  const status = { canUndo: history.canUndo, canRedo: history.canRedo, undoLabelKey: history.undoLabelKey, redoLabelKey: history.redoLabelKey, revision };

  return {
    scene, selected, selectedId, select: setSelectedId, gizmoMode, setGizmoMode, quality, setQuality,
    add, remove, setTransform, setMaterial, rename, undo, redo, reset, ...status,
  };
}

export type Editor3D = ReturnType<typeof useEditor3D>;
