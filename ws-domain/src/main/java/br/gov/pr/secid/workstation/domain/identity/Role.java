package br.gov.pr.secid.workstation.domain.identity;

/** Papel global ({@code users.role}, CHECK ck_users_role). Vai no claim {@code role} do JWT → {@code ROLE_*}. */
public enum Role {
    USER,
    ADMIN
}
