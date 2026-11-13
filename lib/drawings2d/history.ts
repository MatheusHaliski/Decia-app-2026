/**
 * Histórico local de desfazer/refazer de UMA pessoa (DRAWINGS_CAMADAS_COLABORACAO_DECIA §Fluxo 8): cada entrada guarda o
 * patch inverso do que ela mesma gravou, com a revisão esperada de depois. Desfazer envia esse inverso como patch novo;
 * se outra pessoa mexeu no objeto depois, a revisão não confere e o desfazer é recusado — nunca apaga trabalho alheio.
 */
import type { Label, PatchOp } from "./engine";

export interface UndoPart {
  /** camada do patch (a edição vale só na camada da parte) */
  layerId: string;
  ops: readonly PatchOp[];
  scopeRegionIds?: readonly string[];
}

export interface UndoEntry {
  label: Label;
  /** partes a aplicar, em ordem, numa única transação */
  parts: readonly UndoPart[];
}

export interface LocalHistory {
  undo: readonly UndoEntry[];
  redo: readonly UndoEntry[];
}

export const HISTORY_LIMIT = 100;
export const emptyHistory: LocalHistory = { undo: [], redo: [] };

/** Uma alteração nova entra no desfazer e descarta o refazer. */
export const recordApplied = (h: LocalHistory, entry: UndoEntry): LocalHistory => ({ undo: [...h.undo, entry].slice(-HISTORY_LIMIT), redo: [] });

/** Retira a última entrada de um dos lados (a sessão aplica o inverso e decide para onde ele vai). */
export function popEntry(h: LocalHistory, side: "undo" | "redo"): { entry: UndoEntry; history: LocalHistory } | null {
  const list = h[side];
  const entry = list.at(-1);
  if (!entry) return null;
  return { entry, history: { ...h, [side]: list.slice(0, -1) } };
}

/** Depois de desfazer: o inverso do inverso vai para o refazer (e vice-versa), sem limpar o outro lado. */
export function pushEntry(h: LocalHistory, side: "undo" | "redo", entry: UndoEntry): LocalHistory {
  return { ...h, [side]: [...h[side], entry].slice(-HISTORY_LIMIT) };
}
