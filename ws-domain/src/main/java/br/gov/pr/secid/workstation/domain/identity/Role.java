package br.gov.pr.secid.workstation.domain.identity;

/** Papel global da conta (CHECK {@code ck_users_role}); vira o claim {@code role} do JWT e {@code ROLE_<papel>} no Spring Security. */
public enum Role {
    USER,
    ADMIN
}
