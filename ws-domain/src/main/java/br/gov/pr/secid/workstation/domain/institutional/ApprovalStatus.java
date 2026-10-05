package br.gov.pr.secid.workstation.domain.institutional;

import br.gov.pr.secid.workstation.domain.common.StateMachine;

/**
 * Estado da validação de perfil EMPRESA/CHEFE (RF28.CA01, CA09–CA17; D-19). PENDENTE → AJUSTES | APROVADO | RECUSADO;
 * AJUSTES → PENDENTE (reenvio) | RECUSADO (30 d sem resposta) | ESGOTADO (5 envios); RECUSADO → PENDENTE | ESGOTADO;
 * ESGOTADO → PENDENTE (só ADMIN reabre). APROVADO é final.
 */
public enum ApprovalStatus {
    PENDENTE, AJUSTES, APROVADO, RECUSADO, ESGOTADO;

    private static final StateMachine<ApprovalStatus> MACHINE = StateMachine.of(ApprovalStatus.class, "VALIDACAO_TRANSICAO_INVALIDA")
            .from(PENDENTE).to(AJUSTES, APROVADO, RECUSADO)
            .from(AJUSTES).to(PENDENTE, RECUSADO, ESGOTADO)
            .from(RECUSADO).to(PENDENTE, ESGOTADO)
            .from(ESGOTADO).to(PENDENTE)
            .from(APROVADO)
            .build();

    public boolean canTransitionTo(ApprovalStatus to) {
        return MACHINE.canTransition(this, to);
    }

    public ApprovalStatus transition(ApprovalStatus to) {
        return MACHINE.transition(this, to);
    }

    /** AJUSTES e RECUSADO exigem motivo (422 VALIDACAO details.reasons). */
    public boolean requiresReason() {
        return this == AJUSTES || this == RECUSADO;
    }

    public static StateMachine<ApprovalStatus> machine() {
        return MACHINE;
    }
}
