package br.gov.pr.secid.workstation.domain.lgpd;

import br.gov.pr.secid.workstation.domain.common.StateMachine;

/** Estado da exportação de dados (RF3, D-20): REQUESTED → PROCESSING → READY → EXPIRED | PROCESSING → FAILED. */
public enum ExportStatus {
    REQUESTED, PROCESSING, READY, EXPIRED, FAILED;

    private static final StateMachine<ExportStatus> MACHINE = StateMachine.of(ExportStatus.class, "EXPORTACAO_TRANSICAO_INVALIDA")
            .from(REQUESTED).to(PROCESSING, FAILED)
            .from(PROCESSING).to(READY, FAILED)
            .from(READY).to(EXPIRED)
            .from(EXPIRED)
            .from(FAILED)
            .build();

    public boolean canTransitionTo(ExportStatus to) {
        return MACHINE.canTransition(this, to);
    }

    public ExportStatus transition(ExportStatus to) {
        return MACHINE.transition(this, to);
    }

    public boolean isDownloadable() {
        return this == READY;
    }

    public static StateMachine<ExportStatus> machine() {
        return MACHINE;
    }
}
