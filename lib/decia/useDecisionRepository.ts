"use client";
/**
 * Fonte ÚNICA das decisões (fase 7): com sessão autenticada, a API real (`source: "API"`, lib/decia/http.ts) e o id da pessoa logada;
 * sem sessão — o laboratório com perfil de visualização —, o DEMO em memória e a pessoa fictícia. O selo DEMO só aparece quando
 * `source === "DEMO"`. Toda tela que lê ou cria decisões usa `useDecisionSource()` — DECIA, Mesa de projetos (portão, mudança,
 * seleção), página da tarefa, janela Relações, handoff —, e quem lê fora do React (Memória Institucional) usa
 * `activeDecisionRepository()`/`activeDecisionSource`, que seguem a última fonte escolhida pelo hook. Assim a decisão aberta pelo
 * projeto nasce na mesma fonte que a página da decisão lê (sem o 404 projeto → decisão).
 */
import { useEffect } from "react";
import { onSessionChange } from "@/lib/api/client";
import { useOptionalCurrentUser } from "@/lib/session/CurrentUserProvider";
import { DEMO_CURRENT_USER_ID, DEMO_PEOPLE } from "./fixtures";
import { httpRepository } from "./http";
import { demoRepository, type DecisionRepository } from "./repository";
import type { DecisionAggregate, PeopleDirectory } from "./types";

export interface DecisionSource {
  repo: DecisionRepository;
  currentUserId: string;
  people: PeopleDirectory;
  /** sessão ainda restaurando: a tela mostra carregando em vez de trocar de fonte no meio */
  pending: boolean;
}

export function pickDecisionSource(session: ReturnType<typeof useOptionalCurrentUser>): DecisionSource {
  if (session?.status === "authenticated" && session.me?.id) {
    const me = session.me;
    const id: string = session.me.id;
    const name = me.displayName || me.fullName || me.username || id;
    return { repo: httpRepository(id), currentUserId: id, people: { ...DEMO_PEOPLE, [id]: { name } }, pending: false };
  }
  return { repo: demoRepository(), currentUserId: DEMO_CURRENT_USER_ID, people: DEMO_PEOPLE, pending: session?.status === "loading" };
}

// ---------------------------------------------------------------------------------------------- fonte ativa (fora do React)

let active: DecisionRepository | null = null;
const switchListeners = new Set<() => void>();
let sessionHooked = false;

/** Repositório da fonte ativa (a última escolhida por `useDecisionSource`; DEMO até lá e depois do logout). */
export function activeDecisionRepository(): DecisionRepository {
  return active ?? demoRepository();
}

/** Troca a fonte ativa e avisa quem lê fora do React. */
export function setActiveDecisionRepository(repo: DecisionRepository | null) {
  if (repo === active) return;
  active = repo;
  switchListeners.forEach((l) => l());
  if (!sessionHooked && typeof window !== "undefined") {
    sessionHooked = true;
    // sair em qualquer aba volta ao DEMO na hora (nada da conta anterior continua visível)
    onSessionChange((signedIn) => { if (!signedIn) setActiveDecisionRepository(null); });
  }
}

/** Fonte para leitores fora do React (ex.: Memória): lista e assinatura sempre da fonte ativa, reassinando quando ela troca. */
export const activeDecisionSource: { list(): readonly DecisionAggregate[]; subscribe(listener: () => void): () => void } = {
  list: () => activeDecisionRepository().list(),
  subscribe(listener) {
    let off = activeDecisionRepository().subscribe(listener);
    const onSwitch = () => {
      off();
      off = activeDecisionRepository().subscribe(listener);
      listener();
    };
    switchListeners.add(onSwitch);
    return () => {
      switchListeners.delete(onSwitch);
      off();
    };
  },
};

export function useDecisionSource(): DecisionSource {
  const session = useOptionalCurrentUser();
  const source = pickDecisionSource(session);
  const settled = !source.pending;
  useEffect(() => {
    if (settled) setActiveDecisionRepository(source.repo.source === "API" ? source.repo : null);
  }, [source.repo, settled]);
  return source;
}
