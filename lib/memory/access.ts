/**
 * Memória Institucional (RF33.CA02) — o que cada perfil de visualização (D-35) pode ler. Segue a Norma de classificação do
 * corpus e a regra do app: PÚBLICO para todos; INTERNO para quem tem conta; RESTRITO só da própria unidade (a conta EMPRESA lê
 * os de todas as unidades); SIGILOSO nunca entra na busca sem concessão explícita do responsável (não modelada no DEMO, então
 * nunca aparece). ADMIN administra o sistema, não lê conteúdo restrito. A busca filtra ANTES de pontuar: o que a pessoa não
 * pode ler não aparece nem nas contagens do explorador.
 */
import type { ViewerProfile, ViewerUser } from "@/lib/viewer/profiles";
import type { AccessClass, MemoryQueryOptions } from "./types";

export interface MemoryAccess {
  readable: readonly AccessClass[];
  /** unidades cujos documentos RESTRITO a pessoa lê; `undefined` = todas (conta EMPRESA) */
  restrictedTo?: readonly string[];
}

export function memoryAccessFor(profile: ViewerProfile, user?: Pick<ViewerUser, "departmentAcronym"> | null): MemoryAccess {
  switch (profile) {
    case "VISITANTE":
      return { readable: ["PUBLICO"] };
    case "ADMIN":
      return { readable: ["PUBLICO", "INTERNO"] };
    case "EMPRESA":
      return { readable: ["PUBLICO", "INTERNO", "RESTRITO"] };
    default: {
      const dept = user?.departmentAcronym ?? null;
      return dept ? { readable: ["PUBLICO", "INTERNO", "RESTRITO"], restrictedTo: [dept] } : { readable: ["PUBLICO", "INTERNO"] };
    }
  }
}

/** Opções de consulta com o acesso do perfil (somadas às facetas escolhidas). */
export const withAccess = (access: MemoryAccess, opts: MemoryQueryOptions = {}): MemoryQueryOptions => ({
  ...opts,
  readable: access.readable,
  restrictedTo: access.restrictedTo,
});

/** Quem pode acrescentar documentos ao índice DEMO, e com quais classes (nunca acima do que lê, nunca SIGILOSO). */
export function ingestClassesFor(access: MemoryAccess, profile: ViewerProfile): readonly AccessClass[] {
  if (profile === "VISITANTE") return [];
  return access.readable.filter((c) => c !== "SIGILOSO");
}
