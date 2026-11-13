/**
 * Quem pode o quê nas chancelas (RF39, ABAS_POR_PERFIL Matriz A e §6; guards D-14 do README): EMPRESA e CHEFE criam chancelas e
 * publicam benefícios (EMPREGADO recebe 403 no criador); cada emissor concede e revisa as próprias chancelas; o CURADOR opera a
 * fila e a premiação em nome do chefe do próprio departamento (RF28.CA03), nunca as da EMPRESA, e não revisa item em que está
 * envolvido (conflito de interesse); quem tem saldo próprio (EMPREGADO, CHEFE, CURADOR) resgata benefícios; ADMIN só lê.
 */
import type { ViewerProfile } from "@/lib/viewer/profiles";
import type { Seal, SealActor, SealBond } from "./types";

export const canCreateSeal = (profile: ViewerProfile) => profile === "EMPRESA" || profile === "CHEFE";
export const isIssuerOf = (actor: Pick<SealActor, "id">, seal: Pick<Seal, "issuerId">) => actor.id === seal.issuerId;

const curatorOf = (actor: SealActor, seal: Pick<Seal, "department">) => actor.profile === "CURADOR" && seal.department !== null && actor.department === seal.department;

/** Conceder por vínculo sugerido ou por política: só o emissor. */
export const canGrantSeal = (actor: SealActor, seal: Seal) => isIssuerOf(actor, seal);
/** Premiação (Excelência, RF39.CA05): o emissor ou o curador do departamento. */
export const canAwardSeal = (actor: SealActor, seal: Seal) => isIssuerOf(actor, seal) || curatorOf(actor, seal);
/** Revisar um vínculo da fila: o emissor ou o curador do departamento. */
export const canReviewSeal = (actor: SealActor, seal: Seal) => isIssuerOf(actor, seal) || curatorOf(actor, seal);
/** Conflito de interesse: quem indicou ou está envolvido no item não revisa. */
export const conflictOfInterest = (actor: Pick<SealActor, "id">, bond: Pick<SealBond, "requestedBy" | "involvedIds" | "targetOwnerId" | "issuerId">) =>
  actor.id !== bond.issuerId && (bond.requestedBy === actor.id || bond.targetOwnerId === actor.id || bond.involvedIds.includes(actor.id));

export const canSeeReviewQueue = (profile: ViewerProfile) => profile === "EMPRESA" || profile === "CHEFE" || profile === "CURADOR" || profile === "ADMIN";
export const canRedeemBenefits = (profile: ViewerProfile) => profile === "EMPREGADO" || profile === "CHEFE" || profile === "CURADOR";
export const canPublishBenefit = (actor: SealActor, seal: Seal) => canCreateSeal(actor.profile) && isIssuerOf(actor, seal);
