/**
 * Pactos de Desbloqueio — quem vê e quem age (RF49.CA02, CA09, CA11). Tudo é relido do diretório na hora (lotação e chefia
 * atuais), nunca guardado no pacto. Regras:
 * - negocia por um lado quem o representa: a própria pessoa (PESSOA), os membros (EQUIPE) ou a chefia atual (CHEFIA e
 *   DEPARTAMENTO); a chefia atual da unidade de cada lado também negocia ("chefias atuais dos departamentos envolvidos");
 * - executa quem é da unidade destinatária (ou a própria pessoa destinatária) e aceitou pessoalmente;
 * - vê: quem negocia, executa, abriu, foi chamado num escalonamento; membros da unidade quando a parte é EQUIPE/DEPARTAMENTO;
 *   a conta da empresa. RESTRITO fica só com envolvidos diretos. SIGILOSO exige concessão explícita do proprietário — também
 *   para chefias e administração; ADMIN não lê conteúdo de pacto.
 */
import { companyOwnerOf, departmentOf, headOf, membersOf, type OrgDirectory } from "./org";
import { otherSide, type CooperationPact, type Impediment, type PactParty, type Side } from "./types";

export const partyOf = (pact: Pick<CooperationPact, "requester" | "target">, side: Side): PactParty => (side === "SOLICITANTE" ? pact.requester : pact.target);

/** Representantes diretos da parte (sem contar a chefia da unidade quando a parte é pessoa/equipe). */
export function directRepresentatives(org: OrgDirectory, party: PactParty): string[] {
  switch (party.kind) {
    case "PESSOA":
      return party.userId ? [party.userId] : [];
    case "EQUIPE":
      return membersOf(org, party.departmentId);
    case "CHEFIA":
    case "DEPARTAMENTO": {
      const head = headOf(org, party.departmentId);
      return head ? [head] : [];
    }
  }
}

/** Quem pode negociar por um lado agora: representantes diretos + chefia atual da unidade. */
export function negotiatorsOf(org: OrgDirectory, pact: CooperationPact, side: Side): string[] {
  const party = partyOf(pact, side);
  const out = new Set(directRepresentatives(org, party));
  const head = headOf(org, party.departmentId);
  if (head) out.add(head);
  return [...out].filter((id) => pact.accessClass !== "SIGILOSO" || sigilosoAllowed(pact, id));
}

const sigilosoAllowed = (pact: CooperationPact, userId: string) =>
  userId === pact.requesterId || pact.grants.includes(userId) || (pact.target.kind === "PESSOA" && pact.target.userId === userId);

export const canNegotiate = (org: OrgDirectory, pact: CooperationPact, side: Side, userId: string | null) =>
  !!userId && negotiatorsOf(org, pact, side).includes(userId);

/**
 * Por qual lado a pessoa age por padrão: representante direto do destinatário, depois do solicitante, depois chefia de um dos
 * lados. Quem pode pelos dois lados (ex.: chefia nos dois) escolhe na tela, mas nunca aceita pelos dois na mesma proposta.
 */
export function actingSides(org: OrgDirectory, pact: CooperationPact, userId: string | null): Side[] {
  if (!userId) return [];
  const out: Side[] = [];
  const direct = (s: Side) => directRepresentatives(org, partyOf(pact, s)).includes(userId) && canNegotiate(org, pact, s, userId);
  for (const s of ["DESTINATARIO", "SOLICITANTE"] as const) if (direct(s)) out.push(s);
  for (const s of ["SOLICITANTE", "DESTINATARIO"] as const) if (!out.includes(s) && canNegotiate(org, pact, s, userId)) out.push(s);
  return out;
}

/** Pessoas que podem executar pelo lado destinatário. */
export function validExecutors(org: OrgDirectory, pact: Pick<CooperationPact, "target">): string[] {
  if (pact.target.kind === "PESSOA") return pact.target.userId ? [pact.target.userId] : [];
  return membersOf(org, pact.target.departmentId);
}

export const currentAgreement = (pact: CooperationPact) => pact.agreements.find((a) => !a.supersededAt) ?? null;

export function canSeePact(org: OrgDirectory, pact: CooperationPact, userId: string | null): boolean {
  if (!userId) return false;
  const executor = currentAgreement(pact)?.executorId ?? null;
  if (pact.accessClass === "SIGILOSO") return sigilosoAllowed(pact, userId);
  const direct =
    userId === pact.requesterId ||
    userId === executor ||
    canNegotiate(org, pact, "SOLICITANTE", userId) ||
    canNegotiate(org, pact, "DESTINATARIO", userId) ||
    pact.escalations.some((e) => e.targets.includes(userId)) ||
    pact.proposals.some((p) => p.executorId === userId);
  if (direct) return true;
  if (pact.accessClass === "RESTRITO") return false;
  if (companyOwnerOf(org, pact.companyId) === userId) return true;
  return (["SOLICITANTE", "DESTINATARIO"] as const).some((s) => {
    const party = partyOf(pact, s);
    return (party.kind === "EQUIPE" || party.kind === "DEPARTAMENTO") && membersOf(org, party.departmentId).includes(userId);
  });
}

/** Impedimentos que a pessoa vê: os dela, os que acompanha e, para a chefia, os da unidade (nunca SIGILOSO de outros). */
export function canSeeImpediment(org: OrgDirectory, imp: Impediment, userId: string | null): boolean {
  if (!userId) return false;
  if (imp.ownerId === userId || imp.watchers.includes(userId)) return true;
  if (imp.accessClass === "SIGILOSO") return false;
  return headOf(org, imp.departmentId) === userId;
}

/**
 * "Chefia acima" para escalonar (RF49.CA08): de cada lado, a chefia da unidade; se a parte já é a chefia/departamento — ou quem
 * escala já é a chefia —, sobe para a conta da empresa. Quem escala nunca é destinatário do próprio escalonamento.
 */
export function escalationTargets(org: OrgDirectory, pact: CooperationPact, actorId: string): string[] {
  const out = new Set<string>();
  for (const side of ["SOLICITANTE", "DESTINATARIO"] as const) {
    const party = partyOf(pact, side);
    const head = headOf(org, party.departmentId);
    const partyIsChief = party.kind === "CHEFIA" || party.kind === "DEPARTAMENTO";
    if (head && head !== actorId && !partyIsChief) out.add(head);
    else {
      const owner = companyOwnerOf(org, departmentOf(org, party.departmentId)?.companyId ?? null);
      if (owner && owner !== actorId) out.add(owner);
    }
  }
  return [...out].sort();
}

export { otherSide };
