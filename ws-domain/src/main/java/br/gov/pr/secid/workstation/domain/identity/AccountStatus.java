package br.gov.pr.secid.workstation.domain.identity;

/** Estado da conta (CHECK {@code ck_users_status}). Só {@link #ACTIVE} entra; os demais recebem 403 depois da senha certa (SEG RN49.02). */
public enum AccountStatus {
    PENDING_EMAIL_VERIFICATION,
    PENDING_VALIDATION,
    ACTIVE,
    SUSPENDED,
    DELETION_SCHEDULED,
    ANONYMIZED;

    public boolean canLogin() {
        return this == ACTIVE;
    }
}
