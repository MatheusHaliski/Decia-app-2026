package br.gov.pr.secid.workstation.domain.rastro;

/** Tipo de nó do Rastro de Decisão (RF29; cor do nó RF38.CA07). */
public enum TraceNodeType {
    MENSAGEM,
    CLASSIFICACAO,
    DIVERGENCIA,
    PERGUNTA,
    RESUMO,
    CENARIO,
    DECISAO,
    REVISAO,
    TAREFA,
    PROJETO,
    ARTEFATO,
    ATA_VIVA,
    CONFORMIDADE
}
