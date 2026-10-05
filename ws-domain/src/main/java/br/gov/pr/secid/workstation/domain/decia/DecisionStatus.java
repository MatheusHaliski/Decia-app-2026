package br.gov.pr.secid.workstation.domain.decia;

import br.gov.pr.secid.workstation.domain.common.StateMachine;

/**
 * Estado da decisão final (RF12, RF14, RF15). PROPOSTA → EM_REVISAO → VALIDADA | DEVOLVIDA; qualquer não-final →
 * SUBSTITUIDA quando uma nova proposta a substitui (reabertura aceita, RF14).
 */
public enum DecisionStatus {
    PROPOSTA, EM_REVISAO, VALIDADA, DEVOLVIDA, SUBSTITUIDA;

    private static final StateMachine<DecisionStatus> MACHINE = StateMachine.of(DecisionStatus.class, "DECISAO_TRANSICAO_INVALIDA")
            .from(PROPOSTA).to(EM_REVISAO, SUBSTITUIDA)
            .from(EM_REVISAO).to(VALIDADA, DEVOLVIDA)
            .from(DEVOLVIDA).to(SUBSTITUIDA, EM_REVISAO)
            .from(VALIDADA).to(SUBSTITUIDA)
            .from(SUBSTITUIDA)
            .build();

    public boolean canTransitionTo(DecisionStatus to) {
        return MACHINE.canTransition(this, to);
    }

    public DecisionStatus transition(DecisionStatus to) {
        return MACHINE.transition(this, to);
    }

    public static StateMachine<DecisionStatus> machine() {
        return MACHINE;
    }
}
