package br.gov.pr.secid.workstation.domain.decisao;

/** Estado do risco (§4.2); só ABERTO entra no risco da decisão (§6.6). */
public enum RiskStatus {
    ABERTO, MITIGADO, ACEITO, OCORREU, ENCERRADO
}
