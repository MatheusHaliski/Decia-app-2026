/**
 * Pactos de Desbloqueio — repositório DEMO (mesmo padrão de `lib/decia/repository.ts`). A API `/api/pacts` (CooperationPactService)
 * ainda não existe e não é presumida: `PactRepository` é o contrato que o cliente HTTP real implementará (com Idempotency-Key e
 * versão). Aqui os comandos puros de `rules.ts` rodam sobre o estado da aba; em erro, nada muda. Recarregar volta ao exemplo.
 */
import { buildDemoPacts } from "./fixtures";
import { demoOrg, type OrgDirectory } from "./org";
import { applyPactCommand, type CommandContext, type CommandResult, type PactCommand } from "./rules";
import type { PactsState } from "./types";

export interface PactRepository {
  readonly source: "DEMO" | "API";
  readonly org: OrgDirectory;
  snapshot(): PactsState;
  dispatch(cmd: PactCommand, ctx: Omit<CommandContext, "org">): CommandResult;
  /** marca como lidos os avisos de uma pessoa (todos ou de um pacto) */
  markRead(recipientId: string, pactId?: string): void;
  subscribe(listener: () => void): () => void;
}

export function createPactRepository(seed: PactsState, org: OrgDirectory = demoOrg()): PactRepository {
  let state = seed;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  return {
    source: "DEMO",
    org,
    snapshot: () => state,
    dispatch(cmd, ctx) {
      const r = applyPactCommand(state, cmd, { ...ctx, org });
      if (r.ok && r.state !== state) {
        state = r.state;
        emit();
      }
      return r;
    },
    markRead(recipientId, pactId) {
      const has = state.notifications.some((n) => n.recipientId === recipientId && !n.read && (!pactId || n.pactId === pactId));
      if (!has) return;
      state = { ...state, notifications: state.notifications.map((n) => (n.recipientId === recipientId && !n.read && (!pactId || n.pactId === pactId) ? { ...n, read: true } : n)) };
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

let demo: PactRepository | null = null;
/** Repositório DEMO da aba (criado na primeira leitura, com datas relativas ao agora). */
export function demoPactRepository(): PactRepository {
  demo ??= createPactRepository(buildDemoPacts(new Date()));
  return demo;
}
/** Só para testes: troca o repositório usado pela tela. */
export function setDemoPactRepository(repo: PactRepository | null) {
  demo = repo;
}
