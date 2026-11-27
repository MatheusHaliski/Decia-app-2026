"use client";
/**
 * Escolha do repositório de decisões (fase 7): com sessão autenticada, a API real (`source: "API"`, lib/decia/http.ts) e o id da
 * pessoa logada; sem sessão — o laboratório com perfil de visualização —, o DEMO em memória e a pessoa fictícia. O selo DEMO só
 * aparece quando `source === "DEMO"`.
 */
import { useOptionalCurrentUser } from "@/lib/session/CurrentUserProvider";
import { DEMO_CURRENT_USER_ID, DEMO_PEOPLE } from "./fixtures";
import { httpRepository } from "./http";
import { demoRepository, type DecisionRepository } from "./repository";
import type { PeopleDirectory } from "./types";

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

export function useDecisionSource(): DecisionSource {
  return pickDecisionSource(useOptionalCurrentUser());
}
