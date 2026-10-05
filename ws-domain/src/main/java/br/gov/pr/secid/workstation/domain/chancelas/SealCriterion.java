package br.gov.pr.secid.workstation.domain.chancelas;

/** Critérios estruturados da política de chancela (RF39.CA02). */
public enum SealCriterion {
    CONFORMIDADE_MIN,
    RASTRO_COMPLETO,
    PRAZO_CUMPRIDO,
    REACOES_MIN,
    REUTILIZACOES_MIN,
    DECISAO_VALIDADA,
    SEM_PENDENCIA
}
