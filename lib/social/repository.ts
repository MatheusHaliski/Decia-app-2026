/**
 * Rede social — repositório em memória (DEMO). A API social ainda não existe e não é presumida (nenhuma API antes dos
 * Blocos 4/5 de segurança, PLANO_EXECUCAO §8). `SocialRepository` é o contrato que um cliente HTTP real implementará
 * (`/api/interactions/{type}/{id}/…`, `/api/assignments`, `/api/follows`, `/api/mural`); a UI só fala com ele por
 * `useSocialState`. Os dados vivem só na memória desta aba — recarregar a página volta aos exemplos.
 */
"use client";
import { useSyncExternalStore } from "react";
import { buildDemoSocial } from "./fixtures";
import type { Result } from "./rules";
import type { SocialState } from "./types";

export interface SocialRepository {
  /** origem dos dados ("DEMO" no mock; o cliente real devolve "API") */
  readonly source: "DEMO" | "API";
  snapshot(): SocialState;
  /** aplica um comando puro (lib/social/rules.ts); em sucesso troca o estado e avisa os assinantes */
  run<T extends object>(command: (s: SocialState) => Result<T>): Result<T>;
  subscribe(listener: () => void): () => void;
}

export function createMemoryRepository(seed: SocialState): SocialRepository {
  let state = seed;
  const listeners = new Set<() => void>();
  return {
    source: "DEMO",
    snapshot: () => state,
    run(command) {
      const r = command(state);
      if (r.ok) {
        state = r.state;
        listeners.forEach((l) => l());
      }
      return r;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

let demo: SocialRepository | null = null;
/** Repositório DEMO da aba (criado na primeira leitura, com datas relativas ao agora). */
export function demoSocialRepository(): SocialRepository {
  demo ??= createMemoryRepository(buildDemoSocial(new Date()));
  return demo;
}
/** Só para testes: troca o repositório padrão. */
export function setDemoSocialRepository(repo: SocialRepository | null) {
  demo = repo;
}

export function useSocialState(repo: SocialRepository = demoSocialRepository()): SocialState {
  return useSyncExternalStore(repo.subscribe, repo.snapshot, repo.snapshot);
}
