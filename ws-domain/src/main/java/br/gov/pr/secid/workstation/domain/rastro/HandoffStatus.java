package br.gov.pr.secid.workstation.domain.rastro;

import br.gov.pr.secid.workstation.domain.common.StateMachine;

/** Ciclo do Dossiê de Transição (RF36): GERADO → AGUARDANDO_SUCESSOR → TRANSFERIDO | RECUSADO; CANCELADO a qualquer tempo antes de transferir. */
public enum HandoffStatus {
    GERADO, AGUARDANDO_SUCESSOR, TRANSFERIDO, RECUSADO, CANCELADO;

    private static final StateMachine<HandoffStatus> MACHINE = StateMachine.of(HandoffStatus.class, "DOSSIE_TRANSICAO_INVALIDA")
            .from(GERADO).to(AGUARDANDO_SUCESSOR, CANCELADO)
            .from(AGUARDANDO_SUCESSOR).to(TRANSFERIDO, RECUSADO, CANCELADO)
            .from(RECUSADO).to(AGUARDANDO_SUCESSOR, CANCELADO)
            .from(TRANSFERIDO)
            .from(CANCELADO)
            .build();

    public boolean canTransitionTo(HandoffStatus to) {
        return MACHINE.canTransition(this, to);
    }

    public HandoffStatus transition(HandoffStatus to) {
        return MACHINE.transition(this, to);
    }
}
