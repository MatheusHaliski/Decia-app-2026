package br.gov.pr.secid.workstation.domain.statemachine;

import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import br.gov.pr.secid.workstation.domain.chancelas.SealBondStatus;
import br.gov.pr.secid.workstation.domain.common.InvalidTransitionException;
import br.gov.pr.secid.workstation.domain.decia.DecisionStatus;
import br.gov.pr.secid.workstation.domain.decia.SessionStatus;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.institutional.ApprovalStatus;
import br.gov.pr.secid.workstation.domain.lgpd.DsrStatus;
import br.gov.pr.secid.workstation.domain.lgpd.ExportStatus;
import br.gov.pr.secid.workstation.domain.mensageria.AssignmentStatus;
import br.gov.pr.secid.workstation.domain.plataforma.PipelineJobStatus;
import br.gov.pr.secid.workstation.domain.projetos.ProjectStatus;
import br.gov.pr.secid.workstation.domain.rastro.HandoffStatus;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Máquinas de estado explícitas dos enums de status (ARQUITETURA §3): caminhos felizes dos diagramas dos RFs e transições proibidas. */
class DomainStateMachinesTest {

    @Test
    void tarefaRf41() {
        assertThat(TaskState.RASCUNHO.transition(TaskState.DISPONIVEL).transition(TaskState.EM_USO).transition(TaskState.BLOQUEADA)
                .transition(TaskState.EM_USO).transition(TaskState.CONCLUIDA).transition(TaskState.MODELO_PUBLICO).transition(TaskState.OFERECIDA)
                .transition(TaskState.MODELO_PUBLICO).transition(TaskState.ARQUIVADA).transition(TaskState.DISPONIVEL)).isEqualTo(TaskState.DISPONIVEL);
        assertThat(TaskState.ARQUIVADA.canTransitionTo(TaskState.OFERECIDA)).as("repasse RF40.CA05").isTrue();
        assertThat(TaskState.CONCLUIDA.canTransitionTo(TaskState.EM_USO)).as("reabertura").isTrue();
        assertThat(TaskState.RASCUNHO.canTransitionTo(TaskState.EM_USO)).isFalse();
        assertThat(TaskState.BLOQUEADA.canTransitionTo(TaskState.CONCLUIDA)).isFalse();
        assertThatThrownBy(() -> TaskState.RASCUNHO.transition(TaskState.CONCLUIDA)).isInstanceOf(InvalidTransitionException.class)
                .hasMessageContaining("TAREFA_TRANSICAO_INVALIDA");
        assertThat(TaskState.CONCLUIDA.isReadOnly()).isTrue();
        assertThat(TaskState.OFERECIDA.locksVisibility()).isTrue();
        assertThat(TaskState.machine().isTerminal(TaskState.ARQUIVADA)).isFalse();
    }

    @Test
    void projetoRf22() {
        assertThat(ProjectStatus.RASCUNHO.transition(ProjectStatus.PUBLICADO).transition(ProjectStatus.EM_DECISAO).transition(ProjectStatus.DEVOLVIDO)
                .transition(ProjectStatus.EM_DECISAO).transition(ProjectStatus.APROVADO).transition(ProjectStatus.EM_EXECUCAO)
                .transition(ProjectStatus.CONCLUIDO).transition(ProjectStatus.ARQUIVADO)).isEqualTo(ProjectStatus.ARQUIVADO);
        assertThat(ProjectStatus.ARQUIVADO.canTransitionTo(ProjectStatus.PUBLICADO)).as("reabrir com justificativa").isTrue();
        assertThat(ProjectStatus.RASCUNHO.canTransitionTo(ProjectStatus.APROVADO)).isFalse();
        assertThat(ProjectStatus.CONCLUIDO.isLocked()).isTrue();
        assertThatThrownBy(() -> ProjectStatus.EM_EXECUCAO.transition(ProjectStatus.RASCUNHO)).hasMessageContaining("PROJETO_TRANSICAO_INVALIDA");
    }

    @Test
    void sessaoDeciaRf4aRf17() {
        assertThat(SessionStatus.PROPOSTA.transition(SessionStatus.ATIVA).transition(SessionStatus.EM_RESUMO).transition(SessionStatus.EM_DECISAO)
                .transition(SessionStatus.EM_REVISAO).transition(SessionStatus.ENCERRADA).transition(SessionStatus.REABERTA).transition(SessionStatus.ATIVA)
                .transition(SessionStatus.ENCERRADA).transition(SessionStatus.ARQUIVADA)).isEqualTo(SessionStatus.ARQUIVADA);
        assertThat(SessionStatus.EM_REVISAO.canTransitionTo(SessionStatus.ATIVA)).as("decisão devolvida").isTrue();
        assertThat(SessionStatus.ATIVA.acceptsMessages()).isTrue();
        assertThat(SessionStatus.ENCERRADA.acceptsMessages()).isFalse();
        assertThat(SessionStatus.machine().isTerminal(SessionStatus.ARQUIVADA)).isTrue();
        assertThatThrownBy(() -> SessionStatus.PROPOSTA.transition(SessionStatus.EM_DECISAO)).hasMessageContaining("SESSAO_TRANSICAO_INVALIDA");
    }

    @Test
    void decisaoRf12Rf14Rf15() {
        assertThat(DecisionStatus.PROPOSTA.transition(DecisionStatus.EM_REVISAO).transition(DecisionStatus.DEVOLVIDA).transition(DecisionStatus.EM_REVISAO)
                .transition(DecisionStatus.VALIDADA).transition(DecisionStatus.SUBSTITUIDA)).isEqualTo(DecisionStatus.SUBSTITUIDA);
        assertThat(DecisionStatus.VALIDADA.canTransitionTo(DecisionStatus.DEVOLVIDA)).isFalse();
        assertThatThrownBy(() -> DecisionStatus.SUBSTITUIDA.transition(DecisionStatus.PROPOSTA)).hasMessageContaining("DECISAO_TRANSICAO_INVALIDA");
    }

