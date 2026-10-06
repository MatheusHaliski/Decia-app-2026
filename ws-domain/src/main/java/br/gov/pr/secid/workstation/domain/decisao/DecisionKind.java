package br.gov.pr.secid.workstation.domain.decisao;

/**
 * Natureza da decisão estruturada (03_MODELO_FUNCIONAL §4.2). O spec não enumera os valores: horizonte clássico
 * estratégico/tático/operacional (D-53).
 */
public enum DecisionKind {
    ESTRATEGICA, TATICA, OPERACIONAL
}
