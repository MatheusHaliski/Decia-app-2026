package br.gov.pr.secid.workstation.domain.decia;

import br.gov.pr.secid.workstation.domain.common.StateMachine;

/**
 * Estado da sessão DECIA (RF4–RF17; TAXONOMIA §13). PROPOSTA → ATIVA → EM_RESUMO (RF11) → EM_DECISAO (RF12) → EM_REVISAO (RF15)
 * → ENCERRADA (validada) | ATIVA (devolvida); ENCERRADA → REABERTA (RF14) → ATIVA; ATIVA → ENCERRADA sem decisão (RF17);
 * ENCERRADA → ARQUIVADA (histórico exportado). Derivada das HUs: confirmar (Q-124).
 */
public enum SessionStatus {
    PROPOSTA, ATIVA, EM_RESUMO, EM_DECISAO, EM_REVISAO, REABERTA, ENCERRADA, ARQUIVADA;

    private static final StateMachine<SessionStatus> MACHINE = StateMachine.of(SessionStatus.class, "SESSAO_TRANSICAO_INVALIDA")
            .from(PROPOSTA).to(ATIVA, ARQUIVADA)
            .from(ATIVA).to(EM_RESUMO, ENCERRADA)
            .from(EM_RESUMO).to(EM_DECISAO, ATIVA)
            .from(EM_DECISAO).to(EM_REVISAO, ATIVA)
            .from(EM_REVISAO).to(ENCERRADA, ATIVA)
            .from(ENCERRADA).to(REABERTA, ARQUIVADA)
            .from(REABERTA).to(ATIVA)
            .from(ARQUIVADA)
            .build();

    public boolean canTransitionTo(SessionStatus to) {
        return MACHINE.canTransition(this, to);
    }

    public SessionStatus transition(SessionStatus to) {
        return MACHINE.transition(this, to);
    }

    /** Mensagens só em ATIVA e REABERTA (RF6). */
    public boolean acceptsMessages() {
        return this == ATIVA || this == REABERTA;
    }

    public static StateMachine<SessionStatus> machine() {
        return MACHINE;
    }
}
