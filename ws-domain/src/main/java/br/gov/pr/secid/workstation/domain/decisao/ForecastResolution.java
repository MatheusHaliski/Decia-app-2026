package br.gov.pr.secid.workstation.domain.decisao;

/** Resolução de uma previsão (§4.2); só OCORREU/NAO_OCORREU entram no Brier (§6.9). */
public enum ForecastResolution {
    PENDENTE, OCORREU, NAO_OCORREU, ANULADA
}
