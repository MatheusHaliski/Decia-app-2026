package br.gov.pr.secid.workstation.domain.identity;

/** Estado da conta ({@code users.status}, CHECK ck_users_status). */
public enum AccountStatus {
    PENDING_EMAIL_VERIFICATION,
    PENDING_VALIDATION,
    ACTIVE,
    SUSPENDED,
    /** Exclusão pedida (D-18): 30 dias cancelável; login permitido só para cancelar/exportar. */
    DELETION_SCHEDULED,
    ANONYMIZED;

    /** Conta que não pode mais entrar nem renovar sessão: {@code 403 CONTA_INDISPONIVEL} depois da senha certa. */
    public boolean blocksLogin() {
        return this == SUSPENDED || this == ANONYMIZED;
    }
}
