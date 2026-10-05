package br.gov.pr.secid.workstation.domain.mensageria;

import br.gov.pr.secid.workstation.domain.common.StateMachine;

/** Estado da atribuição (RF46.CA04): PROPOSTA → ACEITA | RECUSADA; ACEITA → DEVOLVIDA. RECUSADA e DEVOLVIDA exigem motivo. */
public enum AssignmentStatus {
    PROPOSTA, ACEITA, RECUSADA, DEVOLVIDA;

    private static final StateMachine<AssignmentStatus> MACHINE = StateMachine.of(AssignmentStatus.class, "ATRIBUICAO_TRANSICAO_INVALIDA")
            .from(PROPOSTA).to(ACEITA, RECUSADA)
            .from(ACEITA).to(DEVOLVIDA)
            .from(RECUSADA)
            .from(DEVOLVIDA)
            .build();

    public boolean canTransitionTo(AssignmentStatus to) {
        return MACHINE.canTransition(this, to);
    }

    public AssignmentStatus transition(AssignmentStatus to) {
        return MACHINE.transition(this, to);
    }

    public boolean requiresReason() {
        return this == RECUSADA || this == DEVOLVIDA;
    }

    public static StateMachine<AssignmentStatus> machine() {
        return MACHINE;
    }
}
