/**
 * Aplicação de um documento importado, só depois do aceite (RF52.CA04; RF70.CA06): cria uma peça nova ou grava uma
 * revisão nova da peça aberta (substituindo ou acrescentando ao fim). Como qualquer comando, a revisão entra no
 * histórico e "Desfazer" volta ao conteúdo anterior — nada do documento atual se perde.
 */
import type { AutonomyMode } from "@/lib/ai/autonomy";
import { createPiece, HISTORY_LIMIT, type LetterPiece, type PieceVersion } from "../pieces";
import type { LetterBlock } from "../types";
import type { ImportedDocument } from "./model";

export type ImportMode = "SUBSTITUIR" | "ACRESCENTAR";

const titleFromFile = (name: string) => name.replace(/\.[A-Za-z0-9]+$/, "").replace(/[_-]+/g, " ").trim();

export function pieceFromImport(doc: ImportedDocument, input: { id: string; ownerId: string; mode: AutonomyMode; now: Date }): LetterPiece {
  const title = (doc.meta.title ?? "").trim() || titleFromFile(doc.fileName) || doc.fileName;
  const base = createPiece({ id: input.id, title: title.slice(0, 200), docType: doc.meta.docType ?? "LIVRE", genre: doc.meta.genre, ownerId: input.ownerId, now: input.now, blocks: doc.blocks, mode: input.mode });
  const first: PieceVersion = { ...base.history[0]!, origin: "IMPORT", summary: "io.imported", vars: { format: doc.format.toUpperCase(), file: doc.fileName } };
  return { ...base, language: doc.meta.language ?? base.language, history: [first] };
}

export function importIntoPiece(p: LetterPiece, doc: ImportedDocument, mode: ImportMode, now: Date): LetterPiece {
  const fresh: LetterBlock[] = doc.blocks.map((b, i) => ({ ...b, id: `b${p.nextBlockSeq + i}` }));
  const blocks = mode === "SUBSTITUIR" ? fresh : [...p.blocks, ...fresh];
  const revision = p.revision + 1;
  const at = now.toISOString();
  const version: PieceVersion = { revision, at, origin: "IMPORT", summary: mode === "SUBSTITUIR" ? "io.replaced" : "io.appended", vars: { format: doc.format.toUpperCase(), file: doc.fileName, count: fresh.length }, blocks };
  const history = [...p.history, version].slice(-HISTORY_LIMIT);
  const undoStack = [...p.undoStack, p.revision].filter((r) => history.some((h) => h.revision === r));
  return { ...p, blocks, revision, updatedAt: at, history, undoStack, nextBlockSeq: p.nextBlockSeq + fresh.length };
}
