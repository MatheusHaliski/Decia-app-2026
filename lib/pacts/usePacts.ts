"use client";
/** Hook dos pactos DEMO: estado da aba via `useSyncExternalStore` (re-renderiza a cada comando aceito). */
import { useSyncExternalStore } from "react";
import { demoPactRepository, type PactRepository } from "./store";
import type { PactsState } from "./types";

export function usePactsState(repo: PactRepository = demoPactRepository()): PactsState {
  return useSyncExternalStore(repo.subscribe, repo.snapshot, repo.snapshot);
}
