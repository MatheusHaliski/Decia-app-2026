package br.gov.pr.secid.workstation.domain.social;

/** Seguir é idempotente e reativável (RF14.CA04). */
public enum FollowStatus {
    ATIVO,
    REMOVIDO
}
