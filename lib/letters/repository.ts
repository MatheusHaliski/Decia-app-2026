/**
 * Repositório das peças do Letters em memória (DEMO). A API de peças (`/api/pieces/{id}`, RF52 PieceController) ainda
 * não existe e não é presumida: `LettersRepository` é o contrato que um cliente HTTP real implementará depois. Os dados
 * vivem só nesta aba do navegador — recarregar volta aos exemplos.
 */
"use client";
import { useSyncExternalStore } from "react";
import type { AutonomyMode } from "@/lib/ai/autonomy";
import { buildDemoPieces } from "./fixtures";
import { createPiece, type LetterPiece } from "./pieces";
import { templateBlocks, type TemplateType } from "./templates";

export interface LettersRepository {
  /** marca de origem dos dados ("DEMO" no mock; o cliente real devolve "API") */
  readonly source: "DEMO" | "API";
  list(): readonly LetterPiece[];
  get(id: string): LetterPiece | undefined;
  /** substitui a peça inteira (o comando puro já calculou a nova revisão) */
  save(piece: LetterPiece): void;
  createFromTemplate(input: { template: TemplateType; title: string; ownerId: string; mode: AutonomyMode; now?: Date }): LetterPiece;
  subscribe(listener: () => void): () => void;
}

export function createMemoryLettersRepository(seed: readonly LetterPiece[], newId: () => string = defaultId): LettersRepository {
  let items: readonly LetterPiece[] = [...seed];
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  return {
    source: "DEMO",
    list: () => items,
    get: (id) => items.find((p) => p.id === id),
    save(piece) {
      const i = items.findIndex((p) => p.id === piece.id);
      items = i < 0 ? [piece, ...items] : items.map((p, j) => (j === i ? piece : p));
      emit();
    },
    createFromTemplate({ template, title, ownerId, mode, now = new Date() }) {
      const piece = createPiece({ id: newId(), title, docType: template, ownerId, now, blocks: templateBlocks(template), mode });
      items = [piece, ...items];
      emit();
      return piece;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

let seq = 0;
function defaultId(): string {
  seq += 1;
  return `peca-${Date.now().toString(36)}-${seq}`;
}

let demo: LettersRepository | null = null;
/** Repositório DEMO da aba (criado na primeira leitura, com datas relativas ao agora). */
export function demoLettersRepository(): LettersRepository {
  demo ??= createMemoryLettersRepository(buildDemoPieces(new Date()));
  return demo;
}
/** Só para testes: troca o repositório usado pelos hooks. */
export function setDemoLettersRepository(repo: LettersRepository | null) {
  demo = repo;
}

export function useLetterPieces(repo: LettersRepository = demoLettersRepository()): readonly LetterPiece[] {
  return useSyncExternalStore(repo.subscribe, repo.list, repo.list);
}

export function useLetterPiece(id: string, repo: LettersRepository = demoLettersRepository()): LetterPiece | undefined {
  const list = useLetterPieces(repo);
  return list.find((p) => p.id === id);
}
