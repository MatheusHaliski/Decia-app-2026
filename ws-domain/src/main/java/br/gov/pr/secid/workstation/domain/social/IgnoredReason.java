package br.gov.pr.secid.workstation.domain.social;

/** Por que uma interação não conta para o Hype (RF45.CA03) ou foi marcada pelo antifraude. */
public enum IgnoredReason {
    NAO_VERIFICADO,
    AUTO_INTERACAO,
    ANTIFRAUDE
}
