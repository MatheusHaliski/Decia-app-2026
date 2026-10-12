package br.gov.pr.secid.workstation.domain.decisao;

/** Alvo de um {@code EvidenceLink} (§4.2): a mesma evidência pode sustentar A e contradizer B. */
public enum EvidenceTarget {
    ALTERNATIVA, CRITERIO, PREMISSA, RISCO, AVALIACAO
}
