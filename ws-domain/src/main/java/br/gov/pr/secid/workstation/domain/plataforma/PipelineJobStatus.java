package br.gov.pr.secid.workstation.domain.plataforma;

import br.gov.pr.secid.workstation.domain.common.StateMachine;

/** Ciclo do job assíncrono (RF3.CA05 diagrama): PENDENTE → RODANDO → OK | FALHA → REPROCESSAR → RODANDO. */
public enum PipelineJobStatus {
    PENDENTE, RODANDO, OK, FALHA, REPROCESSAR;

    private static final StateMachine<PipelineJobStatus> MACHINE = StateMachine.of(PipelineJobStatus.class, "JOB_TRANSICAO_INVALIDA")
            .from(PENDENTE).to(RODANDO)
            .from(RODANDO).to(OK, FALHA)
            .from(FALHA).to(REPROCESSAR)
            .from(REPROCESSAR).to(RODANDO)
            .from(OK)
            .build();

    public boolean canTransitionTo(PipelineJobStatus to) {
        return MACHINE.canTransition(this, to);
    }

    public PipelineJobStatus transition(PipelineJobStatus to) {
        return MACHINE.transition(this, to);
    }
}
