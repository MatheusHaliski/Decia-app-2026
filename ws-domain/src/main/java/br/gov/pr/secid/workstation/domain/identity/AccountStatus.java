package br.gov.pr.secid.workstation.domain.identity;

import br.gov.pr.secid.workstation.domain.common.StateMachine;

/**
 * Estado da conta ({@code users.status}, CHECK ck_users_status; RF1, RF3, RF28, D-18). Máquina: PENDING_EMAIL_VERIFICATION →
 * ACTIVE | PENDING_VALIDATION; PENDING_VALIDATION → ACTIVE | SUSPENDED; ACTIVE ⇄ SUSPENDED; ACTIVE ⇄ DELETION_SCHEDULED →
 * ANONYMIZED (final; nunca há DELETE de users).
 */
public enum AccountStatus {
    PENDING_EMAIL_VERIFICATION,
    PENDING_VALIDATION,
    ACTIVE,
    SUSPENDED,
    /** Exclusão pedida (D-18): 30 dias cancelável; login permitido só para cancelar/exportar. */
    DELETION_SCHEDULED,
    ANONYMIZED;

    private static final StateMachine<AccountStatus> MACHINE = StateMachine.of(AccountStatus.class, "CONTA_TRANSICAO_INVALIDA")
            .from(PENDING_EMAIL_VERIFICATION).to(ACTIVE, PENDING_VALIDATION)
            .from(PENDING_VALIDATION).to(ACTIVE, SUSPENDED)
            .from(ACTIVE).to(SUSPENDED, DELETION_SCHEDULED)
            .from(SUSPENDED).to(ACTIVE)
            .from(DELETION_SCHEDULED).to(ACTIVE, ANONYMIZED)
            .from(ANONYMIZED)
            .build();

    /** Conta que não pode mais entrar nem renovar sessão: {@code 403 CONTA_INDISPONIVEL} depois da senha certa. */
    public boolean blocksLogin() {
        return this == SUSPENDED || this == ANONYMIZED;
    }

    public boolean canTransitionTo(AccountStatus to) {
        return MACHINE.canTransition(this, to);
    }

    public AccountStatus transition(AccountStatus to) {
        return MACHINE.transition(this, to);
    }

    public static StateMachine<AccountStatus> machine() {
        return MACHINE;
    }
}
