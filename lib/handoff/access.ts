/**
 * Quem faz o quê no Dossiê de Transição (ABAS_POR_PERFIL §2.5, linha "Dossiês de transição"; RF36): EMPRESA e CHEFE geram e
 * conduzem o dossiê de qualquer pessoa da equipe (`requireIssuer` no backend planejado); EMPREGADO vê os seus — como titular ou como
 * sucessor — e pode gerar o próprio (ao sair ou mudar de setor); ADMIN só consulta; CURADOR e VISITANTE não têm a página (O).
 * O mundo DEMO usa o diretório de pessoas do DECIA e da Mesa: o EMPREGADO do laboratório é a "Pessoa Exemplo" (`u-pessoa`).
 */
import { DEMO_CURRENT_USER_ID, DEMO_PEOPLE } from "@/lib/decia/fixtures";
import type { ViewerProfile } from "@/lib/viewer/profiles";
import type { HandoffDossier, HandoffPerson } from "./types";
import { successorsOf } from "./workflow";

/** Diretório de pessoas do dossiê (nome apenas). */
export const HANDOFF_PEOPLE: Readonly<Record<string, { name: string }>> = DEMO_PEOPLE;
/** A própria pessoa no mundo DEMO (o EMPREGADO do laboratório). */
export const SELF_ID = DEMO_CURRENT_USER_ID;

export const peopleList = (): HandoffPerson[] =>
  Object.entries(HANDOFF_PEOPLE).map(([id, p]) => ({ id, name: p.name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

/** Quem está agindo: o EMPREGADO é a própria pessoa do diretório; os demais perfis agem pela conta deles (fora do diretório). */
export function actorFor(profile: ViewerProfile, displayName: string): HandoffPerson {
  if (profile === "EMPREGADO") return { id: SELF_ID, name: displayName || HANDOFF_PEOPLE[SELF_ID]!.name };
  return { id: `viewer:${profile}`, name: displayName };
}

/** Pode gerar dossiê? EMPRESA e CHEFE de qualquer pessoa; EMPREGADO só o próprio. */
export const canGenerate = (profile: ViewerProfile) => profile === "EMPRESA" || profile === "CHEFE" || profile === "EMPREGADO";
/** Pessoas de quem o perfil pode gerar o dossiê. */
export const subjectsFor = (profile: ViewerProfile): HandoffPerson[] =>
  profile === "EMPRESA" || profile === "CHEFE" ? peopleList() : profile === "EMPREGADO" ? peopleList().filter((p) => p.id === SELF_ID) : [];

/** Vê o dossiê? EMPREGADO só os seus (titular ou sucessor); EMPRESA, CHEFE e ADMIN, todos os da empresa. */
export function canView(profile: ViewerProfile, d: HandoffDossier): boolean {
  if (profile === "EMPRESA" || profile === "CHEFE" || profile === "ADMIN") return true;
  if (profile === "EMPREGADO") return d.subjectId === SELF_ID || d.requestedById === SELF_ID || successorsOf(d).includes(SELF_ID);
  return false;
}

/** Conduz o dossiê (sucessores, checklist, envio, cancelamento)? Quem pode gerar; o EMPREGADO, só o que ele mesmo pediu. */
export const canManage = (profile: ViewerProfile, d: HandoffDossier, actorId: string) =>
  profile === "EMPRESA" || profile === "CHEFE" || (profile === "EMPREGADO" && d.requestedById === actorId);
