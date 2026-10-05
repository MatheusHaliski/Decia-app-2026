package br.gov.pr.secid.workstation.domain.projetos;

import br.gov.pr.secid.workstation.domain.common.StateMachine;

/**
 * Estado do Esquema de Projeto (RF21, RF22 diagrama de estados, RF29). CONCLUIDO e ARQUIVADO bloqueiam edição
 * (409 PROJETO_BLOQUEADO); reabrir exige justificativa (ProjectVersion.reason + AuditLog PROJECT_REOPEN).
 */
public enum ProjectStatus {
    RASCUNHO, PUBLICADO, EM_DECISAO, APROVADO, EM_EXECUCAO, CONCLUIDO, ARQUIVADO, DEVOLVIDO;

    private static final StateMachine<ProjectStatus> MACHINE = StateMachine.of(ProjectStatus.class, "PROJETO_TRANSICAO_INVALIDA")
            .from(RASCUNHO).to(PUBLICADO, CONCLUIDO, ARQUIVADO)
            .from(PUBLICADO).to(EM_DECISAO, EM_EXECUCAO, CONCLUIDO, ARQUIVADO)
            .from(EM_DECISAO).to(APROVADO, DEVOLVIDO, ARQUIVADO)
            .from(DEVOLVIDO).to(EM_DECISAO, PUBLICADO, ARQUIVADO)
            .from(APROVADO).to(EM_EXECUCAO, CONCLUIDO, ARQUIVADO)
            .from(EM_EXECUCAO).to(CONCLUIDO, ARQUIVADO)
            .from(CONCLUIDO).to(ARQUIVADO, EM_EXECUCAO)
            .from(ARQUIVADO).to(PUBLICADO)
            .build();

    public boolean canTransitionTo(ProjectStatus to) {
        return MACHINE.canTransition(this, to);
    }

    public ProjectStatus transition(ProjectStatus to) {
        return MACHINE.transition(this, to);
    }

    public boolean isLocked() {
        return this == CONCLUIDO || this == ARQUIVADO;
    }

    public static StateMachine<ProjectStatus> machine() {
        return MACHINE;
    }
}
