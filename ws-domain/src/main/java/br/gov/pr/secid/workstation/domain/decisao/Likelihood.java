package br.gov.pr.secid.workstation.domain.decisao;

/** Probabilidade ordinal de um risco ou cenário (§4.2, linhas da matriz §6.6): RARA &lt; POSSIVEL &lt; PROVAVEL &lt; QUASE_CERTA. */
public enum Likelihood {
    RARA, POSSIVEL, PROVAVEL, QUASE_CERTA
}
