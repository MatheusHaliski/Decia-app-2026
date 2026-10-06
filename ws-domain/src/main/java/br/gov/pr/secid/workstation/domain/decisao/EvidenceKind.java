package br.gov.pr.secid.workstation.domain.decisao;

/** Tipo de fonte da evidência (§4.2). O spec não enumera os valores; lista mínima proposta (D-53). */
public enum EvidenceKind {
    DOCUMENTO, DADO, NORMA, PESQUISA, ENTREVISTA, TESTE, PRECEDENTE, OUTRO
}
