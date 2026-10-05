package br.gov.pr.secid.workstation.domain.acervo;

import br.gov.pr.secid.workstation.domain.common.StateMachine;

/**
 * Estado da tarefa no acervo (RF41.CA02; diagramas RF4, RF12, RF41). Toda transição grava {@code task_state_log}.
 * OFERECIDA é etiqueta do Balcão (RF40): ao retirar/esgotar a oferta volta a DISPONIVEL ou MODELO_PUBLICO.
 */
public enum TaskState {
    RASCUNHO, DISPONIVEL, EM_USO, BLOQUEADA, CONCLUIDA, ARQUIVADA, MODELO_PUBLICO, OFERECIDA;

    private static final StateMachine<TaskState> MACHINE = StateMachine.of(TaskState.class, "TAREFA_TRANSICAO_INVALIDA")
            .from(RASCUNHO).to(DISPONIVEL, ARQUIVADA)
            .from(DISPONIVEL).to(EM_USO, BLOQUEADA, CONCLUIDA, ARQUIVADA, MODELO_PUBLICO, OFERECIDA)
            .from(EM_USO).to(DISPONIVEL, BLOQUEADA, CONCLUIDA)
            .from(BLOQUEADA).to(EM_USO, DISPONIVEL)
            .from(CONCLUIDA).to(EM_USO, DISPONIVEL, ARQUIVADA, MODELO_PUBLICO, OFERECIDA)
            .from(ARQUIVADA).to(DISPONIVEL, OFERECIDA)
            .from(MODELO_PUBLICO).to(DISPONIVEL, ARQUIVADA, OFERECIDA)
            .from(OFERECIDA).to(DISPONIVEL, MODELO_PUBLICO)
            .build();

    public boolean canTransitionTo(TaskState to) {
        return MACHINE.canTransition(this, to);
    }

    public TaskState transition(TaskState to) {
        return MACHINE.transition(this, to);
    }

    /** CONCLUIDA e ARQUIVADA bloqueiam escrita (409 TAREFA_BLOQUEADA, RF12.CA05); reabrir exige justificativa. */
    public boolean isReadOnly() {
        return this == CONCLUIDA || this == ARQUIVADA;
    }

    /** MODELO_PUBLICO e OFERECIDA travam visibility e accessClass (409 OFERTA_ATIVA). */
    public boolean locksVisibility() {
        return this == MODELO_PUBLICO || this == OFERECIDA;
    }

    public static StateMachine<TaskState> machine() {
        return MACHINE;
    }
}
