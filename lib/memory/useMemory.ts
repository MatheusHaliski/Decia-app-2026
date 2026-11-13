"use client";
/** Hook da Memória DEMO: re-renderiza quando o acervo muda (ingestão, remoção ou decisão encerrada no DECIA desta aba). */
import { useSyncExternalStore } from "react";
import { demoMemoryRepository, type MemoryRepository } from "./store";

export function useMemoryRepository(repo: MemoryRepository = demoMemoryRepository()): { repo: MemoryRepository; version: number } {
  const version = useSyncExternalStore(repo.subscribe, repo.snapshot, repo.snapshot);
  return { repo, version };
}
