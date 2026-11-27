/**
 * "Primeiros passos" (auditoria "Informação e guia da interface", plano "Primeiros passos e home real"): quatro passos com link,
 * guardados nas preferências (`UserPreferences.onboarding`, dentro do `notificationPrefsJson`). Funções puras e testadas.
 *
 * Só "escolher profissão" é detectado sozinho (a profissão preferida está nas mesmas preferências, RF81); os demais a pessoa marca
 * quando fizer — nada é inferido de dado que o sistema não tem.
 */
import { ONBOARDING_STEPS, type OnboardingPrefs, type OnboardingStep, type UserPreferences } from "@/lib/preferences/types";

export interface StepDef { id: OnboardingStep; key: string; href: string }

export const STEPS: readonly StepDef[] = [
  { id: "perfil", key: "profile", href: "/profile" },
  { id: "profissao", key: "occupation", href: "/settings?tab=trabalho" },
  { id: "primeira-tarefa", key: "firstTask", href: "/tasks/new" },
  { id: "melhorias", key: "improvements", href: "/tasks" },
];

/** O passo está feito? (marcado pela pessoa ou, para a profissão, já escolhida nas preferências) */
export function isAutoDone(step: OnboardingStep, prefs: Pick<UserPreferences, "preferredOccupation">): boolean {
  return step === "profissao" && prefs.preferredOccupation !== null;
}

export function isStepDone(step: OnboardingStep, prefs: Pick<UserPreferences, "preferredOccupation" | "onboarding">): boolean {
  return prefs.onboarding.done.includes(step) || isAutoDone(step, prefs);
}

export function progressOf(prefs: Pick<UserPreferences, "preferredOccupation" | "onboarding">): { done: number; total: number } {
  return { done: ONBOARDING_STEPS.filter((s) => isStepDone(s, prefs)).length, total: ONBOARDING_STEPS.length };
}

/** Marca ou desmarca um passo, sem repetição e na ordem do catálogo. */
export function toggleStep(onb: OnboardingPrefs, step: OnboardingStep, on: boolean): OnboardingPrefs {
  const set = new Set(onb.done);
  if (on) set.add(step);
  else set.delete(step);
  return { ...onb, done: ONBOARDING_STEPS.filter((s) => set.has(s)) };
}

export const dismiss = (onb: OnboardingPrefs, dismissed = true): OnboardingPrefs => ({ ...onb, dismissed });
