package br.gov.pr.secid.workstation.domain.identity;

/** Perfil da conta (RF1, RF28): EMPRESA e CHEFE_DEPARTAMENTO passam pela validação do ADMIN. */
public enum ProfileType {
    EMPREGADO, EMPRESA, CHEFE_DEPARTAMENTO;

    public boolean requiresValidation() {
        return this != EMPREGADO;
    }
}
