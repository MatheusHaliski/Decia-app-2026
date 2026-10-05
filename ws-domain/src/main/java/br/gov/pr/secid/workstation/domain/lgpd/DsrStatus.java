package br.gov.pr.secid.workstation.domain.lgpd;

import br.gov.pr.secid.workstation.domain.common.StateMachine;

/** Estado do pedido do titular (RF3 bloco C): ABERTA → EM_ANALISE → RESPONDIDA | RECUSADA → ENCERRADA. */
public enum DsrStatus {
    ABERTA, EM_ANALISE, RESPONDIDA, RECUSADA, ENCERRADA;

    private static final StateMachine<DsrStatus> MACHINE = StateMachine.of(DsrStatus.class, "DSR_TRANSICAO_INVALIDA")
            .from(ABERTA).to(EM_ANALISE, RECUSADA, ENCERRADA)
            .from(EM_ANALISE).to(RESPONDIDA, RECUSADA)
            .from(RESPONDIDA).to(ENCERRADA)
            .from(RECUSADA).to(ENCERRADA)
            .from(ENCERRADA)
            .build();

    public boolean canTransitionTo(DsrStatus to) {
        return MACHINE.canTransition(this, to);
    }

    public DsrStatus transition(DsrStatus to) {
        return MACHINE.transition(this, to);
    }
}
