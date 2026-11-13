/**
 * O que a pessoa pode tentar AGORA num pacto — espelha as guardas de `rules.ts` para habilitar os botões da tela (a regra
 * continua sendo a fonte de verdade: se algo mudou no meio do caminho, o comando devolve o erro explicável).
 */
import { actingSides, canNegotiate, currentAgreement } from "./access";
import { headOf, type OrgDirectory } from "./org";
import { OPEN_PACT_STATES, otherSide, type CooperationPact, type Side } from "./types";

export interface Availability {
  propose: Side[];
  renegotiate: Side[];
  accept: { proposalId: string; as: Side | "EXECUTOR" }[];
  ask: boolean;
  answer: string[];
  refuse: boolean;
  cancel: boolean;
  limitException: boolean;
  deliver: boolean;
  giveBack: boolean;
  validate: boolean;
  confirmUnblock: boolean;
  recognize: boolean;
  checkin: boolean;
  milestone: boolean;
  completeMilestone: string[];
  escalate: boolean;
  resolve: string[];
  remind: boolean;
}

export function availability(org: OrgDirectory, pact: CooperationPact, userId: string | null): Availability {
  const none: Availability = {
    propose: [], renegotiate: [], accept: [], ask: false, answer: [], refuse: false, cancel: false, limitException: false, deliver: false, giveBack: false,
    validate: false, confirmUnblock: false, recognize: false, checkin: false, milestone: false, completeMilestone: [], escalate: false, resolve: [], remind: false,
  };
  if (!userId) return none;
  const sides = actingSides(org, pact, userId);
  const sol = canNegotiate(org, pact, "SOLICITANTE", userId);
  const dest = canNegotiate(org, pact, "DESTINATARIO", userId);
  const executor = currentAgreement(pact)?.executorId === userId;
  const party = sol || dest || executor;
  const negotiating = pact.status === "SOLICITADO" || pact.status === "EM_NEGOCIACAO";
  const open = [...pact.proposals].reverse().find((p) => p.status === "ABERTA");
  const accept: Availability["accept"] = [];
  if (open) {
    for (const s of sides) if (!open.acceptances[s] && open.acceptances[otherSide(s)]?.userId !== userId) accept.push({ proposalId: open.id, as: s });
    if (open.executorId === userId && !open.acceptances.EXECUTOR) accept.push({ proposalId: open.id, as: "EXECUTOR" });
  }
  const isOpen = OPEN_PACT_STATES.includes(pact.status);
  return {
    propose: negotiating ? sides : [],
    renegotiate: pact.status === "COMPROMETIDO" ? sides : [],
    accept,
    ask: negotiating && dest,
    answer: negotiating && sol ? pact.clarifications.filter((c) => !c.answer).map((c) => c.id) : [],
    refuse: negotiating && dest,
    cancel: (negotiating && sol) || (pact.status === "COMPROMETIDO" && (sol || dest)),
    limitException: negotiating && headOf(org, pact.target.departmentId) === userId && !pact.limitException,
    deliver: pact.status === "COMPROMETIDO" && executor,
    giveBack: pact.status === "ENTREGUE" && sol,
    validate: pact.status === "ENTREGUE" && sol,
    confirmUnblock: pact.status === "VALIDADO" && sol && !pact.unblock,
    recognize: pact.status === "VALIDADO" && sol && !pact.recognition,
    checkin: ["COMPROMETIDO", "ENTREGUE", "VALIDADO"].includes(pact.status) && party,
    milestone: ["COMPROMETIDO", "ENTREGUE"].includes(pact.status) && party,
    completeMilestone: party ? pact.milestones.filter((m) => !m.doneAt).map((m) => m.id) : [],
    escalate: isOpen && party && !pact.escalations.some((e) => e.status === "ABERTA"),
    resolve: pact.escalations.filter((e) => e.status === "ABERTA" && e.targets.includes(userId)).map((e) => e.id),
    remind: isOpen && party,
  };
}
