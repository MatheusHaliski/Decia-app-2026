/**
 * Manifesto de proveniência (C2PA / IPTC) da peça. Gera o conteúdo do manifesto a partir do resultado de autoria;
 * a ASSINATURA é feita no servidor (não implementada aqui): `signature` fica ausente e `signed` é falso.
 * Nada de prompts, modelo ou logs no manifesto público.
 */
import type { AuthorshipResult } from "./authorship";

/** URIs IPTC Digital Source Type (verificar contra a edição vigente antes de publicar). */
export const IPTC_DIGITAL_SOURCE = {
  HUMAN: "http://cv.iptc.org/newscodes/digitalsourcetype/digitalCreation",
  HUMAN_ASSISTED: "http://cv.iptc.org/newscodes/digitalsourcetype/computerGraphic",
  HYBRID: "http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia",
  AI_DIRECTED: "http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia",
  AI_FULL: "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
} as const;

export interface ProvenanceManifest {
  claimGenerator: string;
  title: string;
  pieceId: string;
  revisionId: string;
  createdAt: string;
  authorship: { category: AuthorshipResult["category"]; aiShare: number | null; ruleVersion: string };
  assertions: { label: string; data: Record<string, unknown> }[];
  /** SHA-256 da cadeia de eventos (último hash), vínculo com o log de autoria */
  eventChainHead: string | null;
  signed: boolean;
  signature?: string;
}

export function buildProvenanceManifest(input: { pieceId: string; revisionId: string; title: string; authorship: AuthorshipResult; eventChainHead: string | null; createdAt: string; claimGenerator?: string }): ProvenanceManifest {
  const { authorship } = input;
  const source = authorship.category in IPTC_DIGITAL_SOURCE ? IPTC_DIGITAL_SOURCE[authorship.category as keyof typeof IPTC_DIGITAL_SOURCE] : null;
  const assertions: ProvenanceManifest["assertions"] = [
    { label: "c2pa.actions", data: { actions: [{ action: authorship.category === "IMPORTED" ? "c2pa.opened" : "c2pa.created" }] } },
  ];
  if (source) assertions.push({ label: "iptc.digitalSourceType", data: { digitalSourceType: source } });
  else assertions.push({ label: "decia.unverified", data: { reason: "autoria não verificável" } });
  return {
    claimGenerator: input.claimGenerator ?? "DECIA",
    title: input.title,
    pieceId: input.pieceId,
    revisionId: input.revisionId,
    createdAt: input.createdAt,
    authorship: { category: authorship.category, aiShare: authorship.aiShare, ruleVersion: authorship.ruleVersion },
    assertions,
    eventChainHead: input.eventChainHead,
    signed: false,
  };
}
