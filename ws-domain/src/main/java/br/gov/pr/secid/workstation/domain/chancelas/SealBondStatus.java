package br.gov.pr.secid.workstation.domain.chancelas;

import br.gov.pr.secid.workstation.domain.common.StateMachine;

/**
 * Máquina de estados do Vínculo de Chancela (RF39 diagrama; D-06 = FAI SealBond + APROVADA_PRIVADA, REVOGADA, EXPIRADA).
 * SUGERIDA → ACEITA | EDITADA | RECUSADA | EXPIRADA; RECUSADA → ACEITA; ACEITA/EDITADA → EM_REVISAO (requiresReview) | APROVADA |
 * APROVADA_PRIVADA (autoIssued); EM_REVISAO → APROVADA | APROVADA_PRIVADA | REJEITADA; APROVADA ⇄ APROVADA_PRIVADA;
 * APROVADA(_PRIVADA) → REVOGADA | EXPIRADA. REJEITADA, REVOGADA e EXPIRADA são finais.
 */
public enum SealBondStatus {
    SUGERIDA, ACEITA, EDITADA, RECUSADA, EM_REVISAO, APROVADA, APROVADA_PRIVADA, REJEITADA, REVOGADA, EXPIRADA;

    private static final StateMachine<SealBondStatus> MACHINE = StateMachine.of(SealBondStatus.class, "CHANCELA_TRANSICAO_INVALIDA")
            .from(SUGERIDA).to(ACEITA, EDITADA, RECUSADA, EXPIRADA)
            .from(RECUSADA).to(ACEITA)
            .from(ACEITA).to(EM_REVISAO, APROVADA, APROVADA_PRIVADA)
            .from(EDITADA).to(EM_REVISAO, APROVADA, APROVADA_PRIVADA)
            .from(EM_REVISAO).to(APROVADA, APROVADA_PRIVADA, REJEITADA)
            .from(APROVADA).to(APROVADA_PRIVADA, REVOGADA, EXPIRADA)
            .from(APROVADA_PRIVADA).to(APROVADA, REVOGADA, EXPIRADA)
            .from(REJEITADA)
            .from(REVOGADA)
            .from(EXPIRADA)
            .build();

    public boolean canTransitionTo(SealBondStatus to) {
        return MACHINE.canTransition(this, to);
    }

    public SealBondStatus transition(SealBondStatus to) {
        return MACHINE.transition(this, to);
    }

    /** Conta para métricas e benefícios; só APROVADA mostra o lacre público (MODELO_PUBLICO, prateleira CHANCELADO). */
    public boolean isApproved() {
        return this == APROVADA || this == APROVADA_PRIVADA;
    }

    public static StateMachine<SealBondStatus> machine() {
        return MACHINE;
    }
}
