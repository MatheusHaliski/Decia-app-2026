package br.gov.pr.secid.workstation.domain.identity;

/** Tipo de perfil escolhido no cadastro (RF1.CA01; TAXONOMIA §1.1). ADMIN não é tipo: é papel ({@link Role}). */
public enum ProfileType {
    EMPREGADO,
    /** Nasce {@code PENDING_VALIDATION}: um ADMIN valida (RF28). */
    EMPRESA,
    /** Nasce {@code PENDING_VALIDATION}: um ADMIN valida (RF28). */
    CHEFE_DEPARTAMENTO;

    public boolean requiresValidation() {
        return this != EMPREGADO;
    }
}
