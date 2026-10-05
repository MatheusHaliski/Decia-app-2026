package br.gov.pr.secid.workstation.domain.statemachine;

import br.gov.pr.secid.workstation.domain.acervo.CoverMode;
import br.gov.pr.secid.workstation.domain.acervo.SourceKind;
import br.gov.pr.secid.workstation.domain.acervo.TaskItem;
import br.gov.pr.secid.workstation.domain.acervo.TaskOrigin;
import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.CreationMode;
import br.gov.pr.secid.workstation.domain.common.DomainRuleException;
import br.gov.pr.secid.workstation.domain.common.Priority;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.institutional.ApprovalCriteria;
import br.gov.pr.secid.workstation.domain.institutional.ApprovalRequest;
import br.gov.pr.secid.workstation.domain.institutional.ApprovalStatus;
import br.gov.pr.secid.workstation.domain.institutional.CriterionAuto;
import br.gov.pr.secid.workstation.domain.institutional.ReviewDecision;
import br.gov.pr.secid.workstation.domain.projetos.ProjectCoverMode;
import br.gov.pr.secid.workstation.domain.projetos.ProjectPhase;
import br.gov.pr.secid.workstation.domain.projetos.ProjectScheme;
import br.gov.pr.secid.workstation.domain.projetos.ProjectStatus;
import br.gov.pr.secid.workstation.domain.projetos.SchemeOrigin;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Achados do revisor no PR #22: critérios obrigatórios (RF28), justificativa só ao reabrir projeto (RF22), bloqueio sem causa (RF41). */
class ReviewFindingsPr22Test {

    private static final Instant NOW = Instant.parse("2026-10-05T12:00:00Z");
    private static final UUID ADMIN = UUID.randomUUID();

    private static ApprovalRequest request(String criteriaJson) {
        return new ApprovalRequest(UUID.randomUUID(), UUID.randomUUID(), ProfileType.EMPRESA, null, ApprovalStatus.PENDENTE, "1.0", criteriaJson,
                null, null, 1, NOW, NOW, null, "WS-ABC123", null, null, null, null, null);
    }

    @Test
    void aprovarExigeTodoCriterioObrigatorioMarcado() {
        String pending = "[{\"code\":\"CNPJ_ATIVO\",\"mandatory\":true,\"auto\":\"OK\",\"checked\":true},"
                + "{\"code\":\"ATO_NOMEACAO\",\"mandatory\":true,\"auto\":\"ANALISTA\",\"checked\":false},"
                + "{\"code\":\"SITE_OFICIAL\",\"mandatory\":false,\"checked\":false}]";
        assertThatThrownBy(() -> request(pending).review(ReviewDecision.APROVAR, ADMIN, null, NOW))
                .isInstanceOf(DomainRuleException.class).hasMessageContaining("CRITERIOS_PENDENTES").hasMessageContaining("ATO_NOMEACAO")
                .satisfies(ex -> assertThat(((DomainRuleException) ex).getDetails()).containsExactly("ATO_NOMEACAO"));
        assertThatThrownBy(() -> request(null).review(ReviewDecision.APROVAR, ADMIN, null, NOW)).as("checklist ausente")
                .isInstanceOf(DomainRuleException.class).hasMessageContaining("CRITERIOS_PENDENTES");
        assertThatThrownBy(() -> request("[]").review(ReviewDecision.APROVAR, ADMIN, null, NOW)).as("checklist vazio")
                .isInstanceOf(DomainRuleException.class).hasMessageContaining("CRITERIOS_PENDENTES");

        String ok = "[{\"code\":\"CNPJ_ATIVO\",\"mandatory\":true,\"checked\":true,\"checkedBy\":\"admin\",\"checkedAt\":\"2026-10-05T12:00:00Z\"},"
                + "{\"code\":\"SITE_OFICIAL\",\"mandatory\":false,\"checked\":false}]";
        ApprovalRequest approved = request(ok).review(ReviewDecision.APROVAR, ADMIN, null, NOW);
        assertThat(approved.status()).isEqualTo(ApprovalStatus.APROVADO);
        assertThat(approved.reviewedBy()).isEqualTo(ADMIN);
        ApprovalCriteria parsed = ApprovalCriteria.parse(ok);
        assertThat(parsed.items()).hasSize(2);
        assertThat(parsed.items().get(0).checkedBy()).isEqualTo("admin");
        assertThat(parsed.allMandatoryChecked()).isTrue();
        assertThat(ApprovalCriteria.parse(pending).items().get(1).auto()).isEqualTo(CriterionAuto.ANALISTA);
        assertThatThrownBy(() -> ApprovalCriteria.parse("[{\"mandatory\":true}]")).hasMessageContaining("code");
        assertThatThrownBy(() -> ApprovalCriteria.parse("[1]")).hasMessageContaining("objeto");
    }

