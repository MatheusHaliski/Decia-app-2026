package br.gov.pr.secid.workstation.domain.identity;

/** Tipo de perfil escolhido no cadastro (RF1, TAXONOMIA §1.1; CHECK {@code ck_users_profile_type}). */
public enum ProfileType {
    EMPREGADO,
    EMPRESA,
    CHEFE_DEPARTAMENTO
}