    @Test
    void vinculoDeChancelaRf39() {
        assertThat(SealBondStatus.SUGERIDA.transition(SealBondStatus.EDITADA).transition(SealBondStatus.EM_REVISAO).transition(SealBondStatus.APROVADA)
                .transition(SealBondStatus.APROVADA_PRIVADA).transition(SealBondStatus.APROVADA).transition(SealBondStatus.REVOGADA))
                .isEqualTo(SealBondStatus.REVOGADA);
        assertThat(SealBondStatus.RECUSADA.canTransitionTo(SealBondStatus.ACEITA)).as("aplicar depois").isTrue();
        assertThat(SealBondStatus.ACEITA.canTransitionTo(SealBondStatus.APROVADA_PRIVADA)).as("autoIssued sem consentimento").isTrue();
        assertThat(SealBondStatus.REJEITADA.canTransitionTo(SealBondStatus.EM_REVISAO)).isFalse();
        assertThat(SealBondStatus.APROVADA_PRIVADA.isApproved()).isTrue();
        assertThatThrownBy(() -> SealBondStatus.SUGERIDA.transition(SealBondStatus.APROVADA)).hasMessageContaining("CHANCELA_TRANSICAO_INVALIDA");
        for (SealBondStatus terminal : new SealBondStatus[] {SealBondStatus.REJEITADA, SealBondStatus.REVOGADA, SealBondStatus.EXPIRADA}) {
            assertThat(SealBondStatus.machine().isTerminal(terminal)).as(terminal.name()).isTrue();
        }
    }

    @Test
    void atribuicaoRf46() {
        assertThat(AssignmentStatus.PROPOSTA.transition(AssignmentStatus.ACEITA).transition(AssignmentStatus.DEVOLVIDA))
                .isEqualTo(AssignmentStatus.DEVOLVIDA);
        assertThat(AssignmentStatus.PROPOSTA.canTransitionTo(AssignmentStatus.DEVOLVIDA)).isFalse();
        assertThat(AssignmentStatus.RECUSADA.requiresReason()).isTrue();
        assertThatThrownBy(() -> AssignmentStatus.RECUSADA.transition(AssignmentStatus.ACEITA))
                .hasMessageContaining("ATRIBUICAO_TRANSICAO_INVALIDA");
    }

    @Test
    void validacaoDePerfilRf28() {
        assertThat(ApprovalStatus.PENDENTE.transition(ApprovalStatus.AJUSTES).transition(ApprovalStatus.PENDENTE).transition(ApprovalStatus.RECUSADO)
                .transition(ApprovalStatus.ESGOTADO).transition(ApprovalStatus.PENDENTE).transition(ApprovalStatus.APROVADO))
                .isEqualTo(ApprovalStatus.APROVADO);
        assertThat(ApprovalStatus.APROVADO.canTransitionTo(ApprovalStatus.PENDENTE)).isFalse();
        assertThat(ApprovalStatus.AJUSTES.requiresReason()).isTrue();
        assertThatThrownBy(() -> ApprovalStatus.APROVADO.transition(ApprovalStatus.RECUSADO)).hasMessageContaining("VALIDACAO_TRANSICAO_INVALIDA");
    }

    @Test
    void exportacaoDeDadosRf3() {
        assertThat(ExportStatus.REQUESTED.transition(ExportStatus.PROCESSING).transition(ExportStatus.READY).transition(ExportStatus.EXPIRED))
                .isEqualTo(ExportStatus.EXPIRED);
        assertThat(ExportStatus.PROCESSING.canTransitionTo(ExportStatus.FAILED)).isTrue();
        assertThat(ExportStatus.READY.isDownloadable()).isTrue();
        assertThatThrownBy(() -> ExportStatus.READY.transition(ExportStatus.PROCESSING)).hasMessageContaining("EXPORTACAO_TRANSICAO_INVALIDA");
    }

    @Test
    void contaDsrDossieEJob() {
        assertThat(AccountStatus.PENDING_EMAIL_VERIFICATION.transition(AccountStatus.PENDING_VALIDATION).transition(AccountStatus.ACTIVE)
                .transition(AccountStatus.DELETION_SCHEDULED).transition(AccountStatus.ANONYMIZED)).isEqualTo(AccountStatus.ANONYMIZED);
        assertThat(AccountStatus.machine().isTerminal(AccountStatus.ANONYMIZED)).isTrue();
        assertThat(DsrStatus.ABERTA.transition(DsrStatus.EM_ANALISE).transition(DsrStatus.RESPONDIDA).transition(DsrStatus.ENCERRADA))
                .isEqualTo(DsrStatus.ENCERRADA);
        assertThat(HandoffStatus.GERADO.transition(HandoffStatus.AGUARDANDO_SUCESSOR).transition(HandoffStatus.RECUSADO)
                .transition(HandoffStatus.AGUARDANDO_SUCESSOR).transition(HandoffStatus.TRANSFERIDO)).isEqualTo(HandoffStatus.TRANSFERIDO);
        assertThat(PipelineJobStatus.PENDENTE.transition(PipelineJobStatus.RODANDO).transition(PipelineJobStatus.FALHA)
                .transition(PipelineJobStatus.REPROCESSAR).transition(PipelineJobStatus.RODANDO).transition(PipelineJobStatus.OK))
                .isEqualTo(PipelineJobStatus.OK);
        assertThatThrownBy(() -> PipelineJobStatus.OK.transition(PipelineJobStatus.RODANDO)).hasMessageContaining("JOB_TRANSICAO_INVALIDA");
    }
}