    @Test
    void ajustesERecusaExigemPeloMenosUmMotivo() {
        for (ReviewDecision d : new ReviewDecision[] {ReviewDecision.AJUSTES, ReviewDecision.RECUSAR}) {
            assertThatThrownBy(() -> request(null).review(d, ADMIN, null, NOW)).as(d + " sem motivos").hasMessageContaining("VALIDACAO");
            assertThatThrownBy(() -> request(null).review(d, ADMIN, "[]", NOW)).as(d + " lista vazia").hasMessageContaining("VALIDACAO");
            assertThatThrownBy(() -> request(null).review(d, ADMIN, "DOC_ILEGIVEL", NOW)).as(d + " não é array").hasMessageContaining("VALIDACAO");
            ApprovalRequest r = request(null).review(d, ADMIN, "[{\"code\":\"DOC_ILEGIVEL\"}]", NOW);
            assertThat(r.status()).isEqualTo(d.resultingStatus());
            assertThat(r.reasonsJson()).contains("DOC_ILEGIVEL");
        }
        assertThat(ApprovalCriteria.countReasons("[\"A\",\"B\"]")).isEqualTo(2);
        assertThat(ApprovalCriteria.countReasons(" ")).isZero();
    }

    private static ProjectScheme project(ProjectStatus status) {
        return new ProjectScheme(UUID.randomUUID(), UUID.randomUUID(), null, null, "Pavimentação", null, null, null, null, null, null,
                CreationMode.MANUAL, SchemeOrigin.CRIAR_PROJETO, null, null, null, status, ProjectPhase.EXECUCAO, Priority.MEDIA, Visibility.DEPARTAMENTO,
                2026, null, null, null, null, ProjectCoverMode.MOSAICO, null, null, null, null, BigDecimal.ZERO, false, null, null, null, null, null,
                false, false, null, 0, 0, 0, 0, 0, 0, null, null);
    }

    @Test
    void justificativaSoAoReabrirProjetoTravado() {
        assertThat(project(ProjectStatus.CONCLUIDO).transition(ProjectStatus.ARQUIVADO, null).status()).as("arquivar concluído não reabre")
                .isEqualTo(ProjectStatus.ARQUIVADO);
        assertThatThrownBy(() -> project(ProjectStatus.CONCLUIDO).transition(ProjectStatus.EM_EXECUCAO, " ")).hasMessageContaining("justificativa");
        assertThatThrownBy(() -> project(ProjectStatus.ARQUIVADO).transition(ProjectStatus.PUBLICADO, null)).hasMessageContaining("justificativa");
        assertThat(project(ProjectStatus.ARQUIVADO).transition(ProjectStatus.PUBLICADO, "retomada pela nova gestão").status())
                .isEqualTo(ProjectStatus.PUBLICADO);
        assertThat(project(ProjectStatus.PUBLICADO).transition(ProjectStatus.EM_DECISAO, null).status()).isEqualTo(ProjectStatus.EM_DECISAO);
        assertThatThrownBy(() -> project(ProjectStatus.CONCLUIDO).transition(ProjectStatus.RASCUNHO, "x")).hasMessageContaining("PROJETO_TRANSICAO_INVALIDA");
    }

    private static TaskItem task(TaskState state) {
        return new TaskItem(UUID.randomUUID(), UUID.randomUUID(), null, "Ofício 12", null, null, TaskType.DOCUMENTO, null, null, null, null,
                AccessClassification.INTERNO, "pdf", null, null, BigDecimal.ZERO, TaskOrigin.INTERNA, SourceKind.ARQUIVO, null, null, null, null,
                null, null, null, null, null, Priority.MEDIA, state, null, null, null, null, null, null, null, null, Visibility.PRIVADA, false,
                false, false, null, null, null, null, CoverMode.AUTO, null, null, null, null, null, null, 0, 0, 0, 0, 0, 0, 0, 0, null);
    }

    @Test
    void transicaoGenericaNuncaBloqueiaSemCausa() {
        for (TaskState from : new TaskState[] {TaskState.DISPONIVEL, TaskState.EM_USO}) {
            assertThatThrownBy(() -> task(from).transition(TaskState.BLOQUEADA)).as(from.name()).isInstanceOf(DomainRuleException.class)
                    .hasMessageContaining("TAREFA_BLOQUEIO_SEM_CAUSA").hasMessageContaining("block(");
        }
        TaskItem blocked = task(TaskState.EM_USO).block(null, UUID.randomUUID(), "aguarda resposta do jurídico");
        assertThat(blocked.state()).isEqualTo(TaskState.BLOQUEADA);
        assertThat(blocked.blockedByUserId()).isNotNull();
        assertThat(blocked.transition(TaskState.EM_USO).blockedByUserId()).isNull();
    }
}
